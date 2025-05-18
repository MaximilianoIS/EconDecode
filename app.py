import os
from flask import Flask, render_template, request, jsonify, send_from_directory
import requests
import google.generativeai as genai
from dotenv import load_dotenv
import logging
from newspaper import Article

import re
import io
import PIL.Image
from datetime import datetime # Added from teammate's imports, though not directly used in snippet provided by them

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)

# --- Configuration ---
NEWS_API_KEY = os.environ.get('NEWS_API_KEY')
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY') # Centralized, from .env
FMP_API_KEY = "os.environ.get('FMP_API_KEY')"      # From .env

GEMINI_API_URL = 'https://generativelanguage.googleapis.com' # From original
DEFAULT_COUNTRY = 'us'
GLOBAL_TOPIC = 'economy OR business OR politics relevant to economy'
DEFAULT_LOCAL_TOPIC = "Economy OR business OR finance"
DEFAULT_PAGE_SIZE = 20

# Configure logging
logging.basicConfig(level=logging.INFO)

# --- API Initialization ---
GEMINI_MODEL_NAME = 'gemini-1.5-flash-latest'
GEMINI_MODEL = None
if GEMINI_API_KEY:
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        GEMINI_MODEL = genai.GenerativeModel(GEMINI_MODEL_NAME)
        logging.info(f"Gemini model '{GEMINI_MODEL_NAME}' initialized.")
    except Exception as e:
        logging.error(f"Error initializing Gemini model '{GEMINI_MODEL_NAME}'. Trying gemini-pro. Error: {e}")
        GEMINI_MODEL_NAME = 'gemini-pro' # Fallback
        try:
             GEMINI_MODEL = genai.GenerativeModel(GEMINI_MODEL_NAME)
             logging.info(f"Fallback Gemini model '{GEMINI_MODEL_NAME}' initialized.")
        except Exception as e_pro:
             logging.error(f"Error initializing fallback Gemini model '{GEMINI_MODEL_NAME}'. AI features unavailable. Error: {e_pro}")
             GEMINI_MODEL = None
else:
    logging.warning("GEMINI_API_KEY not set. AI features will not be available.")


# --- Helper Functions (from Teammate's app.py, adapted) ---
def get_company_domain_from_gemini(company_name):
    if not GEMINI_MODEL: return None
    try:
        prompt = f"What is the primary website domain for the company '{company_name}'? For example, for Starbucks, it's 'starbucks.com'. Respond with only the domain name. If unknown, respond 'UNKNOWN'."
        response = GEMINI_MODEL.generate_content(prompt)
        domain = response.text.strip().lower() if response and hasattr(response, 'text') and response.text else "UNKNOWN"
        if domain == "unknown" or " " in domain or "." not in domain:
            return None
        return domain
    except Exception as e:
        logging.error(f"Error getting domain for {company_name} from Gemini: {e}")
        return None

def get_logo_url(company_name):
    domain = get_company_domain_from_gemini(company_name)
    if domain:
        clearbit_url = f"https://logo.clearbit.com/{domain}"
        # You might want to add a check here to see if the logo actually exists
        # For simplicity, returning URL directly.
        return clearbit_url
    return None

def get_ticker_from_gemini(company_name):
    if not GEMINI_MODEL: return "UNKNOWN"
    try:
        prompt = f"What is the primary stock ticker symbol for '{company_name}'? Respond with ONLY the ticker (e.g., AAPL, MSFT, ADS.DE, 220630.KQ). If private/unknown, respond 'PRIVATE'."
        response = GEMINI_MODEL.generate_content(prompt)
        ticker = response.text.strip().upper() if response and hasattr(response, 'text') and response.text else "UNKNOWN"

        if ' ' in ticker or len(ticker) > 10: # Basic cleanup if Gemini is verbose
            if "PRIVATE" in ticker: return "PRIVATE"
            # Try to extract a valid-looking ticker pattern
            match = re.search(r'\b([A-Z0-9]{1,6}(\.[A-Z]{1,2})?)\b', ticker)
            ticker = match.group(1) if match else "UNKNOWN"
        logging.info(f"Gemini ticker for {company_name}: {ticker}")
        return ticker
    except Exception as e:
        logging.error(f"Gemini ticker error for {company_name}: {e}"); return "UNKNOWN"


def get_enhanced_stock_data_from_fmp(ticker_symbol):
    if not FMP_API_KEY:
        return None, "FinancialModelingPrep API Key not configured."
    if not ticker_symbol or ticker_symbol.upper() in ['PRIVATE', 'UNKNOWN', 'N/A']:
        return None, "Ticker is not applicable or unknown for this company."

    stock_info = {}
    error_messages = []

    # 1. Get current quote
    quote_url = f"https://financialmodelingprep.com/api/v3/quote/{ticker_symbol}?apikey={FMP_API_KEY}"
    try:
        response = requests.get(quote_url, timeout=10)
        response.raise_for_status()
        data = response.json()
        if data and isinstance(data, list) and len(data) > 0:
            quote = data[0]
            # Ensure the symbol matches, FMP can sometimes return data for a different symbol if the requested one is not found directly
            if quote.get("symbol") and quote.get("symbol").upper() == ticker_symbol.upper():
                stock_info["symbol"] = quote.get("symbol")
                stock_info["price"] = quote.get("price")
                stock_info["change"] = quote.get("change")
                stock_info["change_percent"] = quote.get("changesPercentage")
                stock_info["market_cap"] = quote.get("marketCap")
                stock_info["name"] = quote.get("name") # Company name from FMP
            else:
                logging.warning(f"FMP quote symbol mismatch. Requested: {ticker_symbol}, Got: {quote.get('symbol')}")
                error_messages.append(f"FMP quote data mismatch for {ticker_symbol}.")
        elif isinstance(data, dict) and data.get("Error Message"):
            error_messages.append(f"FMP API Error (quote): {data.get('Error Message')}")
        else:
             error_messages.append(f"No quote data or unexpected format from FMP for {ticker_symbol}.")
    except requests.exceptions.HTTPError as http_err:
        logging.error(f"FMP quote HTTP error for {ticker_symbol}: {http_err}")
        error_messages.append(f"Error fetching FMP quote (HTTP {http_err.response.status_code}).")
    except Exception as e:
        logging.error(f"FMP quote general error for {ticker_symbol}: {e}")
        error_messages.append(f"Error fetching FMP quote: {str(e)}")


    # 2. Get 1-month historical data for 1-month change %
    # FMP /historical-price-full/{symbol}?timeseries=N gives last N trading days.
    # The first item (index 0) is most recent, last item (index N-1) is oldest.
    # We need data for approx 22 trading days for a month.
    historical_url = f"https://financialmodelingprep.com/api/v3/historical-price-full/{ticker_symbol}?timeseries=22&apikey={FMP_API_KEY}"
    try:
        response_hist = requests.get(historical_url, timeout=10)
        response_hist.raise_for_status()
        data_hist = response_hist.json()
        
        if data_hist and data_hist.get('historical') and isinstance(data_hist['historical'], list) and len(data_hist['historical']) >= 22:
            historical_data = data_hist['historical']
            latest_close_from_hist = historical_data[0].get('close') # Most recent trading day's close from historical
            one_month_ago_close = historical_data[21].get('close') # ~1 month ago (22nd trading day back)

            if stock_info.get("price") is None and latest_close_from_hist is not None:
                # If live quote failed but historical gives a recent price, use it.
                stock_info["price"] = latest_close_from_hist
            
            current_price_for_calc = stock_info.get("price") # Use live quote price if available, else historical

            if current_price_for_calc is not None and one_month_ago_close is not None and one_month_ago_close != 0:
                month_change_percent = ((current_price_for_calc - one_month_ago_close) / one_month_ago_close) * 100
                stock_info["month_change_percent"] = round(month_change_percent, 2)
            else:
                error_messages.append("Could not calculate 1-month change (missing data or zero divisor).")
        elif data_hist and isinstance(data_hist, dict) and data_hist.get("Error Message"):
            error_messages.append(f"FMP API Error (historical): {data_hist.get('Error Message')}")
        else:
            error_messages.append("Not enough historical data from FMP for 1-month change calculation.")

    except requests.exceptions.HTTPError as http_err:
        logging.error(f"FMP historical HTTP error for {ticker_symbol}: {http_err}")
        error_messages.append(f"Error fetching FMP historical (HTTP {http_err.response.status_code}).")
    except Exception as e:
        logging.error(f"FMP historical data general error for {ticker_symbol}: {e}")
        error_messages.append(f"Error fetching FMP historical data: {str(e)}")

    if not stock_info.get("price"): # If after all attempts, no price, then it's a failure for core data
        final_error = ". ".join(error_messages) if error_messages else "Failed to retrieve essential stock data."
        return None, final_error
    
    # If we got here, stock_info has at least 'price'. Errors are secondary.
    return stock_info, ". ".join(error_messages) if error_messages else None


def get_gemini_buy_wait_sell_recommendation(company_name, stock_data=None):
    if not GEMINI_MODEL:
        return "N/A", "AI model not available for recommendation."

    stock_info_str = "not publicly traded or stock data unavailable"
    if stock_data and stock_data.get('price') is not None: # Check for price specifically
        stock_info_str = (
            f"Current price: {stock_data.get('price', 'N/A')}, "
            f"Day's % change: {stock_data.get('change_percent', 'N/A')}%."
        )
        if stock_data.get('month_change_percent') is not None:
            stock_info_str += f" Month's % change: {stock_data.get('month_change_percent')}%."

    prompt = (
        f"Consider the company '{company_name}'. "
        f"Stock snapshot: {stock_info_str}. "
        f"Based on general market sentiment, recent major news (if any you are aware of for this company), "
        f"and its typical business sector performance, provide a very brief, simplified "
        f"investment signal for a non-expert: 'Strong Buy', 'Buy', 'Wait', 'Sell', or 'Strong Sell'. "
        f"Respond with ONLY one of these five options. "
        f"This is for a general audience and not financial advice. "
        f"If unsure or the situation is very neutral, respond 'Wait'."
    )
    try:
        generation_config = genai.types.GenerationConfig(temperature=0.5, max_output_tokens=10) # Small tokens for one phrase
        response = GEMINI_MODEL.generate_content(prompt, generation_config=generation_config)
        
        recommendation = "Wait" # Default
        if response and response.parts: # Check parts as per teammate's code structure
            raw_text = "".join(part.text for part in response.parts if hasattr(part, 'text')).strip()
            valid_signals = ["Strong Buy", "Buy", "Wait", "Sell", "Strong Sell"]
            # Case-insensitive check for robustness, then use standardized casing
            matched_signal = next((s for s in valid_signals if s.lower() == raw_text.lower()), None)
            if matched_signal:
                recommendation = matched_signal
            else:
                logging.warning(f"Gemini recommendation for {company_name} was not a standard signal: '{raw_text}'. Defaulting to Wait.")
                # No need to explicitly set 'Wait' again, it's the default
        elif response and response.prompt_feedback and response.prompt_feedback.block_reason:
            logging.warning(f"Gemini recommendation for {company_name} blocked: {response.prompt_feedback.block_reason.name}")
            return "N/A", f"AI content generation issue ({response.prompt_feedback.block_reason.name})."
        else:
            logging.warning(f"Gemini recommendation for {company_name} produced no usable text. Full response: {response}")
            # No need to explicitly set 'Wait' again
            
        return recommendation, None
    except Exception as e:
        logging.error(f"Gemini recommendation error for {company_name}: {e}", exc_info=True)
        return "N/A", f"Error getting AI recommendation: {str(e)}"


def get_watched_company_brief_from_gemini(company_name, stock_data=None):
    if not GEMINI_MODEL: return {"error": "Gemini model not available."}
    brief_data = {}
    
    recommendation, rec_error = get_gemini_buy_wait_sell_recommendation(company_name, stock_data)
    brief_data["recommendation"] = recommendation
    if rec_error:
        brief_data["recommendation_error"] = rec_error

    prompts = {
        "investment_news": f"For '{company_name}', what's 1-2 recent major news items an investor might care about (e.g., earnings, new product, lawsuit)? Super brief, 1-2 sentences or 2-3 bullet points max. If nothing major, say 'No big news lately'.",
        "planet_impact_brief": f"Quick take on '{company_name}' and the planet: 1-2 key good or bad points. (1-2 sentences or 2-3 bullet points max).",
        "social_vibe_brief": f"'{company_name}' social vibe: How are they with people (employees, community)? 1-2 key good or bad points. (1-2 sentences or 2-3 bullet points max)."
    }
    generation_config = genai.types.GenerationConfig(temperature=0.6, max_output_tokens=100)
    for key, prompt_text in prompts.items():
        try:
            response = GEMINI_MODEL.generate_content(prompt_text, generation_config=generation_config)
            if response.prompt_feedback and response.prompt_feedback.block_reason:
                brief_data[key] = f"AI content issue ({response.prompt_feedback.block_reason.name})."
            elif response.parts: # Check parts as per teammate's code structure
                full_text = "".join(part.text for part in response.parts if hasattr(part, 'text'))
                brief_data[key] = full_text.strip() if full_text else "AI is quiet on this one."
            else: # Teammate's code implies this case
                brief_data[key] = "AI gave an empty response."
        except Exception as e:
            brief_data[key] = f"Error fetching this insight. ({e})" # Match teammate's error format
    return brief_data


def get_product_analyzer_company_details_from_gemini(company_name, stock_data_summary=None, stock_data_for_rec=None):
    if not GEMINI_MODEL: return {"error": "Gemini model not available."}
    profile_data = {}

    recommendation, rec_error = get_gemini_buy_wait_sell_recommendation(company_name, stock_data_for_rec)
    profile_data["recommendation"] = recommendation
    if rec_error:
        profile_data["recommendation_error"] = rec_error
        
    business_summary_prompt = (
        f"Give a short, snappy summary of what '{company_name}' is known for (2-3 sentences). "
        f"If public, any recent big news or stock vibe? (1-2 sentences). "
        f"Current stock info: {stock_data_summary if stock_data_summary else 'not available/private'}."
    )
    prompts = {
        "business_summary": business_summary_prompt,
        "social_vibe": f"What's the general social vibe around '{company_name}'? Good place to work? Fair? Any recent buzz (good/bad)? (2-3 sentences or few bullet points)",
        "planet_impact": f"How's '{company_name}' doing with planet Earth? Any cool eco-friendly stuff or big oopsies? (2-3 sentences or few bullet points)",
        "competitors_alternatives": f"Who are '{company_name}'s main rivals or cooler alternatives young people might check out? (few names or 2-3 sentences)"
    }
    generation_config = genai.types.GenerationConfig(temperature=0.7, max_output_tokens=180)
    for key, prompt_text in prompts.items():
        try:
            response = GEMINI_MODEL.generate_content(prompt_text, generation_config=generation_config)
            if response.prompt_feedback and response.prompt_feedback.block_reason:
                profile_data[key] = f"AI content issue ({response.prompt_feedback.block_reason.name})."
            elif response.parts: # Check parts as per teammate's code structure
                full_text = "".join(part.text for part in response.parts if hasattr(part, 'text'))
                profile_data[key] = full_text.strip() if full_text else "AI is quiet on this one."
            else: # Teammate's code implies this case
                profile_data[key] = "AI gave an empty response."
        except Exception as e:
            profile_data[key] = f"Error fetching this insight. ({e})" # Match teammate's error format
    return profile_data


# --- Original Routes (News, Chat, Summary) ---
@app.route('/')
def index():
    return render_template('dashboard.html')

@app.route('/api/news')
def get_news():
    if not NEWS_API_KEY:
        return jsonify({"status": "error", "message": "News API key not configured."}), 500

    news_type = request.args.get('type', 'local')
    country = DEFAULT_COUNTRY

    # Get pagination parameters from request, with defaults
    try:
        page = int(request.args.get('page', 1))
        pageSize = int(request.args.get('pageSize', DEFAULT_PAGE_SIZE))
    except ValueError:
        return jsonify({"status": "error", "message": "Invalid page or pageSize parameters."}), 400

    if page < 1:
        page = 1
    if pageSize < 1:
        pageSize = DEFAULT_PAGE_SIZE
    if pageSize > 100:
        pageSize = 100  # NewsAPI max

    if news_type == 'local':
        country = DEFAULT_COUNTRY
    elif news_type != 'global':
        return jsonify({"status": "error", "message": "Invalid news type specified."}), 400

    base_url = "https://newsapi.org/v2/"
    params = {
        'apiKey': NEWS_API_KEY,
        'language': 'en',
        'pageSize': pageSize,
        'page': page,
    }

    if news_type == 'local':
        url = base_url + "top-headlines"
        params['country'] = country.lower()
        params['category'] = 'business'
        logging.info(f"Fetching local top-headlines for country={country}, page={page}, pageSize={pageSize}, params={params}")
    else:
        url = base_url + "everything"
        params['q'] = GLOBAL_TOPIC
        params['sortBy'] = 'relevancy'
        logging.info(f"Fetching global everything for topic='{GLOBAL_TOPIC}', page={page}, pageSize={pageSize}, params={params}")

    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()

        logging.info(f"Raw NewsAPI data: {data}")
        raw_articles = data.get('articles', [])
        logging.info(f"Number of raw articles from API: {len(raw_articles)}")
        if raw_articles:
            logging.info(f"First raw article: {raw_articles[0]}")

        if data.get('status') != 'ok':
            api_message = data.get('message', 'Unknown API error from NewsAPI')
            logging.error(f"NewsAPI returned status '{data.get('status')}' with code '{data.get('code')}' and message: {api_message}")
            return jsonify({"status": "error", "message": api_message, "articles": [], "totalResults": 0}), 500

        articles = [
            a for a in raw_articles
            if a.get('title') and a.get('description') and a.get('url') and a.get('source') and a.get('source').get('name')
        ]

        total_results_from_api = data.get('totalResults', 0)

        logging.info(f"NewsAPI successful: Fetched {len(articles)} {news_type} articles. API totalResults: {total_results_from_api}. Page: {page}")

        return jsonify({
            "status": "ok",
            "totalResults": total_results_from_api,
            "articles": articles,
            "page": page
        })

    except requests.exceptions.Timeout:
        logging.error(f"NewsAPI request timed out for URL: {url} with params: {params}", exc_info=True)
        return jsonify({"status": "error", "message": "Request to news provider timed out.", "articles": [], "totalResults": 0}), 504
    except requests.exceptions.RequestException as e:
        logging.error(f"NewsAPI request failed: {e}", exc_info=True)
        return jsonify({"status": "error", "message": f"Could not connect to news provider: {str(e)}", "articles": [], "totalResults": 0}), 500
    except Exception as e:
        logging.error(f"An unexpected error occurred fetching news: {e}", exc_info=True)
        return jsonify({"status": "error", "message": "An internal server error occurred.", "articles": [], "totalResults": 0}), 500

@app.route('/api/chat', methods=['POST']) # Retained original, more feature-rich chat
def chat_with_gemini():
    if not GEMINI_MODEL:
        if GEMINI_API_KEY:
             return jsonify({"error": "Chatbot failed to initialize. Check model name or API key in server logs."}), 503
        else:
            return jsonify({"error": "Chatbot is not configured (API key missing)."}), 503

    user_input = request.json.get('message')
    if not user_input:
        return jsonify({"error": "No message provided."}), 400

    try:
        # Using the prompt from the user's original app.py for general chat
        prompt = f"""You are an assistant helping young people understand economic news.
Explain the following concept or news item simply and clearly for a young person, avoiding jargon where possible:
{user_input}
"""
        logging.info(f"Sending prompt to Gemini (model: {GEMINI_MODEL_NAME}): {user_input[:50]}...")
        response = GEMINI_MODEL.generate_content(prompt)

        if response and hasattr(response, 'text') and response.text:
            bot_response = response.text.replace('*', '').replace('#', '') # Basic Markdown removal
            logging.info("Gemini generated text response for chat.")
        elif response and response.prompt_feedback and response.prompt_feedback.block_reason:
             block_reason = response.prompt_feedback.block_reason.name
             logging.warning(f"Gemini blocked content for chat: {block_reason}")
             bot_response = f"Sorry, I couldn't generate a response for that due to content safety policy. (Reason: {block_reason}). Please try asking differently."
        else:
             logging.warning("Gemini generated no text response or had unexpected structure for chat.")
             bot_response = "Sorry, I couldn't generate a response for that. Please try asking differently."
        return jsonify({"response": bot_response})
    except Exception as e:
        logging.error(f"Error with Gemini API in chat: {e}", exc_info=True)
        return jsonify({"error": "An error occurred while processing your chat request. Please try again."}), 500

# Function for article summarization (from original)
def call_gemini_ai_for_summary(prompt_text):
    global GEMINI_MODEL # Ensure global model is used
    if not GEMINI_MODEL:
        logging.error("GEMINI_MODEL not initialized. Cannot generate summary.")
        raise Exception("Gemini model is not available for summarization.")
    logging.info(f"Sending prompt to Gemini for summary (model: {GEMINI_MODEL.model_name})...") # Use GEMINI_MODEL.model_name
    response = GEMINI_MODEL.generate_content(prompt_text)
    if response and hasattr(response, 'text') and response.text: # Check if text attribute exists
        logging.info("Gemini successfully generated text for summary.")
        return response.text
    elif response and hasattr(response, 'prompt_feedback') and response.prompt_feedback and hasattr(response.prompt_feedback, 'block_reason') and response.prompt_feedback.block_reason:
        block_reason = response.prompt_feedback.block_reason.name
        logging.warning(f"Gemini blocked content for summary: {block_reason}")
        raise Exception(f"Content generation blocked by Gemini: {block_reason}")
    elif response and response.candidates and response.candidates[0].finish_reason.name != "STOP": # Access finish_reason correctly
        finish_reason = response.candidates[0].finish_reason.name
        logging.warning(f"Gemini summary generation stopped: {finish_reason}")
        raise Exception(f"Summary generation stopped: {finish_reason}")
    else:
        logging.warning(f"Gemini generated no usable text for summary. Full response: {response}")
        raise Exception("Gemini returned no usable text for summary.")


@app.route('/api/gemini-summary') # From original
def gemini_summary():
    if not GEMINI_MODEL:
        return jsonify({"error": "Summary service is unavailable (Gemini model not configured)."}), 503

    article_url = request.args.get('url')
    if not article_url:
        return jsonify({"error": "Missing url parameter"}), 400

    logging.info(f"Gemini summary requested for URL: {article_url}")
    content = safe_scrape_article(article_url)

    if not content or len(content.strip()) < 50: # Minimum content length
        logging.warning(f"Scraped content for {article_url} is too short or empty. Cannot summarize.")
        return jsonify({"error": "Could not retrieve sufficient article content to summarize."}), 400

    logging.info(f"Scraped content for summary (first 100 chars): {content[:100]}")
    prompt = f"""
    You are an AI assistant specialized in explaining economic news to young people.
    Analyze the following economic news article content.
    Provide your response structured with the following specific section headers, ensuring each section has content:

    SECTION: Summary
    [A concise, neutral summary of the article's main points in a short paragraph.]

    SECTION: GenZ Translation
    [Rewrite the summary in engaging, informal Gen Z language, using relevant slang or phrasing appropriately. Keep it clear and accurate.]

    SECTION: Impact on Young People
    [Explain clearly how the news or economic concept discussed in the article directly or indirectly impacts young people (e.g., students, young workers, those new to managing finances). Be specific.]

    SECTION: Impact Rating
    [Provide a single integer from 1 (low impact) to 5 (high impact) representing the overall potential impact of this news on young people. Just the number.]

    Article Content:
    ---
    {content}
    ---
    """
    try:
        full_response_text = call_gemini_ai_for_summary(prompt)
        summary = "Summary not found."
        genz = "GenZ translation not found."
        impact = "Impact analysis not found."
        impact_level = 0

        # Using re.IGNORECASE for robustness
        summary_match = re.search(r"SECTION: Summary\s*([\s\S]*?)(?=\s*SECTION: GenZ Translation|\Z)", full_response_text, re.IGNORECASE)
        if summary_match: summary = summary_match.group(1).strip()

        genz_match = re.search(r"SECTION: GenZ Translation\s*([\s\S]*?)(?=\s*SECTION: Impact on Young People|\Z)", full_response_text, re.IGNORECASE)
        if genz_match: genz = genz_match.group(1).strip()

        impact_match = re.search(r"SECTION: Impact on Young People\s*([\s\S]*?)(?=\s*SECTION: Impact Rating|\Z)", full_response_text, re.IGNORECASE)
        if impact_match: impact = impact_match.group(1).strip()

        rating_match = re.search(r"SECTION: Impact Rating\s*(\d)", full_response_text, re.IGNORECASE)
        if rating_match:
            try:
                level = int(rating_match.group(1))
                if 1 <= level <= 5:
                    impact_level = level
            except ValueError:
                logging.warning(f"Could not parse impact level from: {rating_match.group(1)}")
        
        logging.info(f"Parsed summary: {summary[:30]}..., GenZ: {genz[:30]}..., Impact: {impact[:30]}..., Rating: {impact_level}")
        return jsonify({
            "summary": summary,
            "genz": genz,
            "impact": impact,
            "impactLevel": impact_level
        })
    except Exception as e:
        logging.error(f"Error during Gemini summary generation for {article_url}: {e}", exc_info=True)
        return jsonify({"error": f"Failed to get or parse Gemini AI summary: {str(e)}"}), 500

# Scraper function (from original)
def safe_scrape_article(url):
    try:
        article = Article(url, fetch_images=False, request_timeout=7)
        article.download()
        article.parse()
        if article.text and len(article.text.strip()) > 100:
            logging.info(f"Newspaper3k successfully parsed: {url}")
            return article.text
        else:
            logging.warning(f"Newspaper3k parsing of {url} resulted in short/empty text. Falling back to default content.")
    except Exception as e:
       logging.warning(f"Newspaper3k failed for URL {url}: {e}. Falling back to default content.")
    
    # Fallback content if scraping fails or is insufficient
    logging.info(f"Using fallback content for URL: {url} after failed scrape or short content.")
    content = """Youth Unemployment: A Growing Challenge
Youth unemployment remains one of the most pressing issues facing economies around the world. With millions of young people entering the job market each year, the lack of available opportunities creates a cycle of frustration, poverty, and wasted potential.
One of the main causes is the mismatch between the skills young people have and what employers are actually looking for. Many graduates leave school with theoretical knowledge but little practical experience. This disconnect leads to long job searches and underemployment—working in jobs that don’t require their qualifications.
The rise of technology and automation has also played a role, reducing the number of entry-level jobs in traditional sectors. At the same time, the competition is fierce, especially in urban areas where more youth are concentrated.
Solving youth unemployment requires a combination of government policy, private sector support, and education reform. Vocational training, internships, and entrepreneurship programs can help bridge the gap and equip young people with marketable skills.
Tackling this issue is not just about jobs—it’s about securing the future of entire generations. When young people are empowered and employed, they contribute to a more stable, innovative, and prosperous society."""
    return content


# --- New Routes (from Teammate's app.py) ---
@app.route('/api/company_profile', methods=['POST'])
def company_profile_route():
    if not GEMINI_MODEL: return jsonify({"error": "AI features unavailable."}), 503
    data = request.get_json()
    if not data or 'company_name' not in data:
        return jsonify({"error": "Company name needed."}), 400
    company_name = data.get('company_name')
    if not company_name: return jsonify({"error": "Company name cannot be empty."}), 400


    logging.info(f"Fetching WATCHED company profile for: {company_name}")
    ticker = get_ticker_from_gemini(company_name)
    stock_data, stock_error = None, None
    if ticker and ticker.upper() not in ["PRIVATE", "UNKNOWN", "N/A"]:
        stock_data, stock_error = get_enhanced_stock_data_from_fmp(ticker)

    gemini_brief_details = get_watched_company_brief_from_gemini(company_name, stock_data)
    logo_url = get_logo_url(company_name)

    return jsonify({
        "company_name": company_name, 
        "ticker_symbol": ticker or "N/A",
        "logo_url": logo_url,
        "stock_data": stock_data, 
        "stock_error": stock_error, # This will contain error messages from FMP if any
        "profile_details": gemini_brief_details
    })

@app.route('/api/analyze_product_image', methods=['POST'])
def analyze_product_image_route():
    # Check if the capable Gemini model is available
    if not GEMINI_MODEL:
        return jsonify({"error": "AI model for image analysis is not available."}), 503
    if GEMINI_MODEL_NAME == 'gemini-pro': # gemini-pro does not support image input directly in this SDK usage
        return jsonify({"error": "Image analysis requires a multimodal AI model (e.g., Gemini Flash/Pro Vision). Current model may not support it."}), 503
        
    if 'product_image' not in request.files: return jsonify({"error": "No image file found in request."}), 400
    file = request.files['product_image']
    if file.filename == '': return jsonify({"error": "No image selected."}), 400

    try:
        image_bytes = file.read()
        img = PIL.Image.open(io.BytesIO(image_bytes)) # Validate it's an image
        
        # Use list of parts for multimodal input
        prompt_parts = [
            "Identify the primary product and the parent company that makes this product. "
            "Format your response strictly as: Product: [Identified Product Name] | Company: [Identified Company Name]. "
            "If you cannot identify the product or company, use 'Unknown' for that part. "
            "For example: Product: iPhone 15 Pro | Company: Apple. Or Product: Big Mac | Company: McDonald's. "
            "If only product is clear: Product: Widget X | Company: Unknown. "
            "If neither is clear: Product: Unknown | Company: Unknown.",
            img # Pass the PIL.Image object
        ]
        
        logging.info(f"Sending image to Gemini for product/company identification (model: {GEMINI_MODEL_NAME}).")
        response_id = GEMINI_MODEL.generate_content(prompt_parts)
        
        identified_product, identified_company = "Unknown", "Unknown" # Defaults

        if response_id and hasattr(response_id, 'text') and response_id.text:
            text_res = response_id.text.strip()
            logging.info(f"Gemini raw identification response: {text_res}")
            # Try to parse based on the requested format
            product_match = re.search(r"Product:\s*(.*?)\s*\|", text_res, re.IGNORECASE)
            company_match = re.search(r"Company:\s*(.*?)\s*$", text_res, re.IGNORECASE)

            if product_match:
                identified_product = product_match.group(1).strip()
                if not identified_product: identified_product = "Unknown" # If empty after "Product:"
            if company_match:
                identified_company = company_match.group(1).strip()
                if not identified_company: identified_company = "Unknown" # If empty after "Company:"
            
            # Fallback if parsing fails but some text is there
            if identified_product == "Unknown" and identified_company == "Unknown" and "Unknown" not in text_res :
                # If Gemini didn't follow format but gave some text, assume it might be the product
                # Or, it might be a general description. This is a heuristic.
                if len(text_res) < 50 : identified_product = text_res # Short response likely product
                else: logging.warning(f"Gemini response '{text_res}' did not match expected Product/Company format.")


        elif response_id.prompt_feedback and response_id.prompt_feedback.block_reason:
            logging.warning(f"Gemini image analysis blocked: {response_id.prompt_feedback.block_reason.name}")
            return jsonify({"error": f"Image analysis blocked by AI safety ({response_id.prompt_feedback.block_reason.name})."}), 400
        
        logging.info(f"Identified after parsing: Product='{identified_product}', Company='{identified_company}'")

        if identified_company.lower() == "unknown" and identified_product.lower() != "unknown":
            # If company is unknown but product is known, try a specific query for the company.
            try:
                logging.info(f"Product '{identified_product}' identified, attempting to find company via second Gemini call.")
                company_res_gen = GEMINI_MODEL.generate_content(
                    f"What is the primary parent company that makes the product '{identified_product}'? Respond with ONLY the company name. If unknown, respond 'Unknown'."
                )
                if company_res_gen and hasattr(company_res_gen, 'text') and company_res_gen.text:
                    comp_text = company_res_gen.text.strip()
                    if comp_text.lower() != 'unknown' and comp_text:
                        identified_company = comp_text
                        logging.info(f"Company for '{identified_product}' identified as '{identified_company}' in fallback.")
            except Exception as e_comp:
                logging.warning(f"Error during fallback company identification for '{identified_product}': {e_comp}")


        if identified_company.lower() == "unknown":
            # If company is still unknown, return with what we have (product might be known)
            return jsonify({
                "error": "Could not definitively identify the parent company.", 
                "identified_product": identified_product, 
                "identified_company": "Unknown" # Explicitly "Unknown"
            }), 404 # Not Found for company

        # Proceed if company is identified
        ticker = get_ticker_from_gemini(identified_company)
        stock_data, stock_error = None, None
        stock_data_summary_for_gemini = "Company might be private or stock data unavailable."

        if ticker and ticker.upper() not in ["PRIVATE", "UNKNOWN", "N/A"]:
            stock_data, stock_error = get_enhanced_stock_data_from_fmp(ticker)
            if stock_data:
                stock_data_summary_for_gemini = (
                    f"Symbol: {stock_data.get('symbol', 'N/A')}, "
                    f"Price: {stock_data.get('price', 'N/A')}, "
                    f"Day Change %: {stock_data.get('change_percent', 'N/A')}%"
                )
                if stock_data.get('month_change_percent') is not None:
                     stock_data_summary_for_gemini += f", Month Change %: {stock_data.get('month_change_percent')}%"
            elif stock_error: # Use the error message from FMP if available
                stock_data_summary_for_gemini = f"Stock data issue: {stock_error}"
        
        gemini_profile_details = get_product_analyzer_company_details_from_gemini(
            identified_company, 
            stock_data_summary=stock_data_summary_for_gemini, 
            stock_data_for_rec=stock_data # Pass full stock_data for recommendation logic
        )
        logo_url = get_logo_url(identified_company)
            
        return jsonify({
            "identified_product": identified_product, 
            "identified_company": identified_company,
            "ticker_symbol": ticker or "N/A", 
            "logo_url": logo_url,
            "stock_data": stock_data, 
            "stock_error": stock_error,
            "profile_details": gemini_profile_details
        })

    except PIL.UnidentifiedImageError:
        logging.error("Invalid image file provided for analysis.")
        return jsonify({"error": "Invalid or unsupported image file format."}), 400
    except Exception as e:
        logging.error(f"Product image analysis server error: {e}", exc_info=True)
        return jsonify({"error": f"An unexpected server error occurred during image analysis: {str(e)}"}), 500


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5009) # Using original port


let watchedCompanies = [
    { name: "Apple", data: null, isLoading: false, error: null },
];
let productAnalysis = {
    product: null,
    company: null,
    data: null, // This will hold the full profile_details for the analyzed company
    isLoading: false,
    error: null,
    imagePreview: null
};
let tempWatchedCompanies = []; // For the modal

// --- Other file-scoped variables ---
let videoStream = null;
let selectedProductFile = null;

// === DOM Element References ===
const insightsElements = {}; // insights.js specific elements

function getInsightElementReferences() {
    insightsElements.insightsSection = document.getElementById('insights-section');

    insightsElements.watchedCompaniesList = document.getElementById('watched-companies-list');
    insightsElements.watchedCompaniesLoader = document.getElementById('watched-companies-loader');
    insightsElements.watchedCompaniesError = document.getElementById('watched-companies-error');
    insightsElements.editWatchedListBtn = document.getElementById('edit-watched-list-btn');

    insightsElements.productImageGalleryInput = document.getElementById('product-image-gallery');
    insightsElements.startCameraModalBtn = document.getElementById('start-camera-btn-modal');
    insightsElements.analyzeProductButton = document.getElementById('analyze-product-button');
    insightsElements.productImagePreviewContainer = document.getElementById('product-image-preview-container');
    insightsElements.productImagePreview = document.getElementById('product-image-preview');
    insightsElements.productAnalysisLoader = document.getElementById('product-analysis-loader');
    insightsElements.productAnalysisError = document.getElementById('product-analysis-error');
    insightsElements.productAnalysisResult = document.getElementById('product-analysis-result');

    insightsElements.editWatchedModal = document.getElementById('edit-watched-modal');
    insightsElements.closeModalBtn = document.getElementById('close-modal-btn');
    insightsElements.currentWatchedListEditor = document.getElementById('current-watched-list-editor');
    insightsElements.addCompanyInput = document.getElementById('add-company-input');
    insightsElements.addCompanyBtn = document.getElementById('add-company-btn');
    insightsElements.addCompanyError = document.getElementById('add-company-error');
    insightsElements.saveWatchedChangesBtn = document.getElementById('save-watched-changes-btn');

    insightsElements.cameraModal = document.getElementById('camera-modal');
    insightsElements.closeCameraModalBtn = document.getElementById('close-camera-modal-btn');
    insightsElements.cameraVideo = document.getElementById('camera-video');
    insightsElements.capturePhotoBtn = document.getElementById('capture-photo-btn');
    insightsElements.cameraErrorDisplay = document.getElementById('camera-error-display');

    insightsElements.companyCardTemplate = document.getElementById('company-card-template');
}

// === Helper Functions ===
function formatStockValue(value, isPercent = false) {
    if (value === null || value === undefined || String(value).trim().toUpperCase() === "N/A" || String(value).trim() === "") return "N/A";
    const num = parseFloat(String(value).replace(/[^0-9.,-]+/g, "").replace(',', '.'));
    if (isNaN(num)) return String(value).trim() || "N/A";
    return num.toFixed(2) + (isPercent ? "%" : "");
}

// === Modal Toggle Functions (Specific to Insights Modals) ===
function openInsightsModal(modalElement) {
    if (!modalElement) return;
    modalElement.classList.remove('invisible', 'opacity-0');
    const content = modalElement.querySelector('.transform');
    if (content) {
        content.classList.remove('opacity-0', 'scale-95');
        requestAnimationFrame(() => {
            modalElement.classList.add('opacity-100');
            content.classList.add('opacity-100', 'scale-100');
        });
    } else {
        modalElement.classList.add('opacity-100');
    }
    modalElement.classList.add('visible');
}

function closeInsightsModal(modalElement) {
    if (!modalElement) return;
    const content = modalElement.querySelector('.transform');
    if (content) {
        content.classList.add('opacity-0', 'scale-95');
        content.classList.remove('opacity-100', 'scale-100');
    }
    modalElement.classList.add('opacity-0');
    modalElement.classList.remove('opacity-100', 'visible');
    setTimeout(() => {
        modalElement.classList.add('invisible');
    }, 300);
}


// === DOM Rendering Functions ===

function renderCompanyProfileCard(companyName, fullProfileData, errorMsg, isProductAnalysisCard = false) {
    if (!insightsElements.companyCardTemplate) {
        console.error("Company card template not found!");
        return '<div class="text-red-500 dark:text-red-400 p-4">Error: Card template missing.</div>';
    }
    const cardClone = insightsElements.companyCardTemplate.content.cloneNode(true);
    const cardElement = cardClone.querySelector('.company-profile-card');

    const fields = {
        logo: cardElement.querySelector('[data-role="logo"]'),
        logoPlaceholder: cardElement.querySelector('[data-role="logo-placeholder"]'),
        companyNameEl: cardElement.querySelector('[data-role="company-name"]'),
        companyTicker: cardElement.querySelector('[data-role="company-ticker"]'),
        recommendationSection: cardElement.querySelector('[data-role="recommendation-section"]'),
        recSliderThumb: cardElement.querySelector('[data-role="recommendation-slider-thumb"]'),
        recText: cardElement.querySelector('[data-role="recommendation-text"]'),
        stockVitalsSection: cardElement.querySelector('[data-role="stock-vitals-section"]'),
        stockPrice: cardElement.querySelector('[data-role="stock-price"]'),
        stockPriceArrow: cardElement.querySelector('[data-role="stock-price-arrow"]'),
        stockDayChange: cardElement.querySelector('[data-role="stock-day-change"]'),
        stockMonthChange: cardElement.querySelector('[data-role="stock-month-change"]'),
        geminiInsightsContainer: cardElement.querySelector('[data-role="gemini-insights-container"]'),
        cardFooter: cardElement.querySelector('[data-role="card-footer"]'),
        addToWatchlistButton: cardElement.querySelector('[data-role="add-to-watchlist-button"]')
    };

    fields.logo.style.display = 'none';
    fields.logoPlaceholder.style.display = 'flex';
    fields.logoPlaceholder.textContent = companyName ? companyName.substring(0, 1).toUpperCase() : 'L';
    fields.companyNameEl.textContent = companyName || 'Loading...';
    fields.companyTicker.textContent = 'N/A';
    fields.recommendationSection.classList.add('hidden');
    fields.stockVitalsSection.classList.add('hidden');
    fields.geminiInsightsContainer.innerHTML = '';

    if (errorMsg) {
        fields.geminiInsightsContainer.innerHTML = `<p class="text-sm text-red-600 dark:text-red-400 p-3 bg-red-100 dark:bg-red-700/30 rounded-md">${errorMsg}</p>`;
        return cardElement.outerHTML;
    }

    if (!fullProfileData && !errorMsg) {
        fields.geminiInsightsContainer.innerHTML = `<div class="animate-pulse space-y-3 py-4">
            <div class="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div> <div class="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
            <div class="h-4 bg-gray-300 dark:bg-gray-600 rounded w-5/6"></div></div>`;
        return cardElement.outerHTML;
    }

    if (fullProfileData) {
        const { logo_url, ticker_symbol, stock_data, profile_details, company_name: actualCompanyNameFromData } = fullProfileData;
        const displayCompanyName = actualCompanyNameFromData || companyName;

        fields.companyNameEl.textContent = displayCompanyName;
        if (logo_url) {
            fields.logo.src = logo_url;
            fields.logo.alt = `${displayCompanyName} Logo`;
            fields.logo.style.display = 'block';
            fields.logoPlaceholder.style.display = 'none';
            fields.logo.onerror = () => {
                fields.logo.style.display = 'none';
                fields.logoPlaceholder.style.display = 'flex';
                fields.logoPlaceholder.textContent = displayCompanyName ? displayCompanyName.substring(0, 1).toUpperCase() : "L";
            };
        } else {
             fields.logoPlaceholder.textContent = displayCompanyName ? displayCompanyName.substring(0, 1).toUpperCase() : "L";
        }

        if (ticker_symbol && ticker_symbol.toUpperCase() !== 'PRIVATE' && ticker_symbol.toUpperCase() !== 'UNKNOWN' && ticker_symbol.trim() !== '' && ticker_symbol.toUpperCase() !== 'N/A') {
            fields.companyTicker.textContent = ticker_symbol.toUpperCase();
            fields.companyTicker.classList.remove('hidden');
        } else if (ticker_symbol && (ticker_symbol.toUpperCase() === 'PRIVATE' || ticker_symbol.toUpperCase() === 'UNKNOWN')) {
            fields.companyTicker.textContent = 'Private';
            fields.companyTicker.classList.remove('hidden','bg-gray-100/80', 'dark:bg-gray-700/80', 'text-gray-500', 'dark:text-gray-400');
            fields.companyTicker.classList.add('bg-gray-200', 'dark:bg-gray-600', 'text-gray-600', 'dark:text-gray-300');
        } else {
            fields.companyTicker.classList.add('hidden');
        }

        if (profile_details && profile_details.recommendation) {
            fields.recommendationSection.classList.remove('hidden');
            const recommendation = profile_details.recommendation;
            let sliderColor = document.documentElement.classList.contains('dark') ? "#9ca3af" : "#6b7280";
            let sliderPosition = "50%";
            let recommendationText = recommendation;

            if (recommendation.toLowerCase().includes("strong buy")) { sliderColor = "#10b981"; sliderPosition = "95%"; recommendationText = "Strong Buy 💪"; }
            else if (recommendation.toLowerCase().includes("buy")) { sliderColor = "#34d399"; sliderPosition = "75%"; recommendationText = "Buy 👍"; }
            else if (recommendation.toLowerCase().includes("wait") || recommendation.toUpperCase() === "N/A") { sliderPosition = "50%"; recommendationText = "Stable ⚖️ "; }
            else if (recommendation.toLowerCase().includes("sell") && !recommendation.toLowerCase().includes("strong")) { sliderColor = "#f59e0b"; sliderPosition = "25%"; recommendationText = "Sell 👎"; }
            else if (recommendation.toLowerCase().includes("strong sell")) { sliderColor = "#ef4444"; sliderPosition = "5%"; recommendationText = "Strong Sell 🚨"; }

            fields.recSliderThumb.style.left = sliderPosition;
            fields.recSliderThumb.style.backgroundColor = sliderColor;
            fields.recText.textContent = recommendationText;
            fields.recText.style.color = sliderColor;

            const recErrorContainer = fields.recommendationSection.querySelector('.recommendation-error-text');
            if (recErrorContainer) recErrorContainer.remove();

            if (profile_details.recommendation_error || recommendation.toUpperCase() === "N/A") {
                 const errorP = document.createElement('p');
                 errorP.className = 'recommendation-error-text text-xs text-center text-gray-500 dark:text-gray-400 mt-1';
                 errorP.textContent = profile_details.recommendation_error || 'Signal not available.';
                 fields.recommendationSection.appendChild(errorP);
            }
        }


        if (stock_data) {
            fields.stockVitalsSection.classList.remove('hidden');
            const price = formatStockValue(stock_data.price);
            const dayChangePercent = formatStockValue(stock_data.change_percent, true);
            const monthChangePercent = stock_data.month_change_percent !== undefined ? formatStockValue(stock_data.month_change_percent, true) : "N/A";

            fields.stockPrice.textContent = price;
            const dayChangeNumeric = parseFloat(String(stock_data.change_percent || "0").replace(/[^0-9.-]+/g, ""));

            fields.stockPriceArrow.textContent = '';
            fields.stockPrice.className = 'text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-100'; // Base classes

            if (price !== "N/A") {
                fields.stockPriceArrow.textContent = dayChangeNumeric > 0 ? '▲' : (dayChangeNumeric < 0 ? '▼' : '');
                fields.stockPrice.classList.remove('text-gray-800', 'dark:text-gray-100'); // Remove default colors
                
                // *** CORRECTED SECTION START ***
                if (dayChangeNumeric > 0) {
                    fields.stockPrice.classList.add('text-green-600', 'dark:text-green-400');
                } else if (dayChangeNumeric < 0) {
                    fields.stockPrice.classList.add('text-red-600', 'dark:text-red-400');
                } else { // dayChangeNumeric is 0
                    fields.stockPrice.classList.add('text-gray-800', 'dark:text-gray-100');
                }
                // *** CORRECTED SECTION END ***
            } else {
                 fields.stockPrice.classList.remove('text-gray-800', 'dark:text-gray-100'); // Ensure default are removed
                 fields.stockPrice.classList.add('text-gray-500', 'dark:text-gray-400'); // Add N/A specific styling
            }

            fields.stockDayChange.textContent = dayChangePercent;
            fields.stockDayChange.className = `text-base sm:text-lg font-semibold ${dayChangeNumeric > 0 ? 'text-green-600 dark:text-green-400' : (dayChangeNumeric < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-200')}`;

            fields.stockMonthChange.textContent = monthChangePercent;
            const monthChangeNumeric = parseFloat(String(stock_data.month_change_percent || "0").replace(/[^0-9.-]+/g, ""));
            fields.stockMonthChange.className = `text-base sm:text-lg font-semibold ${monthChangeNumeric > 0 ? 'text-green-600 dark:text-green-400' : (monthChangeNumeric < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-200')}`;

        } else if (ticker_symbol && ticker_symbol.toUpperCase() !== 'PRIVATE' && ticker_symbol.toUpperCase() !== 'UNKNOWN') {
            fields.stockVitalsSection.classList.remove('hidden');
            const vitalsGrid = fields.stockVitalsSection.querySelector('.grid');
            if(vitalsGrid) {
                vitalsGrid.innerHTML = `<div class="col-span-3 text-xs text-center p-2 bg-yellow-50 dark:bg-yellow-700/30 text-yellow-700 dark:text-yellow-300 rounded-md">${fullProfileData.stock_error || 'Stock data currently unavailable.'}</div>`;
            }
        } else {
             fields.stockVitalsSection.classList.remove('hidden');
             const vitalsGrid = fields.stockVitalsSection.querySelector('.grid');
             if(vitalsGrid) {
                vitalsGrid.innerHTML = `<div class="col-span-3 text-xs text-center p-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-md">Stock info N/A (e.g., private).</div>`;
             }
        }


        fields.geminiInsightsContainer.innerHTML = '';
        const panelKeysAndTitles = isProductAnalysisCard ? {
            "business_summary": "The Lowdown 📝", "social_vibe": "Social Scene 🌍",
            "planet_impact": "Eco-Check 🌱", "competitors_alternatives": "Rivals & Options 🚀"
        } : {
            "investment_news": "Latest Buzz 📰", "planet_impact_brief": "Planet Vibe 🌱", "social_vibe_brief": "People Vibe 🤝"
        };

        let insightsAdded = false;
        if (profile_details) {
            const insightColorsLight = ['text-blue-600', 'text-indigo-600', 'text-purple-600', 'text-pink-600', 'text-teal-600'];
            const insightColorsDark = ['text-blue-400', 'text-indigo-400', 'text-purple-400', 'text-pink-400', 'text-teal-400'];
            const insightColors = document.documentElement.classList.contains('dark') ? insightColorsDark : insightColorsLight;

            let colorIndex = 0;

            for (const key in panelKeysAndTitles) {
                if (profile_details.hasOwnProperty(key) && profile_details[key] &&
                    typeof profile_details[key] === 'string' &&
                    !["ai is stumped on this one!", "ai is quiet on this one.", "ai content issue", "ai gave an empty response.", "error fetching this insight."]
                    .some(term => profile_details[key].toLowerCase().includes(term.toLowerCase()))) {

                    const panelDiv = document.createElement('div');
                    panelDiv.className = 'insight-panel';

                    const titleH4 = document.createElement('h4');
                    titleH4.className = `text-sm font-semibold ${insightColors[colorIndex % insightColors.length]} mb-1.5`;
                    titleH4.textContent = panelKeysAndTitles[key];
                    panelDiv.appendChild(titleH4);

                    let content = profile_details[key];
                    if (content.includes('\n- ') || content.includes('\n* ') || content.match(/\n\d+\.\s/)) {
                        const listUl = document.createElement('ul');
                        listUl.className = 'text-xs sm:text-sm text-gray-600/90 dark:text-gray-300/90 leading-relaxed list-disc list-inside space-y-1 pl-1';
                        content.split('\n').forEach(line => {
                            const trimmedLine = line.trim();
                            if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ') || trimmedLine.match(/^\d+\.\s/)) {
                                const listItem = document.createElement('li');
                                let itemText = trimmedLine.substring(trimmedLine.indexOf(' ') + 1);
                                if (itemText.toLowerCase().startsWith("good:")) {
                                    listItem.innerHTML = `<span class="font-medium text-green-600 dark:text-green-400">Good:</span>${itemText.substring(5)}`;
                                } else if (itemText.toLowerCase().startsWith("bad:")) {
                                     listItem.innerHTML = `<span class="font-medium text-red-600 dark:text-red-400">Bad:</span>${itemText.substring(4)}`;
                                } else if (itemText.toLowerCase().startsWith("note:")) {
                                     listItem.innerHTML = `<span class="font-medium text-gray-600 dark:text-gray-300">Note:</span>${itemText.substring(5)}`;
                                } else {
                                    listItem.textContent = itemText;
                                }
                                listUl.appendChild(listItem);
                            } else if (trimmedLine) {
                                const p = document.createElement('p');
                                p.className = 'text-xs sm:text-sm text-gray-600/90 dark:text-gray-300/90 leading-relaxed whitespace-pre-wrap mb-1';
                                p.textContent = trimmedLine;
                                panelDiv.appendChild(p);
                            }
                        });
                        if(listUl.hasChildNodes()) panelDiv.appendChild(listUl);
                    } else {
                        const contentP = document.createElement('p');
                        contentP.className = 'text-xs sm:text-sm text-gray-600/90 dark:text-gray-300/90 leading-relaxed whitespace-pre-wrap';
                        contentP.textContent = content;
                        panelDiv.appendChild(contentP);
                    }

                    fields.geminiInsightsContainer.appendChild(panelDiv);
                    insightsAdded = true;
                    colorIndex++;
                }
            }
        }
        if (!insightsAdded && fields.geminiInsightsContainer.innerHTML === '') {
             fields.geminiInsightsContainer.innerHTML = `<p class="text-xs text-gray-500 dark:text-gray-400 italic py-3">No specific insights available.</p>`;
        }


        if (isProductAnalysisCard && displayCompanyName) {
            fields.cardFooter.classList.remove('hidden');
            const companyExists = watchedCompanies.some(c => c.name.toLowerCase() === displayCompanyName.toLowerCase());
            fields.addToWatchlistButton.dataset.companyName = displayCompanyName;
            if (companyExists) {
                fields.addToWatchlistButton.textContent = '✅ On Watchlist';
                fields.addToWatchlistButton.disabled = true;
                fields.addToWatchlistButton.classList.add('bg-green-600', 'hover:bg-green-700', 'cursor-not-allowed');
                fields.addToWatchlistButton.classList.remove('bg-blue-600', 'hover:bg-blue-700');
            } else {
                fields.addToWatchlistButton.textContent = '➕ Add to Watchlist';
                fields.addToWatchlistButton.disabled = false;
                fields.addToWatchlistButton.classList.remove('bg-green-600', 'hover:bg-green-700', 'cursor-not-allowed');
                fields.addToWatchlistButton.classList.add('bg-blue-600', 'hover:bg-blue-700');
            }
        } else {
            fields.cardFooter.classList.add('hidden');
        }
    }
    return cardElement.outerHTML;
}


function renderWatchedCompanies() {
    if (!insightsElements.watchedCompaniesList) return;
    insightsElements.watchedCompaniesLoader.classList.toggle('hidden', !watchedCompanies.some(c => c.isLoading && !c.data && !c.error));
    const overallError = watchedCompanies.every(c => c.error && !c.isLoading) && watchedCompanies.length > 0;
    insightsElements.watchedCompaniesError.classList.toggle('hidden', !overallError);
    if (overallError) {
        insightsElements.watchedCompaniesError.textContent = "Bummer! Had trouble loading some company profiles.";
    }

    insightsElements.watchedCompaniesList.innerHTML = watchedCompanies.map(company => {
        return renderCompanyProfileCard(company.name, company.data, (company.isLoading && !company.data) ? null : company.error, false);
    }).join('');
}

function renderProductAnalysis() {
    if (!insightsElements.productAnalysisResult) return;
    insightsElements.productAnalysisLoader.classList.toggle('hidden', !productAnalysis.isLoading);
    insightsElements.productAnalysisError.classList.toggle('hidden', !productAnalysis.error);
    if (productAnalysis.error) {
        insightsElements.productAnalysisError.textContent = productAnalysis.error;
    }

    insightsElements.productImagePreviewContainer.classList.toggle('hidden', !productAnalysis.imagePreview);
    if (productAnalysis.imagePreview) {
        insightsElements.productImagePreview.src = productAnalysis.imagePreview;
    }

    if (!productAnalysis.isLoading && (productAnalysis.company || productAnalysis.product || productAnalysis.data)) {
        let html = '';
        if (productAnalysis.product && productAnalysis.product.toLowerCase() !== "unknown") {
             html += `<p class="text-center text-gray-700 dark:text-gray-200 font-medium mb-4">Identified Product: <span class="font-semibold">${productAnalysis.product}</span></p>`;
        }

        if (productAnalysis.company && productAnalysis.company.toLowerCase() !== "unknown" && productAnalysis.data) {
            html += renderCompanyProfileCard(productAnalysis.company, productAnalysis.data, null, true);
        } else if (productAnalysis.company && productAnalysis.company.toLowerCase() === "unknown" && !productAnalysis.error) {
            html += `<div class="text-center text-gray-600 dark:text-gray-400 p-4 bg-yellow-50/70 dark:bg-yellow-700/30 rounded-lg border border-yellow-200 dark:border-yellow-600/50">Could not identify the parent company for "${productAnalysis.product || 'this product'}".</div>`;
        } else if (!productAnalysis.company && productAnalysis.product && !productAnalysis.error) {
             html += `<div class="text-center text-gray-600 dark:text-gray-400 p-4 bg-yellow-50/70 dark:bg-yellow-700/30 rounded-lg border border-yellow-200 dark:border-yellow-600/50">Could not identify the parent company.</div>`;
        }
        insightsElements.productAnalysisResult.innerHTML = html;
        const addBtn = insightsElements.productAnalysisResult.querySelector('[data-role="add-to-watchlist-button"]');
        if (addBtn) {
            addBtn.removeEventListener('click', handleAddFromAnalyzerToWatchlist);
            addBtn.addEventListener('click', handleAddFromAnalyzerToWatchlist);
        }

    } else if (!productAnalysis.isLoading && !productAnalysis.error && !productAnalysis.imagePreview) {
        insightsElements.productAnalysisResult.innerHTML = '';
    }
}


function openEditWatchedListModal() {
    tempWatchedCompanies = [...watchedCompanies.map(c => c.name)];
    renderCurrentWatchedListInModal();
    insightsElements.addCompanyInput.value = '';
    insightsElements.addCompanyError.classList.add('hidden');
    insightsElements.addCompanyError.textContent = '';
    openInsightsModal(insightsElements.editWatchedModal);
    insightsElements.addCompanyInput.focus();
}

function closeEditWatchedListModal() {
    closeInsightsModal(insightsElements.editWatchedModal);
}

function renderCurrentWatchedListInModal() {
    if (!insightsElements.currentWatchedListEditor) return;
    insightsElements.currentWatchedListEditor.innerHTML = tempWatchedCompanies.map((name, index) => `
        <div class="flex justify-between items-center py-2 px-1.5 border-b border-gray-100 dark:border-gray-700 last:border-b-0 group" data-index="${index}">
            <span class="text-sm text-gray-700 dark:text-gray-200 group-hover:text-gray-900 dark:group-hover:text-white">${name}</span>
            <button class="remove-watched-item-btn text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 p-1 rounded-full hover:bg-red-100/70 dark:hover:bg-red-700/30 transition-colors opacity-50 group-hover:opacity-100" title="Remove ${name}">
                <svg class="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
        </div>
    `).join('') || '<p class="text-center text-sm text-gray-500 dark:text-gray-400 py-4">Your watchlist is empty.</p>';

    insightsElements.currentWatchedListEditor.querySelectorAll('.remove-watched-item-btn').forEach(btn => {
        btn.addEventListener('click', handleRemoveWatchedItemFromModal);
    });
}

function handleRemoveWatchedItemFromModal(event) {
    const itemEditor = event.target.closest('[data-index]');
    if (!itemEditor) return;
    const indexToRemove = parseInt(itemEditor.dataset.index, 10);
    tempWatchedCompanies.splice(indexToRemove, 1);
    renderCurrentWatchedListInModal();
}

async function handleAddCompanyToModal() {
    const companyName = insightsElements.addCompanyInput.value.trim();
    insightsElements.addCompanyError.classList.add('hidden');
    insightsElements.addCompanyError.textContent = '';

    if (!companyName) {
        insightsElements.addCompanyError.textContent = "Please enter a company name.";
        insightsElements.addCompanyError.classList.remove('hidden');
        return;
    }
    if (tempWatchedCompanies.some(name => name.toLowerCase() === companyName.toLowerCase())) {
        insightsElements.addCompanyError.textContent = `"${companyName}" is already in your list.`;
        insightsElements.addCompanyError.classList.remove('hidden');
        return;
    }
    if (companyName.length > 70 || companyName.length < 2 || /^\d+$/.test(companyName)) {
        insightsElements.addCompanyError.textContent = "Please enter a valid company name (2-70 characters, not just numbers).";
        insightsElements.addCompanyError.classList.remove('hidden');
        return;
    }
    tempWatchedCompanies.push(companyName);
    renderCurrentWatchedListInModal();
    insightsElements.addCompanyInput.value = '';
    insightsElements.addCompanyInput.focus();
}

function handleSaveWatchedChanges() {
    const newWatchedList = [];
    const currentDataMap = new Map(watchedCompanies.map(c => [c.name.toLowerCase(), c]));

    tempWatchedCompanies.forEach(name => {
        const existingCompany = currentDataMap.get(name.toLowerCase());
        if (existingCompany) {
            newWatchedList.push(existingCompany);
        } else {
            newWatchedList.push({ name: name, data: null, isLoading: false, error: null });
        }
    });
    watchedCompanies = newWatchedList;
    closeEditWatchedListModal();
    localStorage.setItem('watchedCompanies', JSON.stringify(watchedCompanies.map(c => c.name)));
    loadWatchedCompaniesWithDelay();
}


// === API Fetching Functions ===
async function fetchApi(endpoint, options = {}) {
    const defaultHeaders = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    };
    options.headers = { ...defaultHeaders, ...options.headers };
    try {
        const response = await fetch(endpoint, options);
        return response;
    } catch (error) {
        console.error(`API call to ${endpoint} failed:`, error);
        throw new Error(`Network error or server unreachable: ${error.message}`);
    }
}

async function fetchCompanyProfile(companyObjectInState) {
    if (!companyObjectInState || !companyObjectInState.name) return;

    companyObjectInState.isLoading = true;
    companyObjectInState.error = null;
    companyObjectInState.data = null;
    renderWatchedCompanies();

    try {
        const response = await fetchApi('/api/company_profile', {
            method: 'POST',
            body: JSON.stringify({ company_name: companyObjectInState.name })
        });

        const responseData = await response.json().catch(async () => {
            const textError = await response.text().catch(() => "Unparseable server response.");
            throw new Error(`API Error (${response.status}): ${textError}`);
        });

        if (!response.ok) {
            let errorText = responseData.error || responseData.detail || `Failed to load profile for "${companyObjectInState.name}" (Status: ${response.status})`;
            throw new Error(errorText);
        }

        if (!responseData || Object.keys(responseData).length === 0) {
            throw new Error(`Server returned an empty or invalid profile for "${companyObjectInState.name}".`);
        }
        companyObjectInState.data = responseData;
        companyObjectInState.error = null;

    } catch (error) {
        console.error(`Error fetching profile for ${companyObjectInState.name}:`, error);
        companyObjectInState.error = error.message || `Could not load profile for "${companyObjectInState.name}".`;
    } finally {
        companyObjectInState.isLoading = false;
        renderWatchedCompanies();
    }
}


async function analyzeProductImage() {
    if (!selectedProductFile) {
        productAnalysis.error = "No image selected or captured to analyze.";
        renderProductAnalysis();
        return;
    }

    productAnalysis.isLoading = true;
    productAnalysis.error = null;
    productAnalysis.product = null;
    productAnalysis.company = null;
    productAnalysis.data = null;
    renderProductAnalysis();

    const formData = new FormData();
    formData.append('product_image', selectedProductFile);

    try {
        const response = await fetch('/api/analyze_product_image', {
            method: 'POST',
            body: formData,
            headers: { 'Accept': 'application/json' }
        });

        const responseData = await response.json().catch(async () => {
            const textError = await response.text().catch(() => "Unparseable server response.");
            throw new Error(`Analysis API Error (${response.status}): ${textError}`);
        });

        if (!response.ok) {
            let errorMessage = responseData.error || responseData.detail || `Product analysis failed (Status: ${response.status})`;
            if (response.status === 404 && responseData.identified_product && responseData.identified_company?.toLowerCase() === "unknown") {
                 productAnalysis.product = responseData.identified_product;
                 productAnalysis.company = responseData.identified_company;
                 productAnalysis.data = responseData;
                 productAnalysis.error = responseData.error || `Found: ${responseData.identified_product}, but couldn't identify the parent company.`;
            } else {
                 throw new Error(errorMessage);
            }
        } else {
             productAnalysis.product = responseData.identified_product;
             productAnalysis.company = responseData.identified_company;
             productAnalysis.data = responseData;
        }

    } catch (error) {
        console.error("Error analyzing product:", error);
        if (!productAnalysis.error) {
            productAnalysis.error = error.message || "Failed to analyze product image.";
        }
    } finally {
        productAnalysis.isLoading = false;
        renderProductAnalysis();
    }
}


// === Camera Functions ===
function openCameraModalView() {
    openInsightsModal(insightsElements.cameraModal);
    startCameraStream();
}
function closeCameraModalView() {
    closeInsightsModal(insightsElements.cameraModal);
    stopPreviousStreams();
    insightsElements.cameraErrorDisplay.classList.add('hidden');
    insightsElements.cameraErrorDisplay.textContent = '';
}
async function startCameraStream() {
    stopPreviousStreams();
    insightsElements.cameraErrorDisplay.classList.add('hidden');
    insightsElements.cameraErrorDisplay.textContent = '';
    try {
        videoStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        insightsElements.cameraVideo.srcObject = videoStream;
    } catch (err) {
        console.error("Error accessing camera:", err);
        insightsElements.cameraErrorDisplay.textContent = "Could not access camera. Check permissions & ensure HTTPS (if not localhost). Common issues: another app using camera, or no camera found.";
        insightsElements.cameraErrorDisplay.classList.remove('hidden');
    }
}

function capturePhotoAndCloseModal() {
    if (!videoStream || !insightsElements.cameraVideo.srcObject) {
        insightsElements.cameraErrorDisplay.textContent = "Camera stream not active.";
        insightsElements.cameraErrorDisplay.classList.remove('hidden');
        return;
    }
    const video = insightsElements.cameraVideo;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(blob => {
        if (blob) {
            selectedProductFile = new File([blob], `capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
            productAnalysis.imagePreview = URL.createObjectURL(blob);
            insightsElements.productImagePreviewContainer.classList.remove('hidden');
            insightsElements.analyzeProductButton.style.display = 'block';

            productAnalysis.product = null; productAnalysis.company = null;
            productAnalysis.data = null; productAnalysis.error = null;
            insightsElements.productAnalysisResult.innerHTML = '';
            insightsElements.productAnalysisError.classList.add('hidden');

            renderProductAnalysis();
            closeCameraModalView();
        } else {
            insightsElements.cameraErrorDisplay.textContent = "Failed to capture photo data.";
            insightsElements.cameraErrorDisplay.classList.remove('hidden');
        }
    }, 'image/jpeg', 0.9);
}

function stopPreviousStreams() {
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
    }
    if (insightsElements.cameraVideo && insightsElements.cameraVideo.srcObject) {
        try {
            const tracks = insightsElements.cameraVideo.srcObject.getTracks();
            tracks.forEach(track => track.stop());
        } catch(e) { console.warn("Error stopping camera tracks:", e); }
        insightsElements.cameraVideo.srcObject = null;
    }
}

// === Event Handlers ===
function handleProductFileSelection(event) {
    stopPreviousStreams();
    if (insightsElements.cameraModal && !insightsElements.cameraModal.classList.contains('invisible')) {
        closeCameraModalView();
    }

    const file = event.target.files[0];
    selectedProductFile = null;

    if (file) {
        if (file.size > 15 * 1024 * 1024) {
            productAnalysis.error = "File is too large (max 15MB). Please select a smaller image.";
            productAnalysis.imagePreview = null; selectedProductFile = null;
            insightsElements.productImagePreviewContainer.classList.add('hidden');
            insightsElements.analyzeProductButton.style.display = 'none';
            renderProductAnalysis();
            if (event.target) event.target.value = null;
            return;
        }
         if (!file.type.startsWith('image/')) {
            productAnalysis.error = "Invalid file type. Please select an image (JPEG, PNG, GIF, etc.).";
            productAnalysis.imagePreview = null; selectedProductFile = null;
            insightsElements.productImagePreviewContainer.classList.add('hidden');
            insightsElements.analyzeProductButton.style.display = 'none';
            renderProductAnalysis();
            if (event.target) event.target.value = null;
            return;
        }


        selectedProductFile = file;
        const reader = new FileReader();
        reader.onload = (e) => {
            productAnalysis.imagePreview = e.target.result;
            insightsElements.productImagePreviewContainer.classList.remove('hidden');
            insightsElements.analyzeProductButton.style.display = 'block';
            productAnalysis.product = null; productAnalysis.company = null;
            productAnalysis.data = null; productAnalysis.error = null;
            insightsElements.productAnalysisResult.innerHTML = '';
            insightsElements.productAnalysisError.classList.add('hidden');
            renderProductAnalysis();
        };
        reader.onerror = () => {
            productAnalysis.error = "Could not read the selected file.";
            productAnalysis.imagePreview = null; selectedProductFile = null;
            insightsElements.productImagePreviewContainer.classList.add('hidden');
            insightsElements.analyzeProductButton.style.display = 'none';
            renderProductAnalysis();
        };
        reader.readAsDataURL(file);
    }
    if (event.target) event.target.value = null;
}

async function loadWatchedCompaniesWithDelay(delay = 13000) { 
    const companiesToFetch = watchedCompanies.filter(c => !c.data && !c.error && !c.isLoading);

    for (let i = 0; i < companiesToFetch.length; i++) {
        const company = companiesToFetch[i];
        await fetchCompanyProfile(company); 
        
        if (i < companiesToFetch.length - 1) {
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

function handleAddFromAnalyzerToWatchlist(event) {
    const button = event.target.closest('[data-role="add-to-watchlist-button"]');
    if (!button) return;
    const companyName = button.dataset.companyName;

    if (!companyName || companyName.toLowerCase() === "unknown") {
        return;
    }

    const companyExists = watchedCompanies.some(c => c.name.toLowerCase() === companyName.toLowerCase());
    if (!companyExists) {
        const newCompany = {
            name: companyName,
            data: productAnalysis.company === companyName ? productAnalysis.data : null,
            isLoading: productAnalysis.company === companyName && productAnalysis.data ? false : true,
            error: null
        };
        watchedCompanies.push(newCompany);
        localStorage.setItem('watchedCompanies', JSON.stringify(watchedCompanies.map(c => c.name)));

        renderWatchedCompanies();

        if (!newCompany.data) {
            fetchCompanyProfile(newCompany);
        }

        button.textContent = '✅ On Watchlist';
        button.disabled = true;
        button.classList.remove('bg-blue-600', 'hover:bg-blue-700');
        button.classList.add('bg-green-600', 'hover:bg-green-700', 'cursor-not-allowed');
    }
}


// === Initialization ===
document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('insights-section')) return;

    getInsightElementReferences();

    try {
        const savedCompanyNamesJSON = localStorage.getItem('watchedCompanies');
        if (savedCompanyNamesJSON) {
            const savedCompanyNames = JSON.parse(savedCompanyNamesJSON);
            if (Array.isArray(savedCompanyNames) && savedCompanyNames.length > 0) {
                watchedCompanies = savedCompanyNames.map(name => ({
                    name: String(name), data: null, isLoading: false, error: null
                })).filter(c => c.name);
            } else if (Array.isArray(savedCompanyNames) && savedCompanyNames.length === 0) {
                watchedCompanies = [];
            } else {
                localStorage.setItem('watchedCompanies', JSON.stringify(watchedCompanies.map(c => c.name)));
            }
        } else {
             localStorage.setItem('watchedCompanies', JSON.stringify(watchedCompanies.map(c => c.name)));
        }
    } catch (e) {
        console.error("Error loading/parsing watched companies from localStorage:", e);
        watchedCompanies = [
            { name: "Apple", data: null, isLoading: false, error: null },
            { name: "Starbucks", data: null, isLoading: false, error: null }
        ];
        localStorage.setItem('watchedCompanies', JSON.stringify(watchedCompanies.map(c => c.name)));
    }

    if(insightsElements.analyzeProductButton) insightsElements.analyzeProductButton.style.display = 'none';

    if (insightsElements.editWatchedListBtn) insightsElements.editWatchedListBtn.addEventListener('click', openEditWatchedListModal);
    if (insightsElements.closeModalBtn) insightsElements.closeModalBtn.addEventListener('click', closeEditWatchedListModal);
    if (insightsElements.addCompanyBtn) insightsElements.addCompanyBtn.addEventListener('click', handleAddCompanyToModal);
    if (insightsElements.addCompanyInput) insightsElements.addCompanyInput.addEventListener('keypress', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddCompanyToModal(); } });
    if (insightsElements.saveWatchedChangesBtn) insightsElements.saveWatchedChangesBtn.addEventListener('click', handleSaveWatchedChanges);

    if (insightsElements.productImageGalleryInput) insightsElements.productImageGalleryInput.addEventListener('change', handleProductFileSelection);
    if (insightsElements.startCameraModalBtn) insightsElements.startCameraModalBtn.addEventListener('click', openCameraModalView);
    if (insightsElements.closeCameraModalBtn) insightsElements.closeCameraModalBtn.addEventListener('click', closeCameraModalView);
    if (insightsElements.capturePhotoBtn) insightsElements.capturePhotoBtn.addEventListener('click', capturePhotoAndCloseModal);
    if (insightsElements.analyzeProductButton) insightsElements.analyzeProductButton.addEventListener('click', analyzeProductImage);

    renderWatchedCompanies();
    renderProductAnalysis();

    loadWatchedCompaniesWithDelay();

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            if (insightsElements.editWatchedModal && !insightsElements.editWatchedModal.classList.contains('invisible')) {
                closeEditWatchedListModal();
            }
            if (insightsElements.cameraModal && !insightsElements.cameraModal.classList.contains('invisible')) {
                closeCameraModalView();
            }
        }
    });

    console.log('Youth Economy Navigator - Insights Features Initialized!');
});
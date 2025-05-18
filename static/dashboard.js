// --- State Management ---
const state = {
    activeTab: 'local',
    localNews: [],
    globalNews: [],
    isLoading: false,
    isLoadingMore: false,
    chatMessages: [],
    isChatLoading: false,
    error: null,
    chatError: null,
    detectedCountry: 'Loading...',
    searchTerm: '',
    filteredLocalNews: [],
    filteredGlobalNews: [],
    localNewsPage: 1,
    globalNewsPage: 1,
    localNewsTotalResults: 0,
    globalNewsTotalResults: 0,
    articlesPerPage: 20,
    theme: 'light',
    userSelectedCountry: null,
    globalUserKeywords: [],
    isChatPanelOpenMobile: false, // Added for chat bubble state
};

// --- DOM Element References ---
const elements = {};

function getElementReferences() {
    elements.localTabButton = document.getElementById('local-tab');
    elements.globalTabButton = document.getElementById('global-tab');
    elements.insightsTabButton = document.getElementById('insights-tab');
    elements.settingsTabButton = document.getElementById('settings-tab');
    elements.loginButton = document.getElementById('login-button'); 
    
    elements.desktopNavContainer = document.getElementById('desktop-nav-container'); // Added

    elements.mobileMenuButton = document.getElementById('mobile-menu-button');
    elements.hamburgerIcon = document.getElementById('hamburger-icon');
    elements.closeIcon = document.getElementById('close-icon');
    elements.mobileMenu = document.getElementById('mobile-menu');
    
    elements.mobileLocalTabButton = document.getElementById('mobile-local-tab');
    elements.mobileGlobalTabButton = document.getElementById('mobile-global-tab');
    elements.mobileInsightsTabButton = document.getElementById('mobile-insights-tab');
    elements.mobileSettingsTabButton = document.getElementById('mobile-settings-tab');
    elements.mobileLoginButton = document.getElementById('mobile-login-button');
    
    elements.newsLoadingIndicator = document.getElementById('news-loading-indicator');
    elements.newsErrorDisplay = document.getElementById('news-error-display');
    
    elements.localNewsSection = document.getElementById('local-news-section');
    elements.globalNewsSection = document.getElementById('global-news-section');
    elements.insightsContentSection = document.getElementById('insights-content-section'); 
    elements.settingsSection = document.getElementById('settings-section');
    
    elements.localNewsList = document.getElementById('local-news-list');
    elements.globalNewsList = document.getElementById('global-news-list');
    
    elements.mainSectionTitle = document.getElementById('main-section-title'); 
    elements.searchInput = document.getElementById('news-search-input');
    
    elements.loadMoreLocalButton = document.getElementById('load-more-local');
    elements.loadMoreGlobalButton = document.getElementById('load-more-global');
    
    // Chat Elements
    elements.chatbotContainer = document.getElementById('chatbot-container'); // The main chat UI
    elements.stickyChatbotWrapper = document.getElementById('sticky-chatbot-wrapper'); // Desktop sidebar
    elements.chatBubble = document.getElementById('chat-bubble'); // Mobile bubble button
    elements.chatPanelCloseButton = document.getElementById('chat-panel-close-button'); // Close button in panel

    elements.chatMessagesContainer = document.getElementById('chat-messages-container');
    elements.chatInput = document.getElementById('chat-input');
    elements.chatSendButton = document.getElementById('chat-send-button');
    elements.chatLoadingIndicator = document.getElementById('chat-loading-indicator'); 
    elements.chatErrorDisplay = document.getElementById('chat-error-display');
    
    elements.modalBackdrop = document.getElementById('modalBackdrop');
    elements.modalPanel = document.getElementById('modalPanel');
    elements.modalTitle = document.getElementById('modalTitle');
    elements.modalBody = document.getElementById('modalBody');
    elements.modalSkeletonLoader = document.getElementById('modalSkeletonLoader');
    elements.modalSummary = document.getElementById('modalSummary');
    elements.modalGenZ = document.getElementById('modalGenZ');
    elements.modalImpact = document.getElementById('modalImpact');
    elements.modalImpactScale = document.getElementById('modalImpactScale');
    
    elements.settingsDetectedCountry = document.getElementById('settings-detected-country');
    elements.themeToggleButton = document.getElementById('theme-toggle-button');
    elements.themeToggleIndicator = document.getElementById('theme-toggle-indicator');
    elements.countryOverrideSelect = document.getElementById('country-override-select');
    elements.globalKeywordsInput = document.getElementById('global-keywords-input');
    elements.saveGlobalKeywordsButton = document.getElementById('save-global-keywords-button');
    elements.currentGlobalKeywordsDisplay = document.getElementById('current-global-keywords-display');
    elements.resetSettingsButton = document.getElementById('reset-settings-button');

    elements.saveModalAsPngButton = document.getElementById('save-modal-as-png-button');
    elements.fullArticleButton = document.getElementById('full-article-button');
    // elements.chatbotWrapper is now elements.stickyChatbotWrapper or elements.chatbotContainer itself
}

function handleFullArticleClick() {
    if (elements.modalPanel) {
        const articleUrl = elements.modalPanel.dataset.articleUrl;
        if (articleUrl) {
            window.open(articleUrl, '_blank');
        } else {
            alert("Could not find the original article URL.");
        }
    }
}

function applyTheme(theme) { 
    if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        if (elements.themeToggleButton) {
            elements.themeToggleButton.setAttribute('aria-checked', 'true');
            elements.themeToggleButton.classList.replace('bg-gray-300', 'bg-indigo-600');
        }
        if (elements.themeToggleIndicator) {
             elements.themeToggleIndicator.classList.replace('translate-x-0', 'translate-x-5');
        }
    } else { 
        document.documentElement.classList.remove('dark');
        if (elements.themeToggleButton) {
            elements.themeToggleButton.setAttribute('aria-checked', 'false');
            elements.themeToggleButton.classList.replace('bg-indigo-600', 'bg-gray-300');
        }
        if (elements.themeToggleIndicator) {
            elements.themeToggleIndicator.classList.replace('translate-x-5', 'translate-x-0');
        }
    }
    state.theme = theme;
}

function loadSettings() {
    const storedTheme = localStorage.getItem('appTheme');
    if (storedTheme) {
        applyTheme(storedTheme); 
    } else {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            applyTheme('dark');
        } else {
            applyTheme('light'); 
        }
    }
    if (elements.themeToggleButton && elements.themeToggleIndicator) {
        if (state.theme === 'dark') {
            elements.themeToggleButton.setAttribute('aria-checked', 'true');
            elements.themeToggleIndicator.classList.remove('translate-x-0');
            elements.themeToggleIndicator.classList.add('translate-x-5');
            elements.themeToggleButton.classList.remove('bg-gray-300');
            elements.themeToggleButton.classList.add('bg-indigo-600');
        } else {
            elements.themeToggleButton.setAttribute('aria-checked', 'false');
            elements.themeToggleIndicator.classList.remove('translate-x-5');
            elements.themeToggleIndicator.classList.add('translate-x-0');
            elements.themeToggleButton.classList.remove('bg-indigo-600');
            elements.themeToggleButton.classList.add('bg-gray-300');
        }
    }

    const storedCountry = localStorage.getItem('userSelectedCountry');
    if (storedCountry) {
        state.userSelectedCountry = storedCountry;
        if (elements.countryOverrideSelect) elements.countryOverrideSelect.value = storedCountry;
    } else {
        state.userSelectedCountry = null; 
        if (elements.countryOverrideSelect) elements.countryOverrideSelect.value = ""; 
    }

    const storedKeywords = localStorage.getItem('globalUserKeywords');
    if (storedKeywords) {
        try {
            state.globalUserKeywords = JSON.parse(storedKeywords);
            if (!Array.isArray(state.globalUserKeywords)) state.globalUserKeywords = []; 
        } catch (e) {
            state.globalUserKeywords = [];
        }
    } else {
        state.globalUserKeywords = [];
    }
    renderCurrentGlobalKeywords();
    if (elements.globalKeywordsInput && Array.isArray(state.globalUserKeywords)) {
        elements.globalKeywordsInput.value = state.globalUserKeywords.join(', ');
    }
 }

function saveThemeSetting() {
    const newTheme = state.theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('appTheme', newTheme);
    applyTheme(newTheme); 
 }

function saveCountryOverride(countryCode) {
    const previousCountrySetting = state.userSelectedCountry; 
    if (countryCode === "" || countryCode === null) {
        state.userSelectedCountry = null;
        localStorage.removeItem('userSelectedCountry');
    } else {
        state.userSelectedCountry = countryCode;
        localStorage.setItem('userSelectedCountry', countryCode);
    }

    const currentEffectiveCountry = state.userSelectedCountry || state.detectedCountry; 
    const previousEffectiveCountry = previousCountrySetting || state.detectedCountry; 

    if (state.activeTab === 'local' && currentEffectiveCountry !== previousEffectiveCountry && currentEffectiveCountry !== 'Loading...') {
        state.localNews = [];
        state.localNewsPage = 1;
        state.filteredLocalNews = [];
        fetchNews('local', false);
    }
 }

function renderCurrentGlobalKeywords() { 
    if (!elements.currentGlobalKeywordsDisplay) return;
    if (Array.isArray(state.globalUserKeywords) && state.globalUserKeywords.length > 0) {
        elements.currentGlobalKeywordsDisplay.innerHTML = 'Current keywords: ' +
            state.globalUserKeywords.map(kw =>
                `<span class="inline-block bg-gray-200 dark:bg-gray-700 dark:text-gray-200 rounded-full px-3 py-1 text-sm font-semibold text-gray-700 mr-2 mb-2">${kw}</span>`
            ).join('');
    } else {
        elements.currentGlobalKeywordsDisplay.innerHTML = '<em class="text-gray-500 dark:text-gray-400">No custom global keywords set.</em>';
    }
}

function saveGlobalKeywords() {
    if (!elements.globalKeywordsInput) return;
    const keywordsString = elements.globalKeywordsInput.value.trim();
    const oldKeywordsJSON = JSON.stringify(state.globalUserKeywords.slice().sort());

    if (keywordsString) {
        state.globalUserKeywords = keywordsString.split(',')
                                     .map(kw => kw.trim().toLowerCase()) 
                                     .filter(kw => kw !== '')
                                     .filter((value, index, self) => self.indexOf(value) === index); 
    } else {
        state.globalUserKeywords = [];
    }
    localStorage.setItem('globalUserKeywords', JSON.stringify(state.globalUserKeywords));
    renderCurrentGlobalKeywords();
    const newKeywordsJSON = JSON.stringify(state.globalUserKeywords.slice().sort());

    if (state.activeTab === 'global' && newKeywordsJSON !== oldKeywordsJSON) {
        state.globalNews = [];
        state.globalNewsPage = 1;
        state.filteredGlobalNews = [];
        fetchNews('global', false);
    }
 }

function resetAllSettings() { 
    if (confirm("Are you sure you want to reset all settings? This will clear saved country and keywords.")) {
        localStorage.removeItem('appTheme');
        localStorage.removeItem('userSelectedCountry');
        localStorage.removeItem('globalUserKeywords');

        state.userSelectedCountry = null;
        state.globalUserKeywords = [];
        
        const osPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        applyTheme(osPrefersDark ? 'dark' : 'light'); 

        if (elements.countryOverrideSelect) elements.countryOverrideSelect.value = "";
        if (elements.globalKeywordsInput) elements.globalKeywordsInput.value = "";
        renderCurrentGlobalKeywords();
        
        alert("Settings have been reset. News will refresh if applicable.");

        if (state.activeTab === 'local') {
            state.localNews = []; state.localNewsPage = 1; state.filteredLocalNews = [];
            fetchNews('local', false);
        } else if (state.activeTab === 'global') {
            state.globalNews = []; state.globalNewsPage = 1; state.filteredGlobalNews = [];
            fetchNews('global', false);
        }
    }
}

async function handleSaveModalAsPng() {
    if (typeof html2canvas === 'undefined') {
        alert("Sorry, the image capture feature is not available right now.");
        return;
    }

    const genZSectionElement = elements.modalGenZ?.closest('.section-block');
    const impactSectionElement = elements.modalImpact?.closest('.section-block'); 
    const impactScaleContainer = document.getElementById('modalImpactScaleContainer'); 

    if (!genZSectionElement || !impactSectionElement || !impactScaleContainer) {
        alert("Could not find all content sections to save. Please ensure the analysis is fully loaded.");
        return;
    }

    if (elements.saveModalAsPngButton) {
        elements.saveModalAsPngButton.disabled = true;
        elements.saveModalAsPngButton.textContent = "Saving...";
    }

    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.top = '-9999px';
    tempContainer.style.width = '550px'; 
    tempContainer.style.padding = '24px';
    tempContainer.style.borderRadius = '1.5rem'; 
    tempContainer.style.fontFamily = "'Lexend', sans-serif";
    tempContainer.style.display = 'flex';
    tempContainer.style.flexDirection = 'column';
    tempContainer.style.gap = '1rem'; 
    tempContainer.style.backgroundColor = document.documentElement.classList.contains('dark') ? '#1f2937' : '#ffffff'; 
    tempContainer.style.color = document.documentElement.classList.contains('dark') ? '#d1d5db' : '#1f2937'; 
    tempContainer.style.border = `1px solid ${document.documentElement.classList.contains('dark') ? '#374151' : '#e5e7eb'}`; 
    document.body.appendChild(tempContainer);

    const clonedGenZSection = genZSectionElement.cloneNode(true);
    const clonedImpactSection = impactSectionElement.cloneNode(true);
    const clonedImpactScaleContainer = impactScaleContainer.cloneNode(true);
    
    tempContainer.appendChild(clonedGenZSection);
    tempContainer.appendChild(clonedImpactSection); 
    tempContainer.appendChild(clonedImpactScaleContainer); 

    try {
        const canvas = await html2canvas(tempContainer, {
            allowTaint: true,
            useCORS: true,
            backgroundColor: null, 
            scale: window.devicePixelRatio * 2, 
        });

        const imageURL = canvas.toDataURL("image/png");
        const downloadLink = document.createElement('a');
        downloadLink.href = imageURL;
        
        const articleTitleForFile = elements.modalPanel.dataset.articleTitle || 'analysis';
        const sanitizedTitle = articleTitleForFile.trim().replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
        const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        downloadLink.download = `YEN_${sanitizedTitle}_Analysis_${timestamp}.png`;

        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);

    } catch (error) {
        console.error("Error generating image with html2canvas:", error);
        alert("Sorry, an error occurred while trying to save the image.");
    } finally {
        if (tempContainer.parentNode) {
            tempContainer.parentNode.removeChild(tempContainer);
        }
        if (elements.saveModalAsPngButton) {
            elements.saveModalAsPngButton.disabled = false;
            elements.saveModalAsPngButton.textContent = "Share"; 
        }
    }
}

function renderNewsArticle(article, type) {
     if (!article || !article.title || !article.description || !article.url) {
         return '';
     }
    const imageHtml = article.urlToImage ? `<img src="${article.urlToImage}" alt="" class="w-full rounded-lg object-cover h-40 dark:opacity-80">` : '<div class="w-full rounded-lg h-40 bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-400 dark:text-gray-500">No Image</div>';

    return `
        <div class="glass-card p-3 sm:p-5 space-y-2 sm:space-y-3">
            ${imageHtml}
            <h3 class="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">${article.title}</h3>
            <p class="text-xs sm:text-sm text-gray-700 dark:text-gray-300">${article.description}</p>
            <div class="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
                <span>${article.source?.name || 'Unknown Source'}</span>
                  <button
                      onclick="openModalWithArticle('${encodeURIComponent(article.url)}')" 
                      class="px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                  >
                    Read More →
                  </button>
            </div>
        </div>
    `;
}

async function openModalWithArticle(articleUrl) {
    const url = decodeURIComponent(articleUrl);
    let currentArticleData = null;
    if (state.activeTab === 'local') {
        currentArticleData = state.localNews.find(a => a.url === url) || state.filteredLocalNews.find(a => a.url === url);
    } else if (state.activeTab === 'global') {
        currentArticleData = state.globalNews.find(a => a.url === url) || state.filteredGlobalNews.find(a => a.url === url);
    }
    const articleDisplayTitle = currentArticleData ? currentArticleData.title : "Article Analysis";

    if (elements.modalPanel) {
        elements.modalPanel.dataset.articleUrl = url;
        elements.modalPanel.dataset.articleTitle = articleDisplayTitle;
    }

    const modalBackdrop = elements.modalBackdrop;
    const modalPanel = elements.modalPanel;
    const modalTitle = elements.modalTitle;
    const modalSummary = elements.modalSummary;
    const modalGenZ = elements.modalGenZ;
    const modalImpact = elements.modalImpact;
    const modalImpactScale = elements.modalImpactScale;
    const modalSkeletonLoader = elements.modalSkeletonLoader;
    const modalBody = elements.modalBody;
    const modalContentSections = modalBody?.querySelectorAll('.section-block'); 

    if (modalBackdrop) modalBackdrop.classList.remove('hidden');
    if (modalPanel) void modalPanel.offsetWidth; 

    if (modalBackdrop) { 
        modalBackdrop.classList.remove('opacity-0');
        modalBackdrop.classList.add('opacity-100');
    }
    if (modalPanel) { 
        modalPanel.classList.remove('opacity-0', 'scale-95');
        modalPanel.classList.add('opacity-100', 'scale-100');
    }
    if (modalTitle) modalTitle.innerText = "Loading Article Analysis...";
    if (modalSkeletonLoader) modalSkeletonLoader.style.display = 'block';
    if(modalContentSections) modalContentSections.forEach(section => { section.style.display = 'none'; });
    if (modalSummary) modalSummary.innerText = "";
    if (modalGenZ) modalGenZ.innerText = "";
    if (modalImpact) modalImpact.innerText = "";
    if (modalImpactScale) modalImpactScale.innerHTML = "";

    try {
        const response = await fetch(`/api/gemini-summary?url=${encodeURIComponent(url)}`);
        if (!response.ok) {
            let errorMsg = `Failed to load summary (Status: ${response.status})`;
            try {
                const errorData = await response.json();
                if (errorData && errorData.error) { errorMsg = `Error: ${errorData.error}`; }
            } catch (e) { /* ignore */ }
            throw new Error(errorMsg);
        }
        const data = await response.json();
        if (data.error) { throw new Error(data.error); }

        if (modalTitle) modalTitle.innerText = articleDisplayTitle;
        if (modalSummary) modalSummary.innerText = data.summary || "No summary available.";
        if (modalGenZ) modalGenZ.innerText = data.genz || "No GenZ translation available.";
        if (modalImpact) modalImpact.innerText = data.impact || "No impact analysis available.";

        if (modalImpactScale) {
            modalImpactScale.innerHTML = ''; 
            const level = data.impactLevel || 0;
            for (let i = 1; i <= 5; i++) {
                const dot = document.createElement('div');
                dot.className = `w-5 h-5 sm:w-6 sm:h-6 rounded-full ${i <= level ? 'bg-red-500 dark:bg-red-400' : 'bg-gray-300 dark:bg-gray-600'}`;
                modalImpactScale.appendChild(dot);
            }
        }
    } catch (error) {
        if (modalTitle) modalTitle.innerText = "Error Loading Analysis";
        if (modalSummary) modalSummary.innerText = error.message || "An unknown error occurred.";
    } finally {
        if (modalSkeletonLoader) modalSkeletonLoader.style.display = 'none';
        if(modalContentSections) {
            modalContentSections.forEach(section => { 
                const contentP = section.querySelector('p'); 
                const isImpactScaleContainer = section.id === "modalImpactScaleContainer";
                const hasContent = (contentP && contentP.innerText.trim() !== "" && contentP.innerText.trim() !== "No summary available." && contentP.innerText.trim() !== "No GenZ translation available." && contentP.innerText.trim() !== "No impact analysis available." && !contentP.innerText.toLowerCase().startsWith("error:")) || 
                                   (isImpactScaleContainer && modalImpactScale && modalImpactScale.children.length > 0);

                if (modalSummary && section.contains(modalSummary) && modalSummary.innerText.toLowerCase().startsWith("error:")) {
                    section.style.display = 'block'; 
                } else if (modalTitle && modalTitle.innerText === "Error Loading Analysis") {
                     section.style.display = section.contains(modalSummary) ? 'block' : 'none'; 
                } else if (hasContent) {
                     section.style.display = 'block';
                } else {
                     section.style.display = 'none';
                }
            });
        }
    }
}

function closeModal() {
    const modalBackdrop = elements.modalBackdrop;
    const modalPanel = elements.modalPanel;
    const modalBody = elements.modalBody;

    if (modalBackdrop) { 
        modalBackdrop.classList.remove('opacity-100');
        modalBackdrop.classList.add('opacity-0');
    }
    if (modalPanel) { 
        modalPanel.classList.remove('opacity-100', 'scale-100');
        modalPanel.classList.add('opacity-0', 'scale-95');
    }
    setTimeout(() => {
        if (modalBackdrop) modalBackdrop.classList.add('hidden');
        if (modalBody) modalBody.scrollTop = 0; 
        if (elements.modalSkeletonLoader) elements.modalSkeletonLoader.style.display = 'none';
        const modalContentSections = modalBody?.querySelectorAll('.section-block');
        if(modalContentSections) modalContentSections.forEach(section => { section.style.display = 'block'; });

        if (elements.modalPanel) { 
            delete elements.modalPanel.dataset.articleUrl;
            delete elements.modalPanel.dataset.articleTitle;
        }
    }, 300); 
}

function renderNewsList(type, isLoadMoreAction = false) {
    let newsToDisplay;
    const isSearching = state.searchTerm.trim() !== "";
    const container = type === 'local' ? elements.localNewsList : elements.globalNewsList;
    const loadMoreButton = type === 'local' ? elements.loadMoreLocalButton : elements.loadMoreGlobalButton;

    if (isSearching) {
        newsToDisplay = type === 'local' ? state.filteredLocalNews : state.filteredGlobalNews;
    } else {
        newsToDisplay = type === 'local' ? state.localNews : state.globalNews;
    }
    
    if (!isLoadMoreAction && container) { 
        container.innerHTML = '';
    }
    
    if (container && newsToDisplay && newsToDisplay.length > 0) {
        const articlesHtml = newsToDisplay.map(article => renderNewsArticle(article, type)).join('');
        if (isLoadMoreAction) {
            container.insertAdjacentHTML('beforeend', articlesHtml);
        } else {
            container.innerHTML = articlesHtml;
        }
    } else if (container && !isLoadMoreAction) { 
        let message = type === 'local' ? 'No local news found for current criteria.' : 'No global news found for current criteria.';
        if (isSearching) {
            message = `No ${type} news matches your search for "${state.searchTerm}".`;
        }
        container.innerHTML = `<div class="text-center text-gray-600 dark:text-gray-400 py-8 col-span-1 md:col-span-2 text-sm sm:text-base">${message}</div>`;
    }

    if (loadMoreButton) {
        const totalResults = type === 'local' ? state.localNewsTotalResults : state.globalNewsTotalResults;
        const currentSource = type === 'local' ? state.localNews : state.globalNews; 
        const loadedCount = currentSource.length;

        if (isSearching) { 
            loadMoreButton.style.display = 'none'; 
        } else if (loadedCount < totalResults && totalResults > 0) {
            loadMoreButton.style.display = 'block';
            loadMoreButton.disabled = state.isLoadingMore;
            loadMoreButton.textContent = state.isLoadingMore ? 'Loading...' : `Load More ${type === 'local' ? 'Local' : 'Global'} News`;
        } else { 
            loadMoreButton.style.display = 'none'; 
        }
    }
}

function renderChatMessage(message) {
    const messageClass = message.isBot ? 'bot-message self-start' : 'user-message self-end';
    let textContent = message.text;
    const isTypingIndicator = message.isBot && typeof message.text === 'string' && message.text.trim().toLowerCase().startsWith('<svg'); 
    return `
        <div class="${messageClass} ${message.isBot ? 'dark:bg-gray-600 dark:text-gray-200' : 'dark:bg-blue-700 dark:text-blue-100'}">
            ${isTypingIndicator ? textContent : `<span>${textContent}</span>`}
        </div>
    `;
}

function renderChatMessages() {
    if (!elements.chatMessagesContainer) return;
    state.chatMessages = state.chatMessages.filter(msg => !msg.isTypingIndicatorPlaceholder); 
    let messagesHtml = state.chatMessages.map(renderChatMessage).join('');

    if (state.isChatLoading) { 
        messagesHtml += `
            <div class="bot-message self-start dark:bg-gray-600 dark:text-gray-200">
                <svg class="w-5 h-5 animate-pulse text-gray-500 dark:text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20"><path d="M5 10a2 2 0 110-4 2 2 0 010 4zm10 0a2 2 0 110-4 2 2 0 010 4zm-5 0a2 2 0 110-4 2 2 0 010 4z"/></svg>
            </div>
        `;
    }
    elements.chatMessagesContainer.innerHTML = messagesHtml;
    if (elements.chatErrorDisplay) {
        elements.chatErrorDisplay.style.display = state.chatError ? 'block' : 'none';
        if (state.chatError && elements.chatErrorDisplay.querySelector('#chat-error-text')) {
            elements.chatErrorDisplay.querySelector('#chat-error-text').textContent = state.chatError;
        }
    }
    elements.chatMessagesContainer.scrollTop = elements.chatMessagesContainer.scrollHeight;
}

async function fetchDetectedCountry() {
    if(elements.settingsDetectedCountry) {
        if (state.detectedCountry !== 'Loading...' && state.detectedCountry !== 'N/A' && state.detectedCountry !== 'Error') {
            elements.settingsDetectedCountry.textContent = state.detectedCountry;
        } else {
            try {
                 await fetch(`/api/news?type=local&pageSize=1`); 
                 state.detectedCountry = state.userSelectedCountry || "US (Default)"; 
                 elements.settingsDetectedCountry.textContent = state.detectedCountry;
            } catch (err) {
                state.detectedCountry = "N/A";
                elements.settingsDetectedCountry.textContent = state.detectedCountry;
            }
        }
    }
}

async function fetchNews(type, isLoadMoreAction = false) {
    if (!isLoadMoreAction && state.isLoading) { return; }
    if (isLoadMoreAction && state.isLoadingMore) { return; }

    let currentPage;

    if (type === 'local') {
        if (isLoadMoreAction) {
            state.isLoadingMore = true;
            currentPage = state.localNewsPage;
        } else {
            state.isLoading = true; state.error = null;
            state.localNewsPage = 1; state.localNews = []; state.localNewsTotalResults = 0; state.filteredLocalNews = [];
            currentPage = 1;
        }
    } else { // global
        if (isLoadMoreAction) {
            state.isLoadingMore = true;
            currentPage = state.globalNewsPage;
        } else {
            state.isLoading = true; state.error = null;
            state.globalNewsPage = 1; state.globalNews = []; state.globalNewsTotalResults = 0; state.filteredGlobalNews = [];
            currentPage = 1;
        }
    }
    
    if (!isLoadMoreAction) {
        if(elements.newsLoadingIndicator) elements.newsLoadingIndicator.style.display = 'block';
        if(elements.newsErrorDisplay) {
            elements.newsErrorDisplay.style.display = 'none';
            const errTextEl = elements.newsErrorDisplay.querySelector('#news-error-text');
            if (errTextEl) errTextEl.textContent = '';
        }
    }
    if (!isLoadMoreAction) renderNewsList(type, false);

    let apiUrl = `/api/news?type=${type}&page=${currentPage}&pageSize=${state.articlesPerPage}`;
    if (type === 'local' && state.userSelectedCountry) {
        apiUrl += `&country=${state.userSelectedCountry}`;
    }
    if (type === 'global' && Array.isArray(state.globalUserKeywords) && state.globalUserKeywords.length > 0) {
        const userKeywordsQuery = state.globalUserKeywords.join(' OR '); 
        apiUrl += `&user_keywords=${encodeURIComponent(userKeywordsQuery)}`;
    }

    try {
        const response = await fetch(apiUrl);
        const result = await response.json();

        if (result.status === 'ok' && Array.isArray(result.articles)) {
            const articlesFromBackend = result.articles || [];
            const validArticles = articlesFromBackend.filter(article => 
                article && article.title && article.description && article.url && article.source?.name
            ); 
            
            if (type === 'local') {
                state.localNews = isLoadMoreAction ? [...state.localNews, ...validArticles] : validArticles;
                state.localNewsTotalResults = result.totalResults || 0;
                if (validArticles.length > 0 || result.totalResults > state.localNews.length) { 
                    state.localNewsPage++;
                }
            } else if (type === 'global') {
                state.globalNews = isLoadMoreAction ? [...state.globalNews, ...validArticles] : validArticles;
                state.globalNewsTotalResults = result.totalResults || 0;
                 if (validArticles.length > 0 || result.totalResults > state.globalNews.length) {
                    state.globalNewsPage++;
                }
            }
            applyNewsFilter(isLoadMoreAction); 
        } else { 
            state.error = result.message || `Error fetching ${type} news.`;
            if (!isLoadMoreAction && elements.newsErrorDisplay && elements.newsErrorDisplay.querySelector('#news-error-text')) {
                elements.newsErrorDisplay.querySelector('#news-error-text').textContent = state.error;
                elements.newsErrorDisplay.style.display = 'block';
            }
            renderNewsList(type, isLoadMoreAction); 
        }
    } catch (error) { 
        state.error = `Network error while fetching ${type} news: ${error.message}`;
        if (!isLoadMoreAction && elements.newsErrorDisplay && elements.newsErrorDisplay.querySelector('#news-error-text')) {
            elements.newsErrorDisplay.querySelector('#news-error-text').textContent = state.error;
            elements.newsErrorDisplay.style.display = 'block';
        }
        renderNewsList(type, isLoadMoreAction); 
    } finally {
        if (isLoadMoreAction) state.isLoadingMore = false;
        else { state.isLoading = false; if(elements.newsLoadingIndicator) elements.newsLoadingIndicator.style.display = 'none'; }
        if (!isLoadMoreAction && state.activeTab === type) { 
             applyNewsFilter(false); 
        } else if (isLoadMoreAction && state.activeTab === type) {
             renderNewsList(type, true); 
        }
    }
}

function generateUniqueId() { return '_' + Math.random().toString(36).substr(2, 9); }

async function sendMessage() {
    const message = elements.chatInput.value.trim();
    if (!message || state.isChatLoading) return;

    elements.chatInput.disabled = true;
    elements.chatSendButton.disabled = true;
    state.chatError = null; 
    elements.chatInput.value = ''; 
    state.chatMessages.push({ id: generateUniqueId(), text: message, isBot: false });
    
    state.isChatLoading = true; 
    renderChatMessages(); 

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: message })
        });
        const result = await response.json();
        state.isChatLoading = false; 

        if (result.response) {
            state.chatMessages.push({ id: generateUniqueId(), text: result.response, isBot: true });
        } else if (result.error) {
             state.chatError = result.error; 
             state.chatMessages.push({ id: generateUniqueId(), text: `Error: ${result.error}`, isBot: true }); 
        } else {
             state.chatError = 'Received an unexpected response from the bot.';
             state.chatMessages.push({ id: generateUniqueId(), text: 'Received an unexpected response from the bot.', isBot: true });
        }
    } catch (error) {
         state.isChatLoading = false; 
         state.chatError = 'Failed to connect to the chatbot server.';
         state.chatMessages.push({ id: generateUniqueId(), text: 'Sorry, I am unable to respond right now. (Connection Error)', isBot: true });
    } finally {
        elements.chatInput.disabled = false;
        elements.chatSendButton.disabled = false;
        renderChatMessages(); 
        elements.chatInput.focus();
    }
}

function applyNewsFilter(isLoadMoreAction = false) {
    const term = state.searchTerm.toLowerCase().trim();
    const sourceNews = state.activeTab === 'local' ? state.localNews : state.globalNews;
    
    if (!term) { 
        if (state.activeTab === 'local') state.filteredLocalNews = [...state.localNews]; 
        else state.filteredGlobalNews = [...state.globalNews]; 
    } else {
        const filtered = sourceNews.filter(article => 
            (article.title && article.title.toLowerCase().includes(term)) || 
            (article.description && article.description.toLowerCase().includes(term)) ||
            (article.source?.name && article.source.name.toLowerCase().includes(term)) 
        );
        if (state.activeTab === 'local') state.filteredLocalNews = filtered;
        else state.filteredGlobalNews = filtered;
    }
    renderNewsList(state.activeTab, (term ? false : isLoadMoreAction)); 
}

// --- Hamburger Menu Logic ---
function toggleMobileMenu() {
    if (!elements.mobileMenuButton || !elements.mobileMenu || !elements.hamburgerIcon || !elements.closeIcon) return;
    const isExpanded = elements.mobileMenuButton.getAttribute('aria-expanded') === 'true' || false;
    elements.mobileMenuButton.setAttribute('aria-expanded', String(!isExpanded));
    elements.mobileMenu.classList.toggle('hidden');
    elements.hamburgerIcon.classList.toggle('hidden');
    elements.closeIcon.classList.toggle('hidden');
}

function handleMobileTabClick(event) {
    const targetTabId = event.currentTarget.dataset.targetTab;
    const desktopTabButton = document.getElementById(targetTabId);

    if (!targetTabId || !desktopTabButton) return;

    // Simulate desktop tab click
    const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window
    });
    desktopTabButton.dispatchEvent(clickEvent);

    // Wait a moment before collapsing menu and scrolling into view
    setTimeout(() => {
        // Scroll to settings if that’s what was clicked
        if (targetTabId === 'settings-tab' && elements.settingsSection) {
            elements.settingsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        // Close mobile menu unless explicitly keeping it open
        if (elements.mobileMenu && !elements.mobileMenu.classList.contains('hidden')) {
            toggleMobileMenu();
        }
    }, 150);

    // Visual style update for mobile buttons
    const mobileNavButtons = [
        elements.mobileLocalTabButton,
        elements.mobileGlobalTabButton,
        elements.mobileInsightsTabButton,
        elements.mobileSettingsTabButton
    ];
    mobileNavButtons.forEach(btn => {
        if (btn) {
            btn.classList.remove(
                'active-mobile-tab',
                'dark:bg-gray-700',
                'bg-indigo-100',
                'text-indigo-800',
                'dark:text-indigo-300'
            );
        }
    });

    if (event.currentTarget && event.currentTarget.id !== 'mobile-login-button') {
        event.currentTarget.classList.add('active-mobile-tab');
        if (document.documentElement.classList.contains('dark')) {
            event.currentTarget.classList.add('dark:bg-gray-700', 'dark:text-indigo-300');
        } else {
            event.currentTarget.classList.add('bg-indigo-100', 'text-indigo-800');
        }
    }

    // Close chat panel on mobile when settings is opened
    if (state.isChatPanelOpenMobile && targetTabId === 'settings-tab') {
        closeChatPanelMobile();
    }
}


// --- Chat Bubble / Panel Logic ---
function openChatPanelMobile(){
    if(!elements.chatbotContainer || !elements.chatBubble || !elements.chatPanelCloseButton || !elements.stickyChatbotWrapper) return;
    state.isChatPanelOpenMobile = true;

    /* NEW: be sure its parent isn’t hidden */
    elements.stickyChatbotWrapper.classList.remove('hidden');

    elements.chatbotContainer.classList.remove('hidden');
    elements.chatbotContainer.classList.add(
        'fixed','bottom-5','right-5',
        'chat-panel-mobile-fixed','lg:hidden'
    );
    elements.chatBubble.classList.add('hidden');
    elements.chatPanelCloseButton.classList.remove('hidden');
    elements.chatInput.focus();
}

function closeChatPanelMobile(){
    if(!elements.chatbotContainer || !elements.chatBubble || !elements.chatPanelCloseButton || !elements.stickyChatbotWrapper) return;
    state.isChatPanelOpenMobile = false;

    elements.chatbotContainer.classList.add('hidden');
    elements.chatbotContainer.classList.remove(
        'fixed','bottom-5','right-5','chat-panel-mobile-fixed'
    );
    elements.chatBubble.classList.remove('hidden');
    elements.chatPanelCloseButton.classList.add('hidden');

    /* NEW: hide the wrapper again so it doesn’t reserve space */
    elements.stickyChatbotWrapper.classList.add('hidden');
}

function handleResize() {
    if (!elements.chatbotContainer || !elements.stickyChatbotWrapper || !elements.chatBubble) return;

    const isLargeScreen = window.innerWidth >= 1024; // lg breakpoint

    if (isLargeScreen) {
        // Desktop view: chat in sidebar
        elements.chatBubble.classList.add('hidden');
        if (state.isChatPanelOpenMobile) { // If panel was open from mobile, close it
            closeChatPanelMobile();
        }
        elements.stickyChatbotWrapper.classList.remove('hidden');
        elements.chatbotContainer.classList.remove('hidden', 'fixed', 'bottom-5', 'right-5', 'chat-panel-mobile-fixed', 'lg:hidden');
        elements.chatbotContainer.classList.add('h-full'); // Ensure it fills the sticky wrapper
         // Ensure chat is visible if not settings tab
        if (state.activeTab !== 'settings') {
            elements.chatbotContainer.classList.remove('hidden');
        } else {
            elements.chatbotContainer.classList.add('hidden');
        }
        if (elements.chatPanelCloseButton) elements.chatPanelCloseButton.classList.add('hidden'); // Hide mobile close button

    } else {
        // Mobile view: chat as bubble/panel
        elements.stickyChatbotWrapper.classList.add('hidden'); // Hide desktop wrapper
        elements.chatbotContainer.classList.remove('h-full'); 
        
        if (state.isChatPanelOpenMobile) {
            elements.chatBubble.classList.add('hidden');
            elements.chatbotContainer.classList.remove('hidden');
            elements.chatbotContainer.classList.add('fixed', 'bottom-5', 'right-5', 'chat-panel-mobile-fixed', 'lg:hidden');
            if (elements.chatPanelCloseButton) elements.chatPanelCloseButton.classList.remove('hidden');
        } else {
            elements.chatBubble.classList.remove('hidden');
            elements.chatbotContainer.classList.add('hidden');
            elements.chatbotContainer.classList.remove('fixed', 'bottom-5', 'right-5', 'chat-panel-mobile-fixed');
            if (elements.chatPanelCloseButton) elements.chatPanelCloseButton.classList.add('hidden');
        }
         // Hide chat if settings tab is active, regardless of bubble state
        if (state.activeTab === 'settings') {
            elements.chatbotContainer.classList.add('hidden');
            elements.chatBubble.classList.add('hidden'); // Also hide bubble on settings
        } else if (!state.isChatPanelOpenMobile) { // If not settings and panel not open, show bubble
             elements.chatBubble.classList.remove('hidden');
        }
    }
}


function handleTabClick(event) {
    const clickedButtonElement = event.target.closest('button');
    if (!clickedButtonElement) return;
    const clickedTabId = clickedButtonElement.id;
    
    if (!clickedTabId) return; // Should not happen if closest('button') found an id
    const clickedTab = clickedTabId.replace('-tab', '');

    const previousActiveTab = state.activeTab;

    [elements.localTabButton, elements.globalTabButton, elements.insightsTabButton, elements.settingsTabButton]
      .forEach(button => {
        if (!button) return;
        button.classList.remove('tab-underline-blue', 'text-blue-600', 'dark:text-blue-400');
        button.classList.add('text-gray-700', 'dark:text-gray-300', 'hover:text-black', 'dark:hover:text-white');
      });

    const desktopButton = document.getElementById(clickedTabId); 
    if (desktopButton) {
        desktopButton.classList.add('tab-underline-blue', 'text-blue-600', 'dark:text-blue-400');
        desktopButton.classList.remove('text-gray-700', 'dark:text-gray-300', 'hover:text-black', 'dark:hover:text-white');
    }
    
    const mobileNavButtons = [
        elements.mobileLocalTabButton, 
        elements.mobileGlobalTabButton, 
        elements.mobileInsightsTabButton, 
        elements.mobileSettingsTabButton
    ];
    mobileNavButtons.forEach(btn => {
      if (btn) {
        btn.classList.remove('active-mobile-tab', 'dark:bg-gray-700', 'bg-indigo-100', 'text-indigo-800', 'dark:text-indigo-300');
        if (btn.dataset.targetTab === clickedTabId) {
          btn.classList.add('active-mobile-tab');
           if (document.documentElement.classList.contains('dark')) {
            btn.classList.add('dark:bg-gray-700', 'dark:text-indigo-300');
          } else {
            btn.classList.add('bg-indigo-100', 'text-indigo-800');
          }
        }
      }
    });

    state.activeTab = clickedTab;

    // Chat visibility logic based on tab and screen size
    if (clickedTab === 'settings') {
        if (state.isChatPanelOpenMobile) closeChatPanelMobile();
        elements.chatbotContainer.classList.add('hidden');
        elements.chatBubble.classList.add('hidden'); // Hide bubble too on settings
    } else {
        handleResize(); // Re-evaluate chat display based on screen size for non-settings tabs
    }
    
    if (previousActiveTab !== state.activeTab) {
        state.searchTerm = ''; 
        if (elements.searchInput) elements.searchInput.value = '';
        state.error = null; 
        if(elements.newsErrorDisplay) elements.newsErrorDisplay.style.display = 'none';
    }

    if(elements.localNewsSection) elements.localNewsSection.style.display = 'none';
    if(elements.globalNewsSection) elements.globalNewsSection.style.display = 'none';
    if(elements.insightsContentSection) elements.insightsContentSection.style.display = 'none'; 
    if(elements.settingsSection) elements.settingsSection.style.display = 'none';
    
    if(elements.loadMoreLocalButton) elements.loadMoreLocalButton.style.display = 'none';
    if(elements.loadMoreGlobalButton) elements.loadMoreGlobalButton.style.display = 'none';

    if (state.activeTab === 'local') {
        if(elements.mainSectionTitle) elements.mainSectionTitle.textContent = 'Local Economic News';
        if(elements.localNewsSection) elements.localNewsSection.style.display = 'block';
        if (state.localNews.length === 0 || previousActiveTab !== 'local' || state.error) {
            fetchNews('local', false); 
        } else { applyNewsFilter(false); }
    } else if (state.activeTab === 'global') {
        if(elements.mainSectionTitle) elements.mainSectionTitle.textContent = 'Global Economic News';
        if(elements.globalNewsSection) elements.globalNewsSection.style.display = 'block';
        if (state.globalNews.length === 0 || previousActiveTab !== 'global' || state.error) {
            fetchNews('global', false);
        } else { applyNewsFilter(false); }
    } else if (state.activeTab === 'insights') { 
        if(elements.mainSectionTitle) elements.mainSectionTitle.textContent = 'Company & Product Insights';
        if(elements.insightsContentSection) elements.insightsContentSection.style.display = 'block';
    } else if (state.activeTab === 'settings') {
        if(elements.mainSectionTitle) elements.mainSectionTitle.textContent = 'Application Settings';
        if(elements.settingsSection) elements.settingsSection.style.display = 'block';
        fetchDetectedCountry(); 
    }
}

function handleChatInputKeypress(event) { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendMessage(); } }
function handleSearchInput(event) { state.searchTerm = event.target.value; applyNewsFilter(false); } 
function handleLoadMore(type) { if (state.isLoadingMore) return; fetchNews(type, true); }

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    getElementReferences();
    loadSettings(); 

    // Ensure correct nav visibility on load
    if (elements.desktopNavContainer) {
        if (window.innerWidth >= 768) { // md breakpoint
            elements.desktopNavContainer.classList.remove('hidden');
            elements.desktopNavContainer.classList.add('md:flex');
            if (elements.mobileMenu) elements.mobileMenu.classList.add('hidden');
            if (elements.hamburgerIcon) elements.hamburgerIcon.classList.remove('hidden');
            if (elements.closeIcon) elements.closeIcon.classList.add('hidden');
            if (elements.mobileMenuButton) elements.mobileMenuButton.setAttribute('aria-expanded', 'false');
        } else {
            elements.desktopNavContainer.classList.add('hidden');
        }
    }


    if(elements.newsLoadingIndicator) elements.newsLoadingIndicator.style.display = 'none';
    if(elements.newsErrorDisplay) elements.newsErrorDisplay.style.display = 'none';
    if(elements.chatErrorDisplay) elements.chatErrorDisplay.style.display = 'none';
    
    if(elements.globalNewsSection) elements.globalNewsSection.style.display = 'none';
    if(elements.insightsContentSection) elements.insightsContentSection.style.display = 'none'; 
    if(elements.settingsSection) elements.settingsSection.style.display = 'none';
    if(elements.localNewsSection) elements.localNewsSection.style.display = 'block'; 
    
    if(elements.loadMoreLocalButton) elements.loadMoreLocalButton.style.display = 'none';
    if(elements.loadMoreGlobalButton) elements.loadMoreGlobalButton.style.display = 'none';

    if(elements.localTabButton) elements.localTabButton.addEventListener('click', handleTabClick);
    if(elements.globalTabButton) elements.globalTabButton.addEventListener('click', handleTabClick);
    if(elements.insightsTabButton) elements.insightsTabButton.addEventListener('click', handleTabClick); 
    if(elements.settingsTabButton) elements.settingsTabButton.addEventListener('click', handleTabClick);
    if(elements.loginButton) elements.loginButton.addEventListener('click', () => { console.log("Desktop login clicked"); });
    
    if(elements.chatSendButton) elements.chatSendButton.addEventListener('click', sendMessage);
    if(elements.chatInput) elements.chatInput.addEventListener('keypress', handleChatInputKeypress);
    
    if (elements.searchInput) elements.searchInput.addEventListener('input', handleSearchInput);
    
    if (elements.loadMoreLocalButton) elements.loadMoreLocalButton.addEventListener('click', () => handleLoadMore('local'));
    if (elements.loadMoreGlobalButton) elements.loadMoreGlobalButton.addEventListener('click', () => handleLoadMore('global'));
    
    if (elements.themeToggleButton) elements.themeToggleButton.addEventListener('click', saveThemeSetting);
    if (elements.countryOverrideSelect) elements.countryOverrideSelect.addEventListener('change', (event) => saveCountryOverride(event.target.value));
    if (elements.saveGlobalKeywordsButton) elements.saveGlobalKeywordsButton.addEventListener('click', saveGlobalKeywords);
    if (elements.resetSettingsButton) elements.resetSettingsButton.addEventListener('click', resetAllSettings);
    
    if (elements.saveModalAsPngButton) elements.saveModalAsPngButton.addEventListener('click', handleSaveModalAsPng);
    if (elements.fullArticleButton) elements.fullArticleButton.addEventListener('click', handleFullArticleClick);

    if (elements.mobileMenuButton) elements.mobileMenuButton.addEventListener('click', toggleMobileMenu);
    if (elements.mobileLocalTabButton) elements.mobileLocalTabButton.addEventListener('click', handleMobileTabClick);
    if (elements.mobileGlobalTabButton) elements.mobileGlobalTabButton.addEventListener('click', handleMobileTabClick);
    if (elements.mobileInsightsTabButton) elements.mobileInsightsTabButton.addEventListener('click', handleMobileTabClick);
    if (elements.mobileSettingsTabButton) elements.mobileSettingsTabButton.addEventListener('click', handleMobileTabClick);
    if (elements.mobileLoginButton) {
        elements.mobileLoginButton.addEventListener('click', () => {
            console.log("Mobile login clicked"); 
            if (elements.loginButton) {
                 const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });
                 elements.loginButton.dispatchEvent(clickEvent); 
            }
            if (elements.mobileMenu && !elements.mobileMenu.classList.contains('hidden')) {
                toggleMobileMenu();
            }
        });
    }

    // Chat Bubble/Panel Listeners
    if (elements.chatBubble) elements.chatBubble.addEventListener('click', openChatPanelMobile);
    if (elements.chatPanelCloseButton) elements.chatPanelCloseButton.addEventListener('click', closeChatPanelMobile);
    
    window.addEventListener('resize', handleResize);
    handleResize(); // Initial call to set up chat display

    fetchNews(state.activeTab, false); 
    state.chatMessages.push({ id: generateUniqueId(), text: 'Hello! Ask me anything about economics or the news.', isBot: true });
    renderChatMessages();

    const modalBackdropElement = elements.modalBackdrop;
    if (modalBackdropElement) {
        modalBackdropElement.addEventListener('click', (event) => {
            if (event.target === modalBackdropElement) closeModal();
        });
    }
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            if (elements.modalBackdrop && !elements.modalBackdrop.classList.contains('hidden')) {
                closeModal();
            }
            if (state.isChatPanelOpenMobile) { // Also close chat panel on Esc
                closeChatPanelMobile();
            }
        }
    });
    
    if (state.activeTab === 'local' && elements.mobileLocalTabButton) {
        elements.mobileLocalTabButton.classList.add('active-mobile-tab');
        if (document.documentElement.classList.contains('dark')) {
            elements.mobileLocalTabButton.classList.add('dark:bg-gray-700', 'dark:text-indigo-300');
        } else {
            elements.mobileLocalTabButton.classList.add('bg-indigo-100', 'text-indigo-800');
        }
    }
    console.log('Youth Economy Navigator - Main Dashboard Initialized!');
});
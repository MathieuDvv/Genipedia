/**
 * Search-related functionality
 */

import { searchBar, languageSelect, writingStyleSelect, articleContainer, historyToggle, historyContent, historyList } from './dom.js';
import { updateUIState } from './dom.js';
import { generateArticle, renderArticle, getLanguageName, generatePrompt } from './article.js';
import { getLocaleString, setLocale } from './locales-module.js';
import { preloadImage } from './utils.js';

// Search history
export let searchHistory = [];
export const MAX_SEARCH_HISTORY = 10;

// Track current search request
let currentSearchId = 0;

/**
 * Handles the search button click
 */
export async function handleSearch() {
    console.log('Handle search called');
    
    // Get the search query
    const query = searchBar.value.trim();
    if (!query) {
        console.log('Empty query, search aborted');
        return;
    }
    
    // Check if rateLimiter exists and check rate limit
    if (window.AIPediaUtils && window.AIPediaUtils.rateLimiter && typeof window.AIPediaUtils.rateLimiter.checkLimit === 'function') {
        if (!window.AIPediaUtils.rateLimiter.checkLimit()) {
            const timeRemaining = window.AIPediaUtils.rateLimiter.getTimeRemaining();
            alert(`Too many searches. Please wait ${timeRemaining} seconds before trying again.`);
            console.log(`Rate limit exceeded. Need to wait ${timeRemaining} seconds.`);
            return;
        }
    } else {
        console.warn('Rate limiter not available, skipping rate limit check');
    }
    
    // Get the selected language and writing style
    const language = languageSelect ? languageSelect.value : 'en';
    const writingStyle = writingStyleSelect ? writingStyleSelect.value : 'normal';
    
    // Clear previous article context (only for manual searches, not wiki link clicks)
    // This ensures that related searches only work when clicking links within articles
    window.currentArticleData = null;
    console.log('Cleared previous article context for new manual search');
    
    // Set search state
    document.body.classList.add('search-state');
    
    // Call performSearch function
    await performSearch(query, language, writingStyle);
}

/**
 * Performs a search with the given query
 * @param {string} query - The search query
 * @param {string} language - The language code
 * @param {string} writingStyle - The writing style
 */
export async function performSearch(query, language, writingStyle) {
    // Generate a unique ID for this search request
    const searchId = ++currentSearchId;
    
    console.log(`Search initiated (ID: ${searchId}): "${query}"`);
    
    if (!query) {
        console.log('Empty query, search aborted');
        return;
    }
    
    // Update URL with search parameters for sharing
    updateURLParameters(query, language, writingStyle);
    
    // Clear TOC and Geek metrics containers
    const tocContainer = document.getElementById('toc-container');
    const geekMetricsContainer = document.getElementById('geek-metrics-container');
    if (tocContainer) tocContainer.innerHTML = '';
    if (geekMetricsContainer) geekMetricsContainer.innerHTML = '';
    
    // Show loading state
    const loadingElement = document.createElement('div');
    loadingElement.className = 'loading';
    const estimatedTime = estimateWaitTime(query)*2;
    loadingElement.innerHTML = `
        <div class="loading-spinner"></div>
        <div class="estimated-time">${getLocaleString('estimated_time', estimatedTime)}</div>
        <div class="progress-bar">
            <div class="progress-fill"></div>
        </div>
        <div class="progress-steps"></div>
    `;
    
    articleContainer.innerHTML = '';
    articleContainer.appendChild(loadingElement);
    articleContainer.classList.remove('hidden');
    console.log('Loading state displayed');
    
    // Start the progress bar animation
    setTimeout(() => {
        const progressFill = loadingElement.querySelector('.progress-fill');
        if (progressFill) {
            progressFill.style.width = '100%';
            progressFill.style.transition = `width ${estimatedTime}s linear`;
        }
    }, 100);
    
    // Update UI state
    updateUIState();
    console.log('UI state updated');
    
    // Scroll to top
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
    
    // Start performance tracking
    window.startTime = performance.now();
    console.log('Performance tracking started');
    
    // Function to add progress step
    const addProgressStep = (message, timeElapsed = null) => {
        const progressSteps = loadingElement.querySelector('.progress-steps');
        if (progressSteps) {
            const stepElement = document.createElement('div');
            stepElement.className = 'progress-step';
            
            // Create message span
            const messageSpan = document.createElement('span');
            messageSpan.className = 'step-message';
            messageSpan.textContent = message;
            
            // Create time span if time is provided
            const timeSpan = document.createElement('span');
            timeSpan.className = 'step-time';
            if (timeElapsed !== null) {
                timeSpan.textContent = `${timeElapsed}s`;
            }
            
            // Add elements to step
            stepElement.appendChild(messageSpan);
            stepElement.appendChild(timeSpan);
            
            // Add to container with a slight delay for animation effect
            setTimeout(() => {
                progressSteps.appendChild(stepElement);
                
                // Force a reflow to ensure the animation triggers
                void stepElement.offsetWidth;
                
                // Add the visible class to trigger animation
                stepElement.classList.add('visible');
                
                // Scroll to the bottom of the progress steps
                progressSteps.scrollTop = progressSteps.scrollHeight;
            }, 100);
        }
    };
    
    // Add initial step
    addProgressStep('Generating prompt');
    
    try {
        // Set the locale based on the selected language
        setLocale(language);
        
        // Save search to history
        saveSearchToHistory(query, language, writingStyle);
        console.log('Search saved to history');
        
        // Generate prompt
        const promptStartTime = performance.now();
        const prompt = generatePrompt(query, language, writingStyle);
        const promptEndTime = performance.now();
        const promptTime = ((promptEndTime - promptStartTime) / 1000).toFixed(1);
        addProgressStep('Prompt generated', promptTime);
        
        // Check if we have a cached article
        const cachedArticle = window.AIPediaUtils.getCachedArticle(query, writingStyle);
        let articleData;
        
        if (cachedArticle) {
            console.log('Using cached article for:', query, 'with style:', writingStyle);
            articleData = cachedArticle;
            
            // Update metrics to indicate it was from cache
            if (!articleData.metrics) {
                articleData.metrics = {};
            }
            articleData.metrics.fromCache = true;
            
            // Calculate and add retrieval time
            const retrievalTime = ((performance.now() - window.startTime) / 1000).toFixed(1);
            addProgressStep('Article retrieved from cache', retrievalTime);
            
            // Render the cached article
            renderArticle(articleData);
            
            // Calculate and add total loading time
            const totalLoadingTime = ((performance.now() - window.startTime) / 1000).toFixed(1);
            addProgressStep('Total loading time', totalLoadingTime);
            articleData.metrics.totalLoadingTime = totalLoadingTime;
            
            return;
        }
        
        // No cached article, generate a new one
        // Add API request step
        addProgressStep('Waiting for DeepSeek response');
        const apiStartTime = performance.now();
        
        // Optimization: Start image fetching in parallel with article generation
        // Create a promise for image fetching
        const imagePromise = (async () => {
            try {
                addProgressStep('Fetching image for topic (in parallel)');
                const imageStartTime = performance.now();
                const imageData = await fetchImageForTopic(query);
                const imageEndTime = performance.now();
                const imageTime = ((imageEndTime - imageStartTime) / 1000).toFixed(1);
                return { 
                    imageData, 
                    imageTime,
                    success: true
                };
            } catch (error) {
                console.error('Error fetching image:', error);
                return { 
                    success: false,
                    error
                };
            }
        })();
        
        // Generate article
        console.log('Generating article...');
        articleData = await generateArticle(query, language, writingStyle);
        
        // API response timing
        const apiEndTime = performance.now();
        const apiTime = ((apiEndTime - apiStartTime) / 1000).toFixed(1);
        addProgressStep('DeepSeek response received', apiTime);
        
        // Check if this is still the most recent search
        if (searchId !== currentSearchId) {
            console.log(`Search ${searchId} was superseded by a newer search, aborting rendering`);
            return;
        }
        
        console.log('Article generated:', articleData);
        
        // Add parsing step
        addProgressStep('Parsing article content');
        const parsingStartTime = performance.now();
        
        // End performance tracking
        window.endTime = performance.now();
        const timeElapsed = ((window.endTime - window.startTime) / 1000).toFixed(2);
        console.log(`Generation time: ${timeElapsed} seconds`);
        
        // Update article data with performance metrics
        articleData.metrics = {
            timeElapsed: timeElapsed,
            tokenCount: window.tokenCount || 0,
            estimatedCost: window.estimatedCost || '0.0000',
            fromCache: false
        };
        
        // Store writing style in article data for cache differentiation
        articleData.writingStyle = writingStyle;
        
        // Store current article data
        window.currentArticleData = articleData;
        window.currentLanguage = language;
        
        // Parsing timing
        const parsingEndTime = performance.now();
        const parsingTime = ((parsingEndTime - parsingStartTime) / 1000).toFixed(1);
        addProgressStep('Article content parsed', parsingTime);
        
        // Wait for image fetching to complete
        const imageResult = await imagePromise;
        
            // Check if this is still the most recent search
            if (searchId !== currentSearchId) {
            console.log(`Search ${searchId} was superseded by a newer search, aborting rendering`);
                return;
            }
            
        // Process image result
        if (imageResult.success && imageResult.imageData) {
            addProgressStep('Image fetched (in parallel)', imageResult.imageTime);
            
            if (imageResult.imageData.imageUrl) {
                articleData.imageUrl = imageResult.imageData.imageUrl;
                articleData.imageSource = imageResult.imageData.sourceUrl;
                articleData.imageTitle = imageResult.imageData.title;
                console.log('Image added to article data');
            }
        } else {
            addProgressStep('Image fetch skipped');
            console.log('No image added to article');
        }
        
        // Cache the article
        window.AIPediaUtils.cacheArticle(query, articleData);
        
        // Add rendering step
        addProgressStep('Rendering article');
        const renderStartTime = performance.now();
        
        // Render article
        console.log('Rendering article...');
        renderArticle(articleData);
        console.log('Article rendered');
        
        // Rendering timing
        const renderEndTime = performance.now();
        const renderTime = ((renderEndTime - renderStartTime) / 1000).toFixed(1);
        addProgressStep('Article rendered', renderTime);
        
        // Calculate and add total loading time
        const totalLoadingTime = ((renderEndTime - window.startTime) / 1000).toFixed(1);
        addProgressStep('Total loading time', totalLoadingTime);
        
        // Add total loading time to the article metrics for geek metrics display
        articleData.metrics.totalLoadingTime = totalLoadingTime;
        
    } catch (error) {
        // Check if this is still the most recent search
        if (searchId !== currentSearchId) {
            console.log(`Search ${searchId} was superseded by a newer search, aborting error display`);
            return;
        }
        
        console.error('Error in search process:', error);
        
        // Show error message
        const errorElement = document.createElement('div');
        errorElement.className = 'error';
        errorElement.innerHTML = `
            <h2>${getLocaleString('error_title')}</h2>
            <p>${getLocaleString('error_message')}</p>
            <div class="error-details">
                <p>${error.message || 'Unknown error'}</p>
            </div>
        `;
        
        articleContainer.innerHTML = '';
        articleContainer.appendChild(errorElement);
    }
}

/**
 * Updates the URL with search parameters without reloading the page
 * @param {string} query - The search query
 * @param {string} language - The language code
 * @param {string} writingStyle - The writing style
 */
function updateURLParameters(query, language, writingStyle) {
    if (!query) return;
    
    // Create URL parameters
    const params = new URLSearchParams();
    params.set('q', encodeURIComponent(query));
    params.set('lang', language);
    params.set('style', writingStyle);
    
    // Update URL without reloading the page
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.pushState({ path: newUrl }, '', newUrl);
}

/**
 * Loads search parameters from URL if present
 * This should be called during initialization
 */
export function loadFromURLParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Check if we have search parameters
    if (urlParams.has('q')) {
        const query = decodeURIComponent(urlParams.get('q'));
        const language = urlParams.get('lang') || 'en';
        const writingStyle = urlParams.get('style') || 'normal';
        
        // Set the UI controls to match URL parameters
        searchBar.value = query;
        
        if (languageSelect) {
            languageSelect.value = language;
            // Trigger change event to update the UI
            const event = new Event('change');
            languageSelect.dispatchEvent(event);
        }
        
        if (writingStyleSelect) {
            writingStyleSelect.value = writingStyle;
        }
        
        // Perform the search with a slight delay to ensure the UI is updated
        setTimeout(() => {
            performSearch(query, language, writingStyle);
        }, 100);
    }
}

/**
 * Saves a search query to history
 * @param {string} query - The search query
 * @param {string} language - The language code
 * @param {string} writingStyle - The writing style
 */
export function saveSearchToHistory(query, language, writingStyle) {
    // Use parameters if provided, otherwise get from select elements
    const lang = language || languageSelect.value;
    const style = writingStyle || writingStyleSelect.value;
    
    // Convert age-based writing styles to "normal" for history display
    const displayStyle = style.startsWith('age-') ? 'normal' : style;
    
    // Remove the query if it already exists in history
    searchHistory = searchHistory.filter(item => item.query !== query);
    
    // Add the new query to the beginning of the array with language and writing style
    searchHistory.unshift({
        query: query,
        timestamp: new Date().toISOString(),
        language: lang,
        writingStyle: displayStyle
    });
    
    // Limit the history to MAX_SEARCH_HISTORY items
    if (searchHistory.length > MAX_SEARCH_HISTORY) {
        searchHistory.pop();
    }
    
    // Save to localStorage
    localStorage.setItem('searchHistory', JSON.stringify(searchHistory));
    
    // Update the UI
    updateHistoryList(searchHistory);
}

/**
 * Loads search history from localStorage
 */
export function loadSearchHistory() {
    const savedHistory = localStorage.getItem('searchHistory');
    
    if (savedHistory) {
        searchHistory = JSON.parse(savedHistory);
        updateHistoryList(searchHistory);
    }
    
    // Initialize history toggle
    initHistoryToggle();
}

/**
 * Toggles the history section
 */
export function toggleHistory() {
    if (historyToggle.classList.contains('expanded')) {
        historyToggle.classList.remove('expanded');
        historyContent.classList.remove('expanded');
    } else {
        historyToggle.classList.add('expanded');
        historyContent.classList.add('expanded');
    }
}

/**
 * Initializes the history toggle
 */
export function initHistoryToggle() {
    // Add click event to toggle history
    historyToggle.addEventListener('click', toggleHistory);
    
    // Initialize Lucide icons for the arrow
    if (window.lucide) {
        window.lucide.createIcons();
    }
}

/**
 * Updates the history list with search items
 * @param {Array} list - The search history list
 */
export function updateHistoryList(list) {
    if (!historyList) return;
    
    // Clear the list
    historyList.innerHTML = '';
    
    if (list.length === 0) {
        // Show a message if there's no history
        const emptyItem = document.createElement('li');
        emptyItem.className = 'history-item';
        emptyItem.textContent = 'No search history yet';
        historyList.appendChild(emptyItem);
        return;
    }
    
    // Add each history item to the list
    list.forEach((item, index) => {
        const listItem = document.createElement('li');
        listItem.className = 'history-item';
        listItem.style.display = 'flex';
        listItem.style.justifyContent = 'space-between';
        listItem.style.alignItems = 'center';
        
        const link = document.createElement('a');
        link.className = 'history-item-link';
        link.style.flex = '1';
        
        // Show language and writing style if available
        let displayText = item.query;
        if (item.language && item.writingStyle) {
            const languageName = getLanguageName(item.language);
            const styleDisplay = item.writingStyle.charAt(0).toUpperCase() + item.writingStyle.slice(1);
            displayText = `${item.query} (${styleDisplay} style in ${languageName})`;
        }
        
        link.textContent = displayText;
        link.href = '#';
        link.addEventListener('click', (e) => {
            e.preventDefault();
            searchBar.value = item.query;
            
            // Set language and writing style if available
            if (item.language) {
                languageSelect.value = item.language;
            }
            if (item.writingStyle) {
                writingStyleSelect.value = item.writingStyle;
            }
            
            handleSearch();
            toggleHistory();
        });
        
        // Create delete button
        const deleteButton = document.createElement('button');
        deleteButton.className = 'history-delete-button';
        deleteButton.innerHTML = '<i data-lucide="x"></i>';
        deleteButton.style.background = 'none';
        deleteButton.style.border = 'none';
        deleteButton.style.cursor = 'pointer';
        deleteButton.style.padding = '5px';
        deleteButton.style.color = 'var(--text-color)';
        deleteButton.style.opacity = '0.7';
        deleteButton.title = 'Delete from history';
        
        deleteButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Remove the item from history
            searchHistory.splice(index, 1);
            
            // Save to localStorage
            localStorage.setItem('searchHistory', JSON.stringify(searchHistory));
            
            // Update the UI
            updateHistoryList(searchHistory);
        });
        
        // Add hover effect
        deleteButton.addEventListener('mouseenter', () => {
            deleteButton.style.opacity = '1';
        });
        
        deleteButton.addEventListener('mouseleave', () => {
            deleteButton.style.opacity = '0.7';
        });
        
        listItem.appendChild(link);
        listItem.appendChild(deleteButton);
        historyList.appendChild(listItem);
    });
    
    // Initialize Lucide icons
    if (window.lucide) {
        window.lucide.createIcons();
    }
}

/**
 * Estimates the wait time for a search query
 * @param {string} query - The search query
 * @returns {number} - The estimated wait time in seconds
 */
export function estimateWaitTime(query) {
    // Base time of 15 seconds (reduced from 30)
    let baseTime = 15;
    
    // Add 1 second for every 10 characters in the query (reduced from 2)
    let queryTime = Math.floor(query.length / 10);
    
    // Adjust based on network conditions
    // Use navigator.connection if available to adjust for network speed
    let networkMultiplier = 1;
    if (navigator.connection) {
        const connection = navigator.connection;
        if (connection.effectiveType === '4g') {
            networkMultiplier = 1;
        } else if (connection.effectiveType === '3g') {
            networkMultiplier = 1.25; // Reduced from 1.5
        } else if (connection.effectiveType === '2g') {
            networkMultiplier = 1.5; // Reduced from 2
        } else if (connection.effectiveType === 'slow-2g') {
            networkMultiplier = 1.75; // Reduced from 2.5
        }
    }
    
    // Calculate total time with network adjustment
    const totalTime = (baseTime + queryTime) * networkMultiplier;
    
    // Return the estimated time, ensuring it's at least 10 seconds (reduced from 20)
    return Math.max(10, Math.round(totalTime));
}

/**
 * Fetches an image for the given topic
 * Uses AI to suggest a better search term if AI suggestion is enabled
 * @param {string} topic - The topic to fetch an image for
 * @returns {Promise<Object>} - The image data
 */
async function fetchImageForTopic(topic) {
    try {
        const useAiSuggestion = document.getElementById('image-suggestion-toggle')?.checked || false;
        let searchTerm = topic;
        let usedFallbackTerm = null;
        
        // If AI suggestion is enabled, get a suggested search term
        if (useAiSuggestion) {
            console.log('AI image suggestion enabled');
            searchTerm = await suggestImageSearchTerm(topic);
            console.log('Using AI suggested search term:', searchTerm);
        }

        // Try to fetch an image with the suggested term
        let imageResult = await fetchUnsplashImage(searchTerm);
        
        // If V2 is enabled and we have fallback terms, try them if the primary search failed
        if (useAiSuggestion && window.suggestedImageTerms && window.suggestedImageTerms.length > 1) {
            const versionSelect = document.getElementById('image-suggestion-version-select');
            const useV2 = versionSelect && versionSelect.value === 'v2';
            
            if (useV2 && (!imageResult || !imageResult.success)) {
                console.log('Primary search term failed, trying fallback terms');
                
                // Try each fallback term until we find a working one
                for (let i = 1; i < window.suggestedImageTerms.length; i++) {
                    const fallbackTerm = window.suggestedImageTerms[i];
                    console.log(`Trying fallback term ${i}: ${fallbackTerm}`);
                    
                    const fallbackResult = await fetchUnsplashImage(fallbackTerm);
                    
                    if (fallbackResult && fallbackResult.success) {
                        imageResult = fallbackResult;
                        usedFallbackTerm = fallbackTerm;
                        console.log('Fallback term succeeded:', fallbackTerm);
                        break;
                    }
                }
            }
        }
        
        // If still no image found, try with a generic fallback
        if (!imageResult || !imageResult.success) {
            console.log('All search terms failed, using generic fallback');
            const fallbackTerm = topic.split(' ')[0];
            imageResult = await fetchUnsplashImage(fallbackTerm);
        }
        
        // Add information about the search term used
        if (imageResult && imageResult.success) {
            if (useAiSuggestion) {
                if (usedFallbackTerm) {
                    imageResult.searchTermInfo = `Used fallback term: ${usedFallbackTerm}`;
                } else {
                    imageResult.searchTermInfo = `Used AI suggested term: ${searchTerm}`;
                }
            } else {
                imageResult.searchTermInfo = `Used original term: ${topic}`;
            }
        }
        
        return imageResult;
    } catch (error) {
        console.error('Error fetching image for topic:', error);
        return { 
            success: false, 
            error: error.message
        };
    }
}

/**
 * V2: Enhanced version of image search term suggestion with multilingual support
 * Provides a primary English image search term and alternative terms
 * @param {string} query - The search query
 * @returns {Promise<{primary: string, alternates: string[]}>} The suggested image search term
 */
async function suggestImageSearchTermV2(query) {
    try {
        console.log('[V2] Suggesting image search term for:', query);
        
        // Get the current language
        const currentLanguage = getCurrentLanguage();
        console.log('[V2] Current language:', currentLanguage);
        
        // Prepare the prompt for the API
        // This prompt specifically addresses the issue with terms like "physique quantique"
        const messages = [
            {
                role: "system",
                content: `You are an AI assistant specialized in suggesting image search terms. 
                Your task is to analyze the user's query and provide:
                1. A primary image search term in English that will produce relevant images
                2. Two alternative search terms separated by pipes (|)
                
                If the input is not in English, translate it to English first for the primary term.
                Your output should be ONLY the suggested terms in this format:
                PRIMARY_TERM|ALTERNATIVE_1|ALTERNATIVE_2
                
                EXAMPLES:
                For "physique quantique" → "quantum physics|quantum mechanics|theoretical physics"
                For "Evangelion" → "Neon Genesis Evangelion anime|Eva Unit 01|Shinji and Asuka"
                For "star trek" → "Star Trek Enterprise|Captain Kirk|Star Trek characters"
                
                Important: Focus on the ACTUAL meaning of the term, not literal translations or ambiguous words!
                A term like "physique quantique" refers to quantum physics, NOT muscular physique.`
            },
            {
                role: "user",
                content: query
            }
        ];
        
        // Make the API request using the server proxy
        const response = await fetch('https://genipedia.vercel.app/api/deepseek', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "deepseek-chat",
                messages: messages,
                temperature: 0.3, // Lower temperature for more consistent results
                max_tokens: 150
            })
        });
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        const suggestion = data.choices[0].message.content.trim();
        console.log('[V2] Raw API suggestion:', suggestion);
        
        // Split the response into primary and alternative terms
        const terms = suggestion.split('|');
        
        if (!terms || terms.length < 1) {
            console.warn('[V2] Invalid API response format, falling back to original query');
            return { 
                primary: query, 
                alternates: [] 
            };
        }
        
        const result = {
            primary: terms[0].trim(),
            alternates: terms.slice(1).map(term => term.trim()).filter(term => term)
        };
        
        console.log('[V2] Parsed suggestion:', result);
        return result;
    } catch (error) {
        console.error('[V2] Error suggesting image search term:', error);
        return { 
            primary: query, 
            alternates: [] 
        };
    }
}

/**
 * V1: Original version of image search term suggestion
 * @param {string} query - The search query
 * @returns {Promise<string>} The suggested image search term
 */
async function suggestImageSearchTermV1(query) {
    try {
        console.log('Suggesting image search term for:', query);
        
        const messages = [
            {
                role: "system", 
                content: "You are an AI assistant specialized in suggesting image search terms. Your task is to analyze the user's query and provide a suggested search term that would yield relevant image results. Respond with ONLY the suggested term."
            },
            {
                role: "user",
                content: query
            }
        ];
        
        const response = await fetch('/api/deepseek', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "deepseek-chat",
                messages: messages,
                temperature: 0.7,
                max_tokens: 100
            })
        });
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        const suggestion = data.choices[0].message.content.trim();
        console.log('API suggestion:', suggestion);
        
        if (!suggestion) {
            console.warn('Empty API response, falling back to original query');
            return query;
        }
        
        return suggestion;
    } catch (error) {
        console.error('Error suggesting image search term:', error);
        return query;
    }
}

/**
 * Main function to suggest image search terms, using either V1 or V2 depending on user selection
 * @param {string} query - The search query
 * @returns {Promise<string>} The suggested image search term
 */
async function suggestImageSearchTerm(query) {
    // Check which version is selected
    const versionSelect = document.getElementById('image-suggestion-version-select');
    const useV2 = versionSelect && versionSelect.value === 'v2';
    
    console.log(`Using image suggestion version: ${useV2 ? 'V2' : 'V1'}`);
    
    try {
        if (useV2) {
            // Use V2 with enhanced multilingual support
            const result = await suggestImageSearchTermV2(query);
            
            // Store suggested terms for potential fallback use
            window.suggestedImageTerms = [result.primary, ...result.alternates];
            
            return result.primary;
        } else {
            // Use original V1 implementation
            const result = await suggestImageSearchTermV1(query);
            
            // Still store the result for fallback
            window.suggestedImageTerms = [result];
            
            return result;
        }
    } catch (error) {
        console.error('Error in suggestImageSearchTerm:', error);
        window.suggestedImageTerms = [query];
        return query;
    }
}

/**
 * Fetches an image for a topic
 * @param {string} query - The search query
 * @returns {Promise<Object>} - The image data object with imageUrl, sourceUrl, and title
 */
export async function fetchUnsplashImage(query) {
    console.log('Fetching image for topic:', query);
    
    try {
        // Check cache for image search results
        const cachedImage = window.AIPediaUtils.getCachedImage(query);
        
        if (cachedImage) {
            return cachedImage;
        }
        
        // Try Unsplash API through our proxy endpoint
        console.log('Fetching from Unsplash API via proxy');
        const response = await fetch(`https://genipedia.vercel.app/api/unsplash/photos/random?query=${encodeURIComponent(query)}`, {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            console.warn(`Unsplash API request failed with status ${response.status}`);
            return null;
        }
        
        const data = await response.json();
        console.log('Image found on Unsplash:', data.urls.regular);
        
        const imageData = {
            imageUrl: data.urls.regular,
            sourceUrl: data.links.html,
            title: `Image by ${data.user.name} on Unsplash`
        };
        
        // Cache the image data
        window.AIPediaUtils.cacheImage(query, imageData);
        
        return imageData;
    } catch (error) {
        console.error('Error fetching image:', error);
        return null;
    }
}

/**
 * Gets the current language from the language selector
 * @returns {string} - The current language code
 */
function getCurrentLanguage() {
    const languageSelect = document.getElementById('language-select');
    return languageSelect ? languageSelect.value : 'en';
}
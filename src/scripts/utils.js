/**
 * Utility functions for AIPedia
 */

// Helper function to escape HTML
function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Helper function to get language name from code
function getLanguageName(code) {
    const languages = {
        'en': 'English',
        'fr': 'French',
        'es': 'Spanish',
        'de': 'German',
        'ja': 'Japanese'
    };
    return languages[code] || 'English';
}

/**
 * Debounces a function
 * @param {Function} func - The function to debounce
 * @param {number} wait - The wait time in milliseconds
 * @returns {Function} - The debounced function
 */
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

/**
 * Generates a unique ID
 * @param {string} [prefix='id'] - Optional prefix for the ID
 * @param {boolean} [useTimestamp=false] - Whether to include a timestamp in the ID
 * @returns {string} - A unique ID
 */
function generateId(prefix = 'id', useTimestamp = false) {
    const randomPart = Math.random().toString(36).substring(2, 9);
    if (useTimestamp) {
        const timestampPart = Date.now().toString(36);
        return prefix ? `${prefix}-${timestampPart}-${randomPart}` : `${timestampPart}-${randomPart}`;
    }
    return prefix ? `${prefix}-${randomPart}` : randomPart;
}

/**
 * Formats a date
 * @param {string|Date} date - The date to format
 * @param {string} [format='short'] - The format type ('short', 'medium', 'long')
 * @returns {string} - The formatted date
 */
function formatDate(date, format = 'short') {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    switch (format) {
        case 'short':
            return dateObj.toLocaleDateString();
        case 'medium':
            return dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString();
        case 'long':
            return dateObj.toLocaleDateString(undefined, {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        default:
            return dateObj.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
    }
}

// ElevenLabs API key management
const ELEVENLABS_API_KEY_STORAGE_KEY = 'elevenlabs_api_key';

// Save ElevenLabs API key to local storage
function saveElevenLabsApiKey(apiKey) {
    try {
        localStorage.setItem(ELEVENLABS_API_KEY_STORAGE_KEY, apiKey);
        return true;
    } catch (error) {
        console.error('Error saving ElevenLabs API key:', error);
        return false;
    }
}

// Get ElevenLabs API key from local storage or config
function getElevenLabsApiKey() {
    // First check if the beta feature is enabled
    const isElevenLabsBetaEnabled = document.getElementById('elevenlabs-toggle')?.checked || false;
    
    if (isElevenLabsBetaEnabled) {
        // If beta is enabled, try to get the key from local storage
        try {
            const apiKey = localStorage.getItem(ELEVENLABS_API_KEY_STORAGE_KEY);
            if (apiKey) {
                // For beta users, the API key comes from local storage and will be 
                // sent directly in the request headers to the proxy endpoint
                return apiKey;
            }
        } catch (error) {
            console.error('Error getting ElevenLabs API key from local storage:', error);
        }
    }
    
    // If beta is not enabled or no key in storage, return null
    // The server will use the API key from .env in this case
    return null;
}

// Validate ElevenLabs API key by making a test request
async function validateElevenLabsApiKey(apiKey) {
    try {
        // Use our proxy endpoint to validate the API key
        const response = await fetch('/api/elevenlabs/voices', {
            method: 'GET',
            headers: {
                'xi-api-key': apiKey
            }
        });
        
        return response.ok;
    } catch (error) {
        console.error('Error validating ElevenLabs API key:', error);
        return false;
    }
}

// Check if ElevenLabs beta feature is enabled
function isElevenLabsBetaEnabled() {
    return document.getElementById('elevenlabs-toggle')?.checked || false;
}

// Generate PDF from article content
function generatePDF(articleData) {
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    
    // Create the HTML content for the PDF
    const htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${escapeHTML(articleData.title)} - AIPedia</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #000;
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 20px;
                }
                h1 {
                    font-size: 24px;
                    margin-bottom: 20px;
                }
                .summary {
                    font-style: italic;
                    margin-bottom: 20px;
                }
                .article-image {
                    max-width: 100%;
                    height: auto;
                    margin-bottom: 10px;
                }
                .image-caption {
                    font-size: 12px;
                    color: #666;
                    text-align: center;
                    margin-bottom: 20px;
                }
                h2 {
                    font-size: 20px;
                    margin-top: 30px;
                    margin-bottom: 15px;
                    border-bottom: 1px solid #ddd;
                    padding-bottom: 5px;
                }
                .references {
                    margin-top: 30px;
                    border-top: 1px solid #ddd;
                    padding-top: 20px;
                }
                .references ol {
                    padding-left: 20px;
                }
                .references li {
                    margin-bottom: 5px;
                }
                .footer {
                    margin-top: 30px;
                    font-size: 12px;
                    color: #666;
                    text-align: center;
                }
            </style>
        </head>
        <body>
            <h1>${escapeHTML(articleData.title)}</h1>
            <div class="summary">${escapeHTML(articleData.summary)}</div>
            
            ${articleData.imageUrl ? `
                <img class="article-image" src="${articleData.imageUrl}" alt="${escapeHTML(articleData.title)}">
                ${articleData.imageSource && articleData.imageSource.includes('unsplash.com') ? `
                    <div class="image-caption">
                        ${articleData.imageTitle && articleData.imageTitle.includes('Image by ') ? `
                            Photo by ${articleData.imageTitle.replace('Image by ', '').replace(' on Unsplash', '')} on Unsplash
                        ` : `
                            Photo from Unsplash
                        `}
                    </div>
                ` : ''}
            ` : ''}
            
            ${articleData.sections.map(section => `
                <h2>${escapeHTML(section.heading || section.title)}</h2>
                <div>${section.content.replace(/class="wiki-link" data-term="[^"]*"/g, 'style="color: #000; text-decoration: underline;"')}</div>
            `).join('')}
            
            <div class="references">
                <h2>References</h2>
                <ol>
                    ${(articleData.references || []).map(reference => `
                        <li>${escapeHTML(reference)}</li>
                    `).join('')}
                </ol>
            </div>
            
            <div class="footer">
                <p>Generated by AIPedia on ${new Date().toLocaleDateString()}</p>
            </div>
        </body>
        </html>
    `;
    
    // Write the HTML content to the new window
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Wait for the content to load before printing
    printWindow.onload = function() {
        printWindow.print();
    };
}

// Download article as HTML file
function downloadHTML(articleData) {
    // Create the HTML content for download
    const htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${escapeHTML(articleData.title)} - AIPedia</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #000;
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 20px;
                }
                h1 {
                    font-size: 24px;
                    margin-bottom: 20px;
                }
                .summary {
                    font-style: italic;
                    margin-bottom: 20px;
                }
                .article-image {
                    max-width: 100%;
                    height: auto;
                    margin-bottom: 10px;
                }
                .image-caption {
                    font-size: 12px;
                    color: #666;
                    text-align: center;
                    margin-bottom: 20px;
                }
                .image-caption a {
                    color: #0066cc;
                    text-decoration: none;
                }
                .image-caption a:hover {
                    text-decoration: underline;
                }
                h2 {
                    font-size: 20px;
                    margin-top: 30px;
                    margin-bottom: 15px;
                    border-bottom: 1px solid #ddd;
                    padding-bottom: 5px;
                }
                .references {
                    margin-top: 30px;
                    border-top: 1px solid #ddd;
                    padding-top: 20px;
                }
                .references ol {
                    padding-left: 20px;
                }
                .references li {
                    margin-bottom: 5px;
                }
                .footer {
                    margin-top: 30px;
                    font-size: 12px;
                    color: #666;
                    text-align: center;
                }
            </style>
        </head>
        <body>
            <h1>${escapeHTML(articleData.title)}</h1>
            <div class="summary">${escapeHTML(articleData.summary)}</div>
            
            ${articleData.imageUrl ? `
                <img class="article-image" src="${articleData.imageUrl}" alt="${escapeHTML(articleData.title)}">
                ${articleData.imageSource && articleData.imageSource.includes('unsplash.com') ? `
                    <div class="image-caption">
                        ${articleData.imageTitle && articleData.imageTitle.includes('Image by ') ? `
                            Photo by <a href="${articleData.imageSource}" target="_blank" rel="noopener">
                                ${articleData.imageTitle.replace('Image by ', '').replace(' on Unsplash', '')}
                            </a> on 
                            <a href="https://unsplash.com/?utm_source=genipedia&utm_medium=referral" target="_blank" rel="noopener">Unsplash</a>
                        ` : `
                            Photo from <a href="https://unsplash.com/?utm_source=genipedia&utm_medium=referral" target="_blank" rel="noopener">Unsplash</a>
                        `}
                    </div>
                ` : ''}
            ` : ''}
            
            ${articleData.sections.map(section => `
                <h2>${escapeHTML(section.heading || section.title)}</h2>
                <div>${section.content}</div>
            `).join('')}
            
            <div class="references">
                <h2>References</h2>
                <ol>
                    ${(articleData.references || []).map(reference => `
                        <li>${escapeHTML(reference)}</li>
                    `).join('')}
                </ol>
            </div>
            
            <div class="footer">
                <p>Generated by AIPedia on ${new Date().toLocaleDateString()}</p>
            </div>
        </body>
        </html>
    `;
    
    // Create a Blob with the HTML content
    const blob = new Blob([htmlContent], { type: 'text/html' });
    
    // Create a download link
    const downloadLink = document.createElement('a');
    downloadLink.href = URL.createObjectURL(blob);
    downloadLink.download = `${articleData.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.html`;
    
    // Trigger the download
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
}

// Fetch image from Unsplash API
async function fetchImageFromUnsplash(query) {
    try {
        const cleanQuery = query.replace(/[^\w\s]/gi, '').trim();
        const url = `/api/unsplash/photos/random?query=${encodeURIComponent(cleanQuery)}`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Unsplash API request failed with status ${response.status}`);
        }
        
        const data = await response.json();
        
        return {
            success: true,
            imageUrl: data.urls.regular,
            sourceUrl: data.links.html,
            title: `Image by ${data.user.name} on Unsplash`
        };
    } catch (error) {
        console.error('Error fetching image from Unsplash:', error);
        return { success: false };
    }
}

/**
 * Formats audio time in MM:SS format
 * @param {number} seconds - The time in seconds
 * @returns {string} - The formatted time
 */
function formatAudioTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Preloads an image
 * @param {string} src - The image source
 * @returns {Promise<HTMLImageElement>} - The image element
 */
export function preloadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
        img.src = src;
    });
}

/**
 * Throttles a function
 * @param {Function} func - The function to throttle
 * @param {number} limit - The limit in milliseconds
 * @returns {Function} - The throttled function
 */
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Gets a random item from an array
 * @param {Array} array - The array
 * @returns {*} - A random item from the array
 */
function getRandomItem(array) {
    return array[Math.floor(Math.random() * array.length)];
}

/**
 * Shuffles an array
 * @param {Array} array - The array to shuffle
 * @returns {Array} - The shuffled array
 */
function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

/**
 * Truncates a string to a specified length
 * @param {string} str - The string to truncate
 * @param {number} length - The maximum length
 * @param {string} [suffix='...'] - The suffix to add
 * @returns {string} - The truncated string
 */
function truncateString(str, length, suffix = '...') {
    if (str.length <= length) {
        return str;
    }
    return str.substring(0, length) + suffix;
}

/**
 * Capitalizes the first letter of a string
 * @param {string} str - The string to capitalize
 * @returns {string} - The capitalized string
 */
function capitalizeFirstLetter(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Checks if an element is in viewport
 * @param {HTMLElement} element - The element to check
 * @returns {boolean} - Whether the element is in viewport
 */
function isInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

/**
 * Gets the scroll percentage of the page
 * @returns {number} - The scroll percentage (0-100)
 */
function getScrollPercentage() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    return (scrollTop / scrollHeight) * 100;
}

/**
 * Copies text to clipboard
 * @param {string} text - The text to copy
 * @returns {Promise<void>} - A promise that resolves when the text is copied
 */
function copyToClipboard(text) {
    return navigator.clipboard.writeText(text);
}

// Trigger Unsplash download event
async function triggerUnsplashDownload(sourceUrl) {
    if (!sourceUrl || !sourceUrl.includes('unsplash.com')) {
        return;
    }
    
    try {
        // Create a download URL from the source URL
        const downloadUrl = `${sourceUrl}/download`;
        
        // Make a HEAD request to trigger the download event
        await fetch(downloadUrl, { method: 'HEAD' });
        console.log('Unsplash download event triggered for:', sourceUrl);
    } catch (error) {
        console.error('Error triggering Unsplash download event:', error);
    }
}

/**
 * Handles the mobile layout by moving selectors to the appropriate container
 */
function handleMobileLayout() {
    const styleSelector = document.querySelector('.style-selector');
    const languageSelector = document.querySelector('.language-selector');
    const searchBarContainer = document.querySelector('.search-bar-container');
    const selectorsContainer = document.querySelector('.selectors-container');
    
    function updateLayout() {
        if (window.innerWidth <= 800) {
            // Mobile view
            if (styleSelector.parentNode === searchBarContainer) {
                selectorsContainer.appendChild(styleSelector);
                selectorsContainer.appendChild(languageSelector);
            }
        } else {
            // Desktop view
            if (styleSelector.parentNode === selectorsContainer) {
                // Insert style selector before the language selector in the search bar
                const searchButton = document.querySelector('#search-button');
                searchBarContainer.insertBefore(styleSelector, searchButton);
                searchBarContainer.insertBefore(languageSelector, searchButton);
            }
        }
    }
    
    // Initial layout
    updateLayout();
    
    // Update layout on resize
    window.addEventListener('resize', updateLayout);
}

// Call the function when the DOM is loaded
document.addEventListener('DOMContentLoaded', handleMobileLayout);

/**
 * Enhanced rate limiter to prevent spam and protect against abuse
 * @param {number} maxRequests - Maximum number of requests allowed per time window
 * @param {number} timeWindow - Time window in milliseconds
 * @returns {Object} - Rate limiter object with methods
 */
function createRateLimiter(maxRequests = 3, timeWindow = 60 * 1000) {
    const requests = [];
    const sessionStartTime = Date.now();
    let dailyRequestCount = 0;
    const MAX_DAILY_REQUESTS = 30; // Maximum requests per day
    const DAY_IN_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    
    // Load previous rate limit data from session storage if available
    try {
        const storedData = sessionStorage.getItem('rateLimitData');
        if (storedData) {
            const data = JSON.parse(storedData);
            // Only use stored data if it's from the same day
            if (Date.now() - data.sessionStartTime < DAY_IN_MS) {
                dailyRequestCount = data.dailyRequestCount || 0;
            }
        }
    } catch (e) {
        console.error('Failed to load rate limit data from session storage', e);
    }
    
    // Save rate limit data to session storage
    const saveToStorage = () => {
        try {
            const data = {
                sessionStartTime,
                dailyRequestCount,
                lastUpdated: Date.now()
            };
            sessionStorage.setItem('rateLimitData', JSON.stringify(data));
        } catch (e) {
            console.error('Failed to save rate limit data to session storage', e);
        }
    };
    
    return {
        /**
         * Checks if a new request is allowed based on rate limits
         * @returns {boolean} - Whether the request is allowed
         */
        checkLimit: function() {
            const now = Date.now();
            
            // Check daily limit
            if (dailyRequestCount >= MAX_DAILY_REQUESTS) {
                if (now - sessionStartTime > DAY_IN_MS) {
                    // Reset if a day has passed
                    dailyRequestCount = 0;
                } else {
                    return false; // Daily limit exceeded
                }
            }
            
            // Remove requests older than the time window
            const recentRequests = requests.filter(time => now - time < timeWindow);
            
            // Update the requests array
            requests.length = 0;
            requests.push(...recentRequests);
            
            // Check if we're under the limit
            if (requests.length < maxRequests) {
                // Add the current request
                requests.push(now);
                dailyRequestCount++;
                saveToStorage();
                return true;
            }
            
            return false;
        },
        
        /**
         * Gets the time remaining until the next request is allowed
         * @returns {number} - Time in seconds until next request is allowed
         */
        getTimeRemaining: function() {
            const now = Date.now();
            
            // Check if daily limit is reached
            if (dailyRequestCount >= MAX_DAILY_REQUESTS) {
                if (now - sessionStartTime > DAY_IN_MS) {
                    return 0; // A new day has started
                }
                // Return time until next day
                return Math.ceil((DAY_IN_MS - (now - sessionStartTime)) / 1000);
            }
            
            if (requests.length === 0) return 0;
            
            // If we have the max number of requests in the time window,
            // calculate time until the oldest request expires
            if (requests.length >= maxRequests) {
                const oldestRequest = Math.min(...requests);
                const timePassedSinceOldest = now - oldestRequest;
                
                if (timePassedSinceOldest >= timeWindow) return 0;
                
                return Math.ceil((timeWindow - timePassedSinceOldest) / 1000);
            }
            
            return 0;
        },
        
        /**
         * Resets the daily request counter
         */
        resetDailyCount: function() {
            dailyRequestCount = 0;
            saveToStorage();
        }
    };
}

// Create a global rate limiter instance with stricter limits
const rateLimiter = createRateLimiter(3, 60 * 1000);

// TTS API selection
const TTS_API_SELECTION_KEY = 'tts_api_selection';

// Get the selected TTS API
function getSelectedTTSApi() {
    try {
        return localStorage.getItem(TTS_API_SELECTION_KEY) || 'free';
    } catch (error) {
        console.error('Error getting TTS API selection from local storage:', error);
        return 'free'; // Default to free API
    }
}

// Save the selected TTS API
function saveSelectedTTSApi(apiSelection) {
    try {
        localStorage.setItem(TTS_API_SELECTION_KEY, apiSelection);
    } catch (error) {
        console.error('Error saving TTS API selection to local storage:', error);
    }
}

// Check if custom TTS API is enabled
function isCustomTTSEnabled() {
    return getSelectedTTSApi() === 'elevenlabs';
}

// Caching settings
let cachingEnabled = true;

// Enable or disable caching
function setCachingEnabled(enabled) {
    cachingEnabled = enabled;
    console.log(`Article and image caching ${enabled ? 'enabled' : 'disabled'}`);
}

// Check if caching is enabled
function isCachingEnabled() {
    return cachingEnabled;
}

// Clear article cache
function clearArticleCache() {
    try {
        // Get all keys in sessionStorage
        const keys = Object.keys(sessionStorage);
        
        // Filter for article cache keys
        const articleCacheKeys = keys.filter(key => key.startsWith('article_'));
        
        // Remove each article cache entry
        articleCacheKeys.forEach(key => {
            sessionStorage.removeItem(key);
        });
        
        console.log(`Cleared ${articleCacheKeys.length} cached articles`);
    } catch (error) {
        console.error('Error clearing article cache:', error);
    }
}

// Clear image cache
function clearImageCache() {
    try {
        // Get all keys in sessionStorage
        const keys = Object.keys(sessionStorage);
        
        // Filter for image cache keys
        const imageCacheKeys = keys.filter(key => key.startsWith('image_'));
        
        // Remove each image cache entry
        imageCacheKeys.forEach(key => {
            sessionStorage.removeItem(key);
        });
        
        console.log(`Cleared ${imageCacheKeys.length} cached images`);
    } catch (error) {
        console.error('Error clearing image cache:', error);
    }
}

// Cache an article
function cacheArticle(query, articleData) {
    if (!cachingEnabled) return;
    
    try {
        // Add writing style to the cache key to differentiate same query with different styles
        const writingStyle = articleData.writingStyle || 'normal';
        const cacheKey = `article_${query.toLowerCase().replace(/\s+/g, '_')}_${writingStyle}`;
        sessionStorage.setItem(cacheKey, JSON.stringify(articleData));
        console.log('Article cached:', query, 'with style:', writingStyle);
    } catch (error) {
        console.error('Error caching article:', error);
    }
}

// Get cached article
function getCachedArticle(query, writingStyle = 'normal') {
    if (!cachingEnabled) return null;
    
    try {
        // Use writing style in the cache key
        const cacheKey = `article_${query.toLowerCase().replace(/\s+/g, '_')}_${writingStyle}`;
        const cachedArticle = sessionStorage.getItem(cacheKey);
        
        if (cachedArticle) {
            console.log('Using cached article for:', query, 'with style:', writingStyle);
            return JSON.parse(cachedArticle);
        }
    } catch (error) {
        console.error('Error getting cached article:', error);
    }
    
    return null;
}

// Cache an image
function cacheImage(query, imageData) {
    if (!cachingEnabled) return;
    
    try {
        const cacheKey = `image_${query.toLowerCase().replace(/\s+/g, '_')}`;
        sessionStorage.setItem(cacheKey, JSON.stringify(imageData));
        console.log('Image cached:', query);
    } catch (error) {
        console.error('Error caching image:', error);
    }
}

// Get cached image
function getCachedImage(query) {
    if (!cachingEnabled) return null;
    
    try {
        const cacheKey = `image_${query.toLowerCase().replace(/\s+/g, '_')}`;
        const cachedImage = sessionStorage.getItem(cacheKey);
        
        if (cachedImage) {
            console.log('Using cached image for:', query);
            return JSON.parse(cachedImage);
        }
    } catch (error) {
        console.error('Error getting cached image:', error);
    }
    
    return null;
}

// Export all utility functions that are used by other modules
export {
    escapeHTML,
    getLanguageName,
    debounce,
    generateId,
    formatDate,
    saveElevenLabsApiKey,
    getElevenLabsApiKey,
    validateElevenLabsApiKey,
    isElevenLabsBetaEnabled,
    generatePDF,
    downloadHTML,
    fetchImageFromUnsplash,
    formatAudioTime,
    preloadImage,
    throttle,
    getRandomItem,
    shuffleArray,
    truncateString,
    capitalizeFirstLetter,
    isInViewport,
    getScrollPercentage,
    copyToClipboard,
    triggerUnsplashDownload,
    createRateLimiter,
    getSelectedTTSApi,
    saveSelectedTTSApi,
    isCustomTTSEnabled,
    setCachingEnabled,
    isCachingEnabled,
    clearArticleCache,
    clearImageCache,
    cacheArticle,
    getCachedArticle,
    cacheImage,
    getCachedImage
};

// Initialize the global AIPediaUtils object for browser usage
if (typeof window !== 'undefined') {
    window.AIPediaUtils = {
        escapeHTML,
        getLanguageName,
        debounce,
        generateId,
        formatDate,
        saveElevenLabsApiKey,
        getElevenLabsApiKey,
        validateElevenLabsApiKey,
        isElevenLabsBetaEnabled,
        generatePDF,
        downloadHTML,
        fetchImageFromUnsplash,
        formatAudioTime,
        preloadImage,
        throttle,
        getRandomItem,
        shuffleArray,
        truncateString,
        capitalizeFirstLetter,
        isInViewport,
        getScrollPercentage,
        copyToClipboard,
        triggerUnsplashDownload,
        createRateLimiter,
        getSelectedTTSApi,
        saveSelectedTTSApi,
        isCustomTTSEnabled,
        rateLimiter: createRateLimiter(3, 60 * 1000),
        getLocaleString: function(key, ...args) {
            if (window.AIPediaLocales && typeof window.AIPediaLocales.getLocaleString === 'function') {
                return window.AIPediaLocales.getLocaleString(key, ...args);
            }
            return key;
        },
        setCachingEnabled,
        isCachingEnabled,
        clearArticleCache,
        clearImageCache,
        cacheArticle,
        getCachedArticle,
        cacheImage,
        getCachedImage
    };
}

// For CommonJS environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.AIPediaUtils;
} 
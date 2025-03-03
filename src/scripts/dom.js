/**
 * DOM Elements and related functions
 */

// DOM Elements - using optional chaining to prevent errors if elements don't exist
export const searchBar = document.getElementById('search-bar');
export const searchButton = document.getElementById('search-button');
export const languageSelect = document.getElementById('language-select');
export const writingStyleSelect = document.getElementById('writing-style-select');
export const articleContainer = document.getElementById('article-container');
export const searchContainer = document.getElementById('search-container');
export const backToTopButton = document.getElementById('back-to-top');
export const customizeButton = document.getElementById('customize-button');
export const customizationModal = document.getElementById('customization-modal');
export const closeModalButton = document.getElementById('close-modal');
export const darkModeToggle = document.getElementById('theme-dark');
export const lightModeToggle = document.getElementById('theme-light');
export const tocContainer = document.getElementById('toc-container');
export const geekMetricsContainer = document.getElementById('geek-metrics-container');
export const siteTitle = document.querySelector('.site-title');
export const fontSizeSlider = document.getElementById('font-size-slider');
export const kofiButton = document.getElementById('kofi-button');
export const bugReportButton = document.getElementById('bug-report-button');

// History elements
export const historyToggle = document.querySelector('.history-toggle');
export const historyContent = document.querySelector('.history-content');
export const historyList = document.getElementById('history-list');

// Create empty objects as fallbacks if elements don't exist
export const fontToggle = {
    inter: document.getElementById('font-inter') || {},
    serif: document.getElementById('font-serif') || {},
    mono: document.getElementById('font-mono') || {}
};

export const themeButtons = {
    light: document.getElementById('theme-light') || {},
    dark: document.getElementById('theme-dark') || {}
};

export const colorButtons = {
    black: document.getElementById('color-black') || {},
    blue: document.getElementById('color-blue') || {},
    pink: document.getElementById('color-pink') || {},
    yellow: document.getElementById('color-yellow') || {},
    green: document.getElementById('color-green') || {}
};

/**
 * Updates the UI state based on whether an article is displayed
 */
export function updateUIState() {
    if (isArticleDisplayed()) {
        document.body.classList.add('search-state');
    } else {
        document.body.classList.remove('search-state');
    }
}

/**
 * Checks if an article is currently displayed
 * @returns {boolean} True if article is displayed
 */
export function isArticleDisplayed() {
    return !articleContainer.classList.contains('hidden');
}

/**
 * Resets the application to its initial state
 */
export function resetApplicationState() {
    // Hide article container
    articleContainer.classList.add('hidden');
    
    // Clear search bar
    searchBar.value = '';
    
    // Reset UI state
    document.body.classList.remove('search-state');
    document.body.classList.add('center-mode');
    
    // Clear TOC and geek metrics containers
    if (tocContainer) tocContainer.innerHTML = '';
    if (geekMetricsContainer) geekMetricsContainer.innerHTML = '';
    
    // Stop audio if playing
    if (window.audioElement && !window.audioElement.paused) {
        window.audioElement.pause();
        window.isPlaying = false;
    }
    
    // Reset audio element
    window.audioElement = null;
    
    // Clear the context from previous article
    window.currentArticleData = null;
    
    // Hide hallucination popup if visible
    const hallucinationPopup = document.querySelector('.hallucination-popup');
    if (hallucinationPopup) {
        hallucinationPopup.classList.remove('visible');
    }
    
    // Clean URL to avoid reload into search
    if (window.history && window.history.pushState) {
        const cleanURL = window.location.pathname;
        window.history.pushState({}, document.title, cleanURL);
    }
    
    // Scroll to top
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
} 
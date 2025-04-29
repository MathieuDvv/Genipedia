/**
 * Main application entry point
 */

import { 
    searchBar, 
    searchButton, 
    siteTitle, 
    backToTopButton, 
    customizeButton, 
    closeModalButton, 
    fontSizeSlider, 
    themeButtons, 
    colorButtons, 
    fontToggle,
    resetApplicationState,
    updateUIState,
    kofiButton,
    languageSelect,
    bugReportButton
} from './dom.js';

import { 
    openCustomizationModal, 
    closeCustomizationModal, 
    setTheme, 
    setAccentColor, 
    setFontFamily, 
    setFontSize, 
    loadUserPreferences 
} from './preferences.js';

import { 
    handleSearch, 
    loadSearchHistory, 
    initHistoryToggle,
    loadFromURLParameters 
} from './search.js';

import { APP_SETTINGS } from './config.js';

// Import locales functions
import { 
    loadSavedLocale, 
    updateUIWithLocale, 
    setLocale,
    getLocaleString
} from './locales-module.js';

// Fallback to global functions if module imports fail
if (typeof loadSavedLocale !== 'function' && window.loadSavedLocale) {
    console.warn('Using global loadSavedLocale function');
    window.loadSavedLocale();
}

if (typeof updateUIWithLocale !== 'function' && window.updateUIWithLocale) {
    console.warn('Using global updateUIWithLocale function');
    window.updateUIWithLocale();
}

/**
 * Creates a dynamic, animated placeholder for the search bar
 */
function setupDynamicSearchPlaceholder() {
    const searchBar = document.getElementById('search-bar');
    if (!searchBar) return;
    
    // Language-specific placeholders
    const placeholdersByLanguage = {
        'en': [
            "Quantum computing",
            "History of the Roman Empire",
            "Religious elements in Evangelion",
            "Blackholes",
            "Artificial intelligence",
            "Tatsuki Fujimoto's art style",
            "The theory of relativity",
            "Climate change effects",
            "The Renaissance period",
            "Basketball games",
            "Blockchain technology",
            "Evolution of human species",
            "Space exploration milestones",
            "Gundam series"
        ],
        'ja': [
            "量子コンピューティング",
            "ローマ帝国の歴史",
            "エヴァンゲリオンの宗教的要素",
            "ブラックホール",
            "人工知能",
            "藤本タツキの作風",
            "相対性理論",
            "気候変動の影響",
            "ルネサンス時代",
            "バスケットボール",
            "ブロックチェーン技術",
            "人類の進化",
            "宇宙探査の歴史",
            "ガンダムシリーズ"
        ],
        'fr': [
            "L'informatique quantique",
            "Histoire de l'Empire romain",
            "Éléments religieux dans Evangelion",
            "Trous noirs",
            "Intelligence artificielle",
            "Style artistique de Tatsuki Fujimoto",
            "La théorie de la relativité",
            "Effets du changement climatique",
            "La période de la Renaissance",
            "Jeux de basket-ball",
            "Technologie blockchain",
            "Évolution de l'espèce humaine",
            "Jalons de l'exploration spatiale",
            "Série Gundam"
        ],
        'es': [
            "¿Computación cuántica",
            "Historia del Imperio Romano",
            "Elementos religiosos en Evangelion",
            "Agujeros negros",
            "Inteligencia artificial",
            "Estilo artístico de Tatsuki Fujimoto",
            "La teoría de la relatividad",
            "Efectos del cambio climático",
            "El período del Renacimiento",
            "Juegos de baloncesto",
            "Tecnología blockchain",
            "Evolución de la especie humana",
            "Hitos de la exploración espacial",
            "Serie Gundam"
        ],
        'de': [
            "Quantencomputing",
            "Geschichte des Römischen Reiches",
            "Religiöse Elemente in Evangelion",
            "Schwarze Löcher",
            "Künstliche Intelligenz",
            "Tatsuki Fujimotos Kunststil",
            "Die Relativitätstheorie",
            "Auswirkungen des Klimawandels",
            "Die Renaissance",
            "Basketball-Spiele",
            "Blockchain-Technologie",
            "Evolution der menschlichen Spezies",
            "Meilensteine der Weltraumforschung",
            "Gundam-Serie"
        ]
    };
    
    let currentPlaceholder = '';
    let currentIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let typingSpeed = 100;
    let pauseTime = 2000;
    let deleteSpeed = 30;
    
    function getCurrentLanguage() {
        const languageSelect = document.getElementById('language-select');
        return languageSelect ? languageSelect.value : 'en';
    }
    
    function getPlaceholders() {
        const currentLang = getCurrentLanguage();
        return placeholdersByLanguage[currentLang] || placeholdersByLanguage['en'];
    }
    
    function updatePlaceholder() {
        const placeholders = getPlaceholders();
        
        if (isDeleting) {
            currentPlaceholder = placeholders[currentIndex].substring(0, charIndex - 1);
            charIndex--;
        } else {
            currentPlaceholder = placeholders[currentIndex].substring(0, charIndex + 1);
            charIndex++;
        }
        
        searchBar.setAttribute('placeholder', currentPlaceholder);
        
        let delay = isDeleting ? deleteSpeed : typingSpeed;
        
        if (!isDeleting && charIndex === placeholders[currentIndex].length) {
            delay = pauseTime;
            isDeleting = true;
        } else if (isDeleting && charIndex === 0) {
            isDeleting = false;
            currentIndex = (currentIndex + 1) % placeholders.length;
        }
        
        setTimeout(updatePlaceholder, delay);
    }
    
    // Start the animation
    updatePlaceholder();
    
    // Update placeholders when language changes
    const languageSelect = document.getElementById('language-select');
    if (languageSelect) {
        languageSelect.addEventListener('change', () => {
            currentIndex = 0;
            charIndex = 0;
            isDeleting = false;
        });
    }
}

/**
 * Updates the search bar with a sparkle icon if any beta feature is enabled
 */
function updateSearchBarBetaIcon() {
    const searchBar = document.getElementById('search-bar');
    const searchBarContainer = document.querySelector('.search-bar-container');
    
    if (!searchBar || !searchBarContainer) {
        return;
    }
    
    // Check if any beta feature is enabled
    const imageSuggestionEnabled = document.getElementById('image-suggestion-toggle')?.checked || false;
    const elevenLabsEnabled = document.getElementById('elevenlabs-toggle')?.checked || false;
    const articleCachingEnabled = document.getElementById('article-caching-toggle')?.checked || false;
    
    // If any beta feature is enabled, add the sparkle icon
    if (imageSuggestionEnabled || elevenLabsEnabled || articleCachingEnabled) {
        // Remove existing icon if any
        const existingIcon = searchBarContainer.querySelector('.search-bar-beta-icon');
        if (existingIcon) {
            existingIcon.remove();
        }
        
        // Add the sparkle icon
        const sparkleIcon = document.createElement('i');
        sparkleIcon.setAttribute('data-lucide', 'sparkles');
        sparkleIcon.className = 'search-bar-beta-icon';
        searchBarContainer.appendChild(sparkleIcon);
        
        // Add class to search bar for padding
        searchBar.classList.add('with-beta-icon');
        
        // Initialize Lucide icon
        if (window.lucide) {
            window.lucide.createIcons({
                attrs: {
                    class: ['lucide'],
                    strokeWidth: '2',
                    stroke: 'currentColor',
                    fill: 'none',
                    strokeLinecap: 'round',
                    strokeLinejoin: 'round',
                }
            });
        }
    } else {
        // Remove icon if no beta features are enabled
        const existingIcon = searchBarContainer.querySelector('.search-bar-beta-icon');
        if (existingIcon) {
            existingIcon.remove();
        }
        
        // Remove class from search bar
        searchBar.classList.remove('with-beta-icon');
    }
}

/**
 * Initialize the top donation banner
 */
function initTopDonationBanner() {
    const bannerElement = document.getElementById('top-donation-banner');
    const bannerMessage = document.getElementById('top-banner-message');
    const donateButton = document.getElementById('top-banner-donate');
    const closeButton = document.getElementById('top-banner-close');
    
    if (!bannerElement || !bannerMessage || !donateButton || !closeButton) {
        console.error('Top donation banner elements not found');
        return;
    }
    
    // Check if the banner has been closed before
    const bannerClosed = localStorage.getItem('top_banner_closed');
    if (bannerClosed) {
        bannerElement.classList.add('hidden');
    }
    
    // Update the text based on current locale
    const updateBannerText = () => {
        bannerMessage.textContent = getLocaleString('top_banner_message');
        donateButton.querySelector('span').textContent = getLocaleString('donate_button');
    };
    
    // Initial text update
    updateBannerText();
    
    // Handle donate button click
    donateButton.addEventListener('click', () => {
        window.open('https://ko-fi.com/mathieudvv', '_blank');
    });
    
    // Handle close button click
    closeButton.addEventListener('click', () => {
        bannerElement.classList.add('hidden');
        // Remember the user's preference for 7 days
        localStorage.setItem('top_banner_closed', Date.now().toString());
        
        // Set a timeout to reset the preference after 7 days
        setTimeout(() => {
            localStorage.removeItem('top_banner_closed');
        }, 7 * 24 * 60 * 60 * 1000); // 7 days in milliseconds
    });
    
    // Update text when locale changes
    document.addEventListener('localeChanged', updateBannerText);
}

/**
 * Initializes the application
 */
function init() {
    console.log('Initializing AIPedia...');
    
    // Set up the dynamic search placeholder
    setupDynamicSearchPlaceholder();
    
    // Load user preferences
    loadUserPreferences();
    
    // Initialize language
    loadSavedLocale();
    
    // Setup dynamic icon for the customize button
    function updateIcon() {
        const customizeButton = document.getElementById('customize-button');
        if (!customizeButton) return;
        
        // Add the correct icon based on the theme
        const isDarkTheme = document.body.classList.contains('dark-theme');
        const icon = customizeButton.querySelector('[data-lucide]');
        
        if (icon) {
            icon.setAttribute('data-lucide', 'settings');
        }
    }
    
    // Update the icon initially
    updateIcon();
    
    // Add event listeners
    searchButton.addEventListener('click', function() {
        const query = searchBar.value.trim();
        if (query) {
            handleSearch(query);
        }
    });
    
    searchBar.addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
            const query = searchBar.value.trim();
            if (query) {
                handleSearch(query);
            }
        }
    });
    
    // Back to top functionality
    backToTopButton.addEventListener('click', function() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    
    // Show/hide back to top button based on scroll position
    window.addEventListener('scroll', function() {
        if (window.pageYOffset > 300) {
            backToTopButton.classList.add('visible');
        } else {
            backToTopButton.classList.remove('visible');
        }
    });
    
    // Handle Ko-fi button click
    kofiButton.addEventListener('click', function() {
        window.open('https://ko-fi.com/mathieudvv', '_blank');
    });
    
    // Handle Twitter button click
    document.getElementById('twitter-button').addEventListener('click', function() {
        window.open('https://twitter.com/mathieudv', '_blank');
    });
    
    // Handle Bug Report button click
    bugReportButton.addEventListener('click', function() {
        window.open('https://github.com/mathieudv/genipedia/issues', '_blank');
    });
    
    // Site title click resets the application
    siteTitle.addEventListener('click', resetApplicationState);
    
    // Customization modal
    customizeButton.addEventListener('click', openCustomizationModal);
    closeModalButton.addEventListener('click', closeCustomizationModal);
    
    // Font size slider
    fontSizeSlider.addEventListener('input', function() {
        setFontSize(this.value);
    });
    
    // Theme buttons - Fix the forEach error by checking if buttons exist
    if (themeButtons.light) {
        themeButtons.light.addEventListener('click', function() {
            setTheme('light');
        });
    }
    
    if (themeButtons.dark) {
        themeButtons.dark.addEventListener('click', function() {
            setTheme('dark');
        });
    }
    
    // Color buttons - Use Object.keys() to iterate through the object
    Object.keys(colorButtons).forEach(color => {
        const button = colorButtons[color];
        if (button && button.addEventListener) {
            button.addEventListener('click', function() {
                setAccentColor(color);
            });
        }
    });
    
    // Font toggle - Use Object.keys() to iterate through the object
    Object.keys(fontToggle).forEach(font => {
        const button = fontToggle[font];
        if (button && button.addEventListener) {
            button.addEventListener('click', function() {
                setFontFamily(font);
            });
        }
    });
    
    // Load search history
    loadSearchHistory();
    
    // Initialize history toggle
    initHistoryToggle();
    
    // Initialize language selector
    languageSelect.addEventListener('change', function() {
        setLocale(this.value);
        updateSubtitleLanguage(this.value);
    });
    
    // Handle clicking outside the modal to close it
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('customization-modal');
        if (event.target === modal) {
            closeCustomizationModal();
        }
    });
    
    // Escape key to close modal
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            closeCustomizationModal();
        }
    });
    
    // Setup age-targeted writing toggle in preferences
    setupAgeTargetedWritingToggle();
    
    // Create Lucide icons
    lucide.createIcons({
        attrs: {
            class: ['lucide'],
            strokeWidth: '2',
            stroke: 'currentColor',
            fill: 'none',
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
        }
    });
    
    // Make sure logo is visible
    const logoImg = document.querySelector('.title-logo');
    if (logoImg) {
        logoImg.style.display = 'block';
        logoImg.style.maxWidth = '100%';
        console.log("Ensuring logo is visible");
    }
    
    // Set up mobile UI adjustments
    setupMobileUIAdjustments();
    
    // Try to load article from URL parameters if any
    loadFromURLParameters();
    
    // Setup Beta Features toggle handlers
    setupBetaFeatureToggles();
    
    console.log('AIPedia initialized successfully');
}

// Function to update the subtitle based on the selected language
function updateSubtitleLanguage(language) {
    const subtitle = document.querySelector('.site-subtitle');
    if (subtitle) {
        const translationAttr = `data-subtitle-${language}`;
        if (subtitle.hasAttribute(translationAttr)) {
            subtitle.textContent = subtitle.getAttribute(translationAttr);
        } else {
            // Fallback to English
            subtitle.textContent = subtitle.getAttribute('data-subtitle-en');
        }
    }
}

/**
 * Sets up the age-targeted writing style toggle
 */
function setupAgeTargetedWritingToggle() {
    const ageTargetedToggle = document.getElementById('age-targeted-toggle');
    const writingStyleSelect = document.getElementById('writing-style-select');
    
    if (!ageTargetedToggle || !writingStyleSelect) return;
    
    // Store the original options
    const originalOptions = Array.from(writingStyleSelect.options).map(option => ({
        value: option.value,
        text: option.text,
        selected: option.selected
    }));
    
    // Age-targeted options with translations
    const ageTargetedOptions = [
        { value: 'age-0-10', translationKey: 'age_0_10' },
        { value: 'age-11-16', translationKey: 'age_11_16' },
        { value: 'age-17-25', translationKey: 'age_17_25' },
        { value: 'age-25-plus', translationKey: 'age_25_plus' }
    ];
    
    // Function to update the select options based on toggle state
    function updateWritingStyleOptions(isEnabled) {
        // Clear current options
        writingStyleSelect.innerHTML = '';
        
        if (isEnabled) {
            // Add age-targeted options
            const currentLang = languageSelect.value || 'en';
            ageTargetedOptions.forEach(option => {
                const optElement = document.createElement('option');
                optElement.value = option.value;
                
                // Use the translation system to get the localized text
                // First try using AIPediaLocales directly if available
                if (window.AIPediaLocales && typeof window.AIPediaLocales.getLocaleString === 'function') {
                    optElement.textContent = window.AIPediaLocales.getLocaleString(option.translationKey);
                } 
                // Then try using AIPediaUtils
                else if (window.AIPediaUtils && typeof window.AIPediaUtils.getLocaleString === 'function') {
                    optElement.textContent = window.AIPediaUtils.getLocaleString(option.translationKey);
                } 
                // Fallback to a simple key-based lookup
                else {
                    // Fallback to hardcoded translations if getLocaleString is not available
                    const fallbackTranslations = {
                        'age_0_10': { 'en': 'Age 0-10', 'fr': 'Âge 0-10', 'es': 'Edad 0-10', 'de': 'Alter 0-10', 'ja': '年齢 0-10' },
                        'age_11_16': { 'en': 'Age 11-16', 'fr': 'Âge 11-16', 'es': 'Edad 11-16', 'de': 'Alter 11-16', 'ja': '年齢 11-16' },
                        'age_17_25': { 'en': 'Age 17-25', 'fr': 'Âge 17-25', 'es': 'Edad 17-25', 'de': 'Alter 17-25', 'ja': '年齢 17-25' },
                        'age_25_plus': { 'en': 'Age 25+', 'fr': 'Âge 25+', 'es': 'Edad 25+', 'de': 'Alter 25+', 'ja': '年齢 25+' }
                    };
                    
                    const translations = fallbackTranslations[option.translationKey] || {};
                    optElement.textContent = translations[currentLang] || translations['en'] || option.translationKey;
                }
                
                writingStyleSelect.appendChild(optElement);
            });
            
            // Select the first option
            writingStyleSelect.value = ageTargetedOptions[0].value;
        } else {
            // Restore original options
            originalOptions.forEach(option => {
                const optElement = document.createElement('option');
                optElement.value = option.value;
                optElement.textContent = option.text;
                optElement.selected = option.selected;
                writingStyleSelect.appendChild(optElement);
            });
        }
    }
    
    // Add event listener to the toggle
    ageTargetedToggle.addEventListener('change', () => {
        updateWritingStyleOptions(ageTargetedToggle.checked);
    });
    
    // Add event listener to language select to update translations
    languageSelect.addEventListener('change', () => {
        updateWritingStyleOptions(ageTargetedToggle.checked);
    });
    
    // Initialize based on saved preference
    const savedPreference = localStorage.getItem('ageTargetedWriting') === 'true';
    ageTargetedToggle.checked = savedPreference;
    
    // Save preference when changed
    ageTargetedToggle.addEventListener('change', () => {
        localStorage.setItem('ageTargetedWriting', ageTargetedToggle.checked);
    });
    
    // Initial update
    if (savedPreference) {
        updateWritingStyleOptions(true);
    }
}

/**
 * Sets up mobile UI adjustments
 */
function setupMobileUIAdjustments() {
    // Placeholder function - implement mobile-specific adjustments if needed
    console.log("Mobile UI adjustments setup");
}

/**
 * Sets up beta feature toggle handlers
 */
function setupBetaFeatureToggles() {
    // Image suggestion toggle
    const imageSuggestionToggle = document.getElementById('image-suggestion-toggle');
    if (imageSuggestionToggle) {
        // Initialize from saved preference (default to false if not set)
        const savedImageSuggestionPreference = localStorage.getItem('imageSuggestionEnabled');
        const imageSuggestionEnabled = savedImageSuggestionPreference === 'true';
        
        // Set initial state
        imageSuggestionToggle.checked = imageSuggestionEnabled;
        
        // Get version container
        const versionContainer = document.getElementById('image-suggestion-version-container');
        
        // Set initial visibility based on toggle state
        if (versionContainer) {
            versionContainer.style.display = imageSuggestionEnabled ? 'block' : 'none';
        }
        
        // Handle toggle changes
        imageSuggestionToggle.addEventListener('change', () => {
            const enabled = imageSuggestionToggle.checked;
            localStorage.setItem('imageSuggestionEnabled', enabled);
            
            // Show/hide version container
            if (versionContainer) {
                versionContainer.style.display = enabled ? 'block' : 'none';
            }
            
            // Update the beta icon in search bar
            updateSearchBarBetaIcon();
        });
    }
    
    // ElevenLabs toggle
    const elevenlabsToggle = document.getElementById('elevenlabs-toggle');
    if (elevenlabsToggle) {
        // Initialize from saved preference (default to false if not set)
        const savedElevenlabsPreference = localStorage.getItem('elevenlabsEnabled');
        // Force enable the feature but hide the toggle
        const elevenlabsEnabled = false;
        
        // Set initial state but disable the toggle element
        elevenlabsToggle.checked = elevenlabsEnabled;
        elevenlabsToggle.disabled = true;
        
        // Get API container
        const apiContainer = document.querySelector('.elevenlabs-api-container');
        
        // Set initial visibility based on toggle state
        if (apiContainer) {
            apiContainer.style.display = elevenlabsEnabled ? 'block' : 'none';
        }
        
        // Save the enabled state to localStorage
        localStorage.setItem('elevenlabsEnabled', elevenlabsEnabled);
        
        // Hide the toggle's parent element to remove it from the UI
        const toggleContainer = elevenlabsToggle.closest('.toggle-container');
        if (toggleContainer) {
            toggleContainer.style.display = 'none';
        }
    }
    
    // Article caching toggle
    const articleCachingToggle = document.getElementById('article-caching-toggle');
    if (articleCachingToggle) {
        // Initialize from saved preference (default to true if not set)
        const savedCachingPreference = localStorage.getItem('articleCachingEnabled');
        const cachingEnabled = savedCachingPreference === null ? true : (savedCachingPreference === 'true');
        
        // Set initial state
        articleCachingToggle.checked = cachingEnabled;
        window.AIPediaUtils.setCachingEnabled(cachingEnabled);
        
        // Handle toggle changes
        articleCachingToggle.addEventListener('change', () => {
            const enabled = articleCachingToggle.checked;
            window.AIPediaUtils.setCachingEnabled(enabled);
            localStorage.setItem('articleCachingEnabled', enabled);
            
            // Clear caches if disabled
            if (!enabled) {
                window.AIPediaUtils.clearArticleCache();
                window.AIPediaUtils.clearImageCache();
                console.log('Caches cleared due to disabling caching feature');
            }
            
            // Update the beta icon in search bar
            updateSearchBarBetaIcon();
        });
    }
    
    // Licenses button
    const licensesButton = document.getElementById('licenses-button');
    const licensesPopup = document.getElementById('licenses-popup');
    const closeLicensesButton = document.getElementById('close-licenses-popup');
    
    if (licensesButton && licensesPopup && closeLicensesButton) {
        licensesButton.addEventListener('click', () => {
            licensesPopup.classList.add('visible');
        });
        
        closeLicensesButton.addEventListener('click', () => {
            licensesPopup.classList.remove('visible');
        });
    }
    
    // Update beta icon based on initial states
    updateSearchBarBetaIcon();
    
    console.log("Beta feature toggles setup");
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    init();
    
    // Initialize Sticky Audio Player
    if (window.initStickyAudioPlayer) {
        window.initStickyAudioPlayer();
    }
}); 
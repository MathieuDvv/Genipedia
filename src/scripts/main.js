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
    
    // If any beta feature is enabled, add the sparkle icon
    if (imageSuggestionEnabled || elevenLabsEnabled) {
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
                    strokeLinejoin: 'round'
                }
            }, document.querySelectorAll('.search-bar-beta-icon'));
        }
    } else {
        // Remove the sparkle icon if no beta feature is enabled
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
        window.open('https://ko-fi.com/genipedia', '_blank');
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
    // Load user preferences
    loadUserPreferences();
    
    // Load search history
    loadSearchHistory();
    
    // Load saved locale
    loadSavedLocale();
    
    // Update UI with current locale
    updateUIWithLocale();
    
    // Setup dynamic search placeholder
    setupDynamicSearchPlaceholder();
    
    // Enable center mode by default
    document.body.classList.add('center-mode');
    
    // Add event listeners
    searchButton.addEventListener('click', handleSearch);
    searchBar.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });
    
    // Language select change
    if (languageSelect) {
        languageSelect.addEventListener('change', () => {
            setLocale(languageSelect.value);
            updateSubtitleLanguage(languageSelect.value);
        });
        // Initialize subtitle with current language
        updateSubtitleLanguage(languageSelect.value || 'en');
    }
    
    // Setup age-targeted writing style toggle
    setupAgeTargetedWritingToggle();
    
    // Check for search parameters in URL
    loadFromURLParameters();
    
    // Back to top button
    backToTopButton.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
    
    // Show/hide back to top button on scroll
    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            backToTopButton.classList.add('visible');
        } else {
            backToTopButton.classList.remove('visible');
        }
    });
    
    // Customization modal
    customizeButton.addEventListener('click', openCustomizationModal);
    closeModalButton.addEventListener('click', closeCustomizationModal);
    
    // Ko-Fi button
    kofiButton.addEventListener('click', () => {
        window.open('https://ko-fi.com/genipedia', '_blank');
    });
    
    // Twitter button
    document.getElementById('twitter-button').addEventListener('click', () => {
        window.open('https://twitter.com/genipedia', '_blank');
    });
    
    // Bug report button
    bugReportButton.addEventListener('click', () => {
        const bugReportPopup = document.getElementById('bug-report-popup');
        bugReportPopup.classList.add('visible');
    });
    
    // Close bug report popup
    document.getElementById('close-bug-popup').addEventListener('click', () => {
        const bugReportPopup = document.getElementById('bug-report-popup');
        bugReportPopup.classList.remove('visible');
    });
    
    // Close bug report popup when clicking outside
    document.getElementById('bug-report-popup').addEventListener('click', (e) => {
        if (e.target === document.getElementById('bug-report-popup')) {
            document.getElementById('bug-report-popup').classList.remove('visible');
        }
    });
    
    // Licenses button
    document.getElementById('licenses-button').addEventListener('click', () => {
        const licensesPopup = document.getElementById('licenses-popup');
        licensesPopup.classList.add('visible');
    });
    
    // Close licenses popup
    document.getElementById('close-licenses-popup').addEventListener('click', () => {
        const licensesPopup = document.getElementById('licenses-popup');
        licensesPopup.classList.remove('visible');
    });
    
    // Close licenses popup when clicking outside
    document.getElementById('licenses-popup').addEventListener('click', (e) => {
        if (e.target === document.getElementById('licenses-popup')) {
            document.getElementById('licenses-popup').classList.remove('visible');
        }
    });
    
    // Rotating icon functionality
    const icons = ['globe', 'earth', 'cat', 'car', 'cpu', 'graduation-cap', 'tv', 'brain', 'sailboat', 'leaf'];
    let currentIconIndex = 0;
    const rotatingIcon = document.querySelector('.rotating-icon');
    let isAnimating = false;
    
    function updateIcon() {
        if (!document.body.classList.contains('center-mode') || 
            document.body.classList.contains('search-state') ||
            isAnimating ||
            !rotatingIcon) {
            return;
        }

        isAnimating = true;
        
        // Start the flip animation
        rotatingIcon.style.animation = 'coinFlip 1s ease-in-out';
        
        // Change icon when the coin is flipped (halfway through animation)
        setTimeout(() => {
            currentIconIndex = (currentIconIndex + 1) % icons.length;
            rotatingIcon.setAttribute('data-lucide', icons[currentIconIndex]);
            lucide.createIcons({
                attrs: {
                    class: ['lucide', 'rotating-icon'],
                    stroke: 'currentColor'
                }
            }, [rotatingIcon]);
        }, 500);

        // Reset animation state after completion
        setTimeout(() => {
            rotatingIcon.style.animation = '';
            isAnimating = false;
        }, 1000);
    }
    
    // Initial icon setup
    if (rotatingIcon) {
        rotatingIcon.setAttribute('data-lucide', icons[0]);
        lucide.createIcons({
            attrs: {
                class: ['lucide', 'rotating-icon'],
                stroke: 'currentColor'
            }
        }, [rotatingIcon]);
    }
    
    // Update icon every 3 seconds
    setInterval(updateIcon, 3000);
    
    // Theme toggle
    themeButtons.light.addEventListener('click', () => {
        setTheme('light');
    });
    
    themeButtons.dark.addEventListener('click', () => {
        setTheme('dark');
    });
    
    // Color options
    Object.keys(colorButtons).forEach(color => {
        colorButtons[color].addEventListener('click', () => {
            setAccentColor(color);
        });
    });
    
    // Font options
    Object.keys(fontToggle).forEach(font => {
        fontToggle[font].addEventListener('click', () => {
            setFontFamily(font);
        });
    });
    
    // Font size slider
    if (fontSizeSlider) {
        fontSizeSlider.addEventListener('input', () => {
            const value = fontSizeSlider.value;
            let multiplier;
            
            switch (parseInt(value)) {
                case 1:
                    multiplier = 0.5;
                    break;
                case 2:
                    multiplier = 0.75;
                    break;
                case 3:
                    multiplier = 1;
                    break;
                case 4:
                    multiplier = 2;
                    break;
                default:
                    multiplier = 0.75;
            }
            
            setFontSize(multiplier);
        });
        
        // Set initial font size based on slider value
        const initialFontSizeValue = fontSizeSlider.value;
        let initialMultiplier;
        
        switch (parseInt(initialFontSizeValue)) {
            case 1:
                initialMultiplier = 0.5;
                break;
            case 2:
                initialMultiplier = 0.75;
                break;
            case 3:
                initialMultiplier = 1;
                break;
            case 4:
                initialMultiplier = 2;
                break;
            default:
                initialMultiplier = 0.75;
        }
        
        setFontSize(initialMultiplier);
    } else {
        // Default to x1 font size if slider doesn't exist
        setFontSize(1);
    }
    
    // Logo click resets the app
    siteTitle.addEventListener('click', resetApplicationState);
    
    // Beta features
    // Image suggestion toggle
    const imageSuggestionToggle = document.getElementById('image-suggestion-toggle');
    if (imageSuggestionToggle) {
        // Load saved state
        const savedState = localStorage.getItem('image_suggestion_enabled');
        if (savedState === 'true') {
            imageSuggestionToggle.checked = true;
            // Show version selector if enabled
            const versionSelector = document.getElementById('image-suggestion-version-container');
            if (versionSelector) versionSelector.style.display = 'block';
        } else {
            // Hide version selector if disabled
            const versionSelector = document.getElementById('image-suggestion-version-container');
            if (versionSelector) versionSelector.style.display = 'none';
        }
        
        // Save state on change
        imageSuggestionToggle.addEventListener('change', () => {
            localStorage.setItem('image_suggestion_enabled', imageSuggestionToggle.checked);
            
            // Show/hide version selector based on toggle state
            const versionSelector = document.getElementById('image-suggestion-version-container');
            if (versionSelector) {
                versionSelector.style.display = imageSuggestionToggle.checked ? 'block' : 'none';
            }
            
            updateSearchBarBetaIcon();
        });
    }
    
    // Load and save image suggestion version
    const imageSuggestionVersionSelect = document.getElementById('image-suggestion-version-select');
    if (imageSuggestionVersionSelect) {
        // Load saved version
        const savedVersion = localStorage.getItem('image_suggestion_version') || 'v1';
        imageSuggestionVersionSelect.value = savedVersion;
        
        // Save version on change
        imageSuggestionVersionSelect.addEventListener('change', () => {
            localStorage.setItem('image_suggestion_version', imageSuggestionVersionSelect.value);
        });
    }
    
    // ElevenLabs toggle
    const elevenLabsToggle = document.getElementById('elevenlabs-toggle');
    const elevenLabsApiContainer = document.querySelector('.elevenlabs-api-container');
    const elevenLabsApiKeyInput = document.getElementById('elevenlabs-api-key');
    const saveElevenLabsApiKeyButton = document.getElementById('save-elevenlabs-api-key');
    const elevenLabsApiKeyStatus = document.getElementById('elevenlabs-api-key-status');
    const ttsApiSelect = document.getElementById('tts-api-select');
    const elevenLabsKeyContainer = document.getElementById('elevenlabs-key-container');
    
    if (elevenLabsToggle && elevenLabsApiContainer) {
        // Load saved state
        const savedState = localStorage.getItem('elevenlabs_enabled');
        if (savedState === 'true') {
            elevenLabsToggle.checked = true;
            elevenLabsApiContainer.style.display = 'block';
        }
        
        // Show/hide API key input on toggle
        elevenLabsToggle.addEventListener('change', () => {
            localStorage.setItem('elevenlabs_enabled', elevenLabsToggle.checked);
            elevenLabsApiContainer.style.display = elevenLabsToggle.checked ? 'block' : 'none';
            updateSearchBarBetaIcon();
        });
        
        // Handle TTS API selection
        if (ttsApiSelect && elevenLabsKeyContainer) {
            // Load saved API selection
            const savedApiSelection = window.AIPediaUtils.getSelectedTTSApi();
            ttsApiSelect.value = savedApiSelection;
            
            // Show/hide ElevenLabs key container based on selection
            elevenLabsKeyContainer.style.display = savedApiSelection === 'elevenlabs' ? 'block' : 'none';
            
            // Handle API selection change
            ttsApiSelect.addEventListener('change', () => {
                const apiSelection = ttsApiSelect.value;
                window.AIPediaUtils.saveSelectedTTSApi(apiSelection);
                elevenLabsKeyContainer.style.display = apiSelection === 'elevenlabs' ? 'block' : 'none';
            });
        }
        
        // Load saved API key
        if (elevenLabsApiKeyInput) {
            try {
                const savedApiKey = localStorage.getItem('elevenlabs_api_key');
                if (savedApiKey) {
                    elevenLabsApiKeyInput.value = savedApiKey;
                    elevenLabsApiKeyStatus.textContent = 'API key is set';
                    elevenLabsApiKeyStatus.className = 'api-key-status success';
                }
            } catch (error) {
                console.error('Error loading ElevenLabs API key:', error);
            }
        }
        
        // Save API key
        if (saveElevenLabsApiKeyButton && elevenLabsApiKeyInput) {
            saveElevenLabsApiKeyButton.addEventListener('click', async () => {
                const apiKey = elevenLabsApiKeyInput.value.trim();
                
                if (!apiKey) {
                    elevenLabsApiKeyStatus.textContent = 'Please enter a valid API key';
                    elevenLabsApiKeyStatus.className = 'api-key-status error';
                    return;
                }
                
                // Show loading state
                saveElevenLabsApiKeyButton.disabled = true;
                saveElevenLabsApiKeyButton.textContent = 'Saving...';
                
                // Validate API key
                try {
                    const isValid = await window.AIPediaUtils.validateElevenLabsApiKey(apiKey);
                    
                    if (isValid) {
                        // Save API key
                        window.AIPediaUtils.saveElevenLabsApiKey(apiKey);
                        
                        elevenLabsApiKeyStatus.textContent = 'API key saved successfully';
                        elevenLabsApiKeyStatus.className = 'api-key-status success';
                    } else {
                        elevenLabsApiKeyStatus.textContent = 'Invalid API key';
                        elevenLabsApiKeyStatus.className = 'api-key-status error';
                    }
                } catch (error) {
                    console.error('Error validating ElevenLabs API key:', error);
                    elevenLabsApiKeyStatus.textContent = 'Error validating API key';
                    elevenLabsApiKeyStatus.className = 'api-key-status error';
                } finally {
                    // Reset button state
                    saveElevenLabsApiKeyButton.disabled = false;
                    saveElevenLabsApiKeyButton.textContent = 'Save';
                }
            });
        }
    }
    
    // Initialize Lucide icons
    if (window.lucide) {
        window.lucide.createIcons();
    }
    
    // Update search bar with beta icon if needed
    updateSearchBarBetaIcon();

    // Initialize top donation banner
    initTopDonationBanner();

    // Age-targeted writing toggle
    const ageTargetedToggle = document.getElementById('age-targeted-toggle');
    if (ageTargetedToggle) {
        // Load saved state
        const savedState = localStorage.getItem('ageTargetedWriting');
        if (savedState === 'true') {
            ageTargetedToggle.checked = true;
            updateWritingStyleOptions(true);
        }
        
        // Handle toggle change
        ageTargetedToggle.addEventListener('change', () => {
            localStorage.setItem('ageTargetedWriting', ageTargetedToggle.checked);
            updateWritingStyleOptions(ageTargetedToggle.checked);
        });
    }
    
    // Article caching toggle
    const articleCachingToggle = document.getElementById('article-caching-toggle');
    if (articleCachingToggle) {
        // Load saved state
        const savedState = localStorage.getItem('article_caching_enabled');
        if (savedState === 'true') {
            articleCachingToggle.checked = true;
            window.AIPediaUtils.setCachingEnabled(true);
        } else {
            window.AIPediaUtils.setCachingEnabled(false);
        }
        
        // Handle toggle change
        articleCachingToggle.addEventListener('change', () => {
            localStorage.setItem('article_caching_enabled', articleCachingToggle.checked);
            window.AIPediaUtils.setCachingEnabled(articleCachingToggle.checked);
            
            // Clear cache if disabled
            if (!articleCachingToggle.checked) {
                window.AIPediaUtils.clearArticleCache();
                window.AIPediaUtils.clearImageCache();
            }
        });
    }
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

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', init); 
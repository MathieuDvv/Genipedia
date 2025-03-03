/**
 * User preferences and customization functions
 */

import { themeButtons, colorButtons, fontToggle, fontSizeSlider } from './dom.js';

// User preferences
export const userPreferences = {
    theme: 'light',
    accentColor: 'black',
    fontFamily: 'inter',
    fontSize: 'medium',
    fontSizeMultiplier: 1
};

/**
 * Opens the customization modal
 */
export function openCustomizationModal() {
    const customizationModal = document.getElementById('customization-modal');
    customizationModal.classList.remove('hidden');
    customizationModal.classList.add('visible');
}

/**
 * Closes the customization modal
 */
export function closeCustomizationModal() {
    const customizationModal = document.getElementById('customization-modal');
    customizationModal.classList.remove('visible');
    setTimeout(() => {
        customizationModal.classList.add('hidden');
    }, 300);
}

/**
 * Sets the theme (light/dark)
 * @param {string} theme - The theme to set
 */
export function setTheme(theme) {
    if (theme === 'dark') {
        document.body.classList.add('dark-theme');
        themeButtons.dark.classList.add('active');
        themeButtons.light.classList.remove('active');
    } else {
        document.body.classList.remove('dark-theme');
        themeButtons.light.classList.add('active');
        themeButtons.dark.classList.remove('active');
    }
    
    userPreferences.theme = theme;
    saveUserPreferences();
    updateTheme();
}

/**
 * Sets the accent color
 * @param {string} color - The color to set
 */
export function setAccentColor(color) {
    // Remove all color classes
    document.body.classList.remove('accent-blue', 'accent-pink', 'accent-yellow', 'accent-green');
    
    // Add the selected color class if not black (default)
    if (color !== 'black') {
        document.body.classList.add(`accent-${color}`);
    }
    
    // Update active state on buttons
    Object.keys(colorButtons).forEach(key => {
        if (key === color) {
            colorButtons[key].classList.add('active');
        } else {
            colorButtons[key].classList.remove('active');
        }
    });
    
    userPreferences.accentColor = color;
    saveUserPreferences();
}

/**
 * Sets the font family
 * @param {string} font - The font to set
 */
export function setFontFamily(font) {
    // Remove all font classes
    document.body.classList.remove('font-inter', 'font-serif', 'font-mono');
    
    // Add the selected font class
    document.body.classList.add(`font-${font}`);
    
    // Update active state on buttons
    Object.keys(fontToggle).forEach(key => {
        if (key === font) {
            fontToggle[key].classList.add('active');
        } else {
            fontToggle[key].classList.remove('active');
        }
    });
    
    userPreferences.fontFamily = font;
    saveUserPreferences();
}

/**
 * Sets the font size
 * @param {number} sizeValue - The slider value (1-6)
 */
export function setFontSize(sizeValue) {
    // Remove all font size classes
    document.body.classList.remove(
        'font-size-x0-5', 
        'font-size-x0-75', 
        'font-size-x1', 
        'font-size-x1-5', 
        'font-size-x2', 
        'font-size-x3'
    );
    
    let fontSizeClass;
    let fontSizeMultiplier;
    let sliderValue;
    
    // Map size value to font size class and multiplier
    switch(sizeValue) {
        case 0.5:
            fontSizeClass = 'font-size-x0-5';
            fontSizeMultiplier = 0.5;
            sliderValue = 1;
            break;
        case 0.75: // Default
            fontSizeClass = 'font-size-x0-75';
            fontSizeMultiplier = 0.75;
            sliderValue = 2;
            break;
        case 1:
            fontSizeClass = 'font-size-x1';
            fontSizeMultiplier = 1;
            sliderValue = 3;
            break;
        case 1.5:
        case 2:
            fontSizeClass = 'font-size-x2';
            fontSizeMultiplier = 2;
            sliderValue = 4;
            break;
        default:
            fontSizeClass = 'font-size-x0-75';
            fontSizeMultiplier = 0.75;
            sliderValue = 2;
    }
    
    document.body.classList.add(fontSizeClass);
    document.documentElement.style.setProperty('--font-size-multiplier', fontSizeMultiplier);
    
    // Apply font size to article content and its children
    const articleContent = document.querySelector('.article-content');
    if (articleContent) {
        // Set font size for the article content wrapper
        articleContent.style.fontSize = `calc(1rem * ${fontSizeMultiplier})`;
        
        // Apply font size to all section content
        const sectionContents = document.querySelectorAll('.section-content');
        if (sectionContents && sectionContents.length > 0) {
            sectionContents.forEach(section => {
                section.style.fontSize = `calc(1rem * ${fontSizeMultiplier})`;
            });
        }
        
        // Apply font size to paragraphs, lists and other elements in the article
        const paragraphs = articleContent.querySelectorAll('p');
        if (paragraphs && paragraphs.length > 0) {
            paragraphs.forEach(p => {
                p.style.fontSize = `calc(1rem * ${fontSizeMultiplier})`;
            });
        }
    }
    
    // Update the font size markers to show which one is active
    const markers = document.querySelectorAll('.font-size-marker');
    if (markers && markers.length > 0) {
        markers.forEach((marker, index) => {
            marker.classList.remove('current');
            if ((index + 1) === sliderValue) {
                marker.classList.add('current');
            }
        });
    }
    
    // Update the font size visual example
    const example = document.querySelector('.font-size-example');
    if (example) {
        example.style.fontSize = `calc(20px * ${fontSizeMultiplier})`;
    }
    
    // Update the slider value if it doesn't match and slider exists
    if (fontSizeSlider && parseInt(fontSizeSlider.value) !== sliderValue) {
        fontSizeSlider.value = sliderValue;
    }
    
    userPreferences.fontSize = fontSizeClass;
    userPreferences.fontSizeMultiplier = fontSizeMultiplier;
    saveUserPreferences();
}

/**
 * Saves user preferences to localStorage
 */
export function saveUserPreferences() {
    localStorage.setItem('userPreferences', JSON.stringify(userPreferences));
}

/**
 * Loads user preferences from localStorage
 */
export function loadUserPreferences() {
    const savedPreferences = localStorage.getItem('userPreferences');
    
    if (savedPreferences) {
        const preferences = JSON.parse(savedPreferences);
        
        // Update userPreferences object
        Object.assign(userPreferences, preferences);
        
        // Apply saved preferences
        setTheme(preferences.theme);
        setAccentColor(preferences.accentColor);
        setFontFamily(preferences.fontFamily);
        
        // Set font size based on saved multiplier
        if (preferences.fontSizeMultiplier) {
            setFontSize(preferences.fontSizeMultiplier);
        } else {
            // Default to x0.75 (position 2)
            setFontSize(0.75);
        }
    } else {
        // Default preferences
        setTheme('light');
        setAccentColor('black');
        setFontFamily('inter');
        setFontSize(0.75); // Default to x0.75 (position 2)
    }
}

/**
 * Updates theme-specific elements
 */
export function updateTheme() {
    const isDarkTheme = document.body.classList.contains('dark-theme');
    const icons = document.querySelectorAll('.material-icons');
    if (icons && icons.length > 0) {
        icons.forEach(icon => {
            if (icon) {
                icon.style.color = isDarkTheme ? '#fff' : '#000';
            }
        });
    }
}

// In the existing document ready or setup code, update the fontSizeSlider event listener
fontSizeSlider.addEventListener('input', function() {
    // Convert slider value to font size multiplier
    let fontSizeMultiplier;
    switch(parseInt(this.value)) {
        case 1:
            fontSizeMultiplier = 0.5;
            break;
        case 2:
            fontSizeMultiplier = 0.75; // Default
            break;
        case 3:
            fontSizeMultiplier = 1;
            break;
        case 4:
            fontSizeMultiplier = 2;
            break;
        default:
            fontSizeMultiplier = 0.75;
    }
    
    setFontSize(fontSizeMultiplier);
    saveUserPreferences();
}); 
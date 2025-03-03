/**
 * ES Module exports for localization system
 * This file is used by ES modules to import localization functions
 */

// Export functions for ES modules
export const getLocaleString = (key, ...args) => window.AIPediaLocales.getLocaleString(key, ...args);
export const setLocale = (locale) => window.AIPediaLocales.setLocale(locale);
export const getLocale = () => window.AIPediaLocales.getLocale();
export const updateUIWithLocale = () => window.AIPediaLocales.updateUIWithLocale();
export const loadSavedLocale = () => window.AIPediaLocales.loadSavedLocale(); 
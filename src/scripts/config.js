/**
 * DeepSeek API Configuration
 */
const CONFIG = {
    // API endpoint for DeepSeek
    API_URL: 'https://api.deepseek.com',
    
    // Model to use
    MODEL: 'deepseek-chat',
    
    // Generation parameters
    PARAMS: {
        temperature: 0.7,
        max_tokens: 4000,
        top_p: 0.95,
        frequency_penalty: 0.0,
        presence_penalty: 0.0
    },
    
    // Unsplash API configuration
    UNSPLASH: {
        API_URL: 'https://api.unsplash.com',
        ACCESS_KEY: 'proxy-handled', // API key is managed through the server
        SECRET_KEY: 'proxy-handled', // API key is managed through the server
        APP_ID: 'proxy-handled', // API key is managed through the server
        PARAMS: {
            per_page: 3
        }
    },
    
    // ElevenLabs API configuration
    ELEVENLABS: {
        API_URL: 'https://api.elevenlabs.io/v1',
        API_KEY: '', // API key is now managed through the beta feature
        VOICES: {
            'en': '21m00Tcm4TlvDq8ikWAM', // Rachel (English)
            'fr': 'EXAVITQu4vr4xnSDxMaL', // Antoine (French)
            'es': 'ErXwobaYiN019PkySvjV', // Antoni (Spanish)
            'de': 'jsCqWAovK2LkecY7zXl4'  // Gigi (German)
        },
        DEFAULT_VOICE_ID: '21m00Tcm4TlvDq8ikWAM', // Rachel voice (English)
        MODEL_ID: 'eleven_multilingual_v2' // Using multilingual model for better language support
    },
    
    // System prompt for article generation
    SYSTEM_PROMPT: `You are an AI assistant that generates Wikipedia-style articles. Your task is to create comprehensive, factual, and well-structured content on any topic requested by the user.

Your response must be a valid JSON object with the following structure:
{
    "title": "A descriptive and engaging title for the article",
    "summary": "A concise summary of the topic without any hyperlinks or HTML formatting",
    "sections": [
        {
            "id": "section-id",
            "title": "Section Title",
            "content": "Section content with <a class='wiki-link' href='?q=LinkedTerm'>linked terms</a> to other potential articles"
        }
    ],
    "references": [
        "Reference 1",
        "Reference 2"
    ]
}

Guidelines:
1. Create a descriptive and engaging title, not just repeating the search query
2. Write a clear, concise summary without any hyperlinks or HTML tags
3. Include hyperlinks to other potential articles ONLY in the section content
4. Ensure all HTML is properly formatted and escaped
5. Be factual and informative, including the most recent information available
6. Include at least 3-5 sections with meaningful content
7. Provide at least 3-5 relevant references or citations
8. DO NOT include any explanations or text outside the JSON structure
9. DO NOT include an image URL in your response

Your response must be a single, valid JSON object with no markdown formatting or code blocks.`
};

// Make CONFIG available globally
window.CONFIG = CONFIG;

// API keys should only exist in the .env file and server-side code
// Client-side code should use the proxy endpoints
export const API_KEY = 'proxy-handled';

/**
 * Configuration settings
 */

// Performance tracking
export let startTime;
export let endTime;
export let tokenCount = 0;
export let estimatedCost = 0;

// Application settings
export const APP_SETTINGS = {
    maxArticleLength: 5000,
    maxSearchHistory: 10,
    defaultLanguage: 'en',
    defaultWritingStyle: 'balanced',
    defaultTheme: 'light',
    defaultFontFamily: 'inter',
    defaultFontSize: 'medium',
    defaultAccentColor: 'black',
    apiEndpoints: {
        deepseek: 'https://api.deepseek.com/v1/chat/completions',
        elevenlabs: 'https://api.elevenlabs.io/v1/text-to-speech',
        unsplash: 'https://source.unsplash.com/featured'
    },
    voiceId: '21m00Tcm4TlvDq8ikWAM', // ElevenLabs voice ID
    supportedLanguages: [
        { code: 'en', name: 'English' },
        { code: 'es', name: 'Spanish' },
        { code: 'fr', name: 'French' },
        { code: 'de', name: 'German' },
        { code: 'it', name: 'Italian' },
        { code: 'pt', name: 'Portuguese' },
        { code: 'ru', name: 'Russian' },
        { code: 'zh', name: 'Chinese' },
        { code: 'ja', name: 'Japanese' },
        { code: 'ko', name: 'Korean' }
    ],
    writingStyles: [
        { value: 'balanced', label: 'Balanced' },
        { value: 'academic', label: 'Academic' },
        { value: 'simple', label: 'Simple' },
        { value: 'creative', label: 'Creative' },
        { value: 'professional', label: 'Professional' },
        { value: 'conversational', label: 'Conversational' }
    ]
}; 
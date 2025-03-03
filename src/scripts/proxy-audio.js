// Modified function for text-to-speech API calls through the proxy
// This would be added to your audio.js file

/**
 * Generates speech from text using the selected TTS API.
 */
export async function generateSpeech(text) {
    try {
        console.log('Generating speech...');
        
        // Check if TTS feature is enabled
        if (!window.AIPediaUtils.isElevenLabsBetaEnabled()) {
            throw new Error('Text-to-speech feature is not enabled');
        }
        
        // Determine which API to use
        const apiSelection = window.AIPediaUtils.getSelectedTTSApi();
        console.log(`Using TTS API: ${apiSelection}`);
        
        if (apiSelection === 'elevenlabs') {
            return await generateElevenLabsSpeech(text);
        } else {
            return await generateFreeSpeech(text);
        }
    } catch (error) {
        console.error('Error generating speech:', error);
        throw error;
    }
}

/**
 * Generates speech using the ElevenLabs API.
 */
async function generateElevenLabsSpeech(text) {
    // Voice ID is hardcoded for simplicity, but could be made dynamic
    const voiceId = '21m00Tcm4TlvDq8ikWAM'; // Rachel voice
    
    // Get API key
    const apiKey = window.AIPediaUtils.getElevenLabsApiKey();
    if (!apiKey) {
        throw new Error('ElevenLabs API key not found');
    }
    
    // Make API request to our proxy server
    const response = await fetch(`/api/elevenlabs/tts/${voiceId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'xi-api-key': apiKey
        },
        body: JSON.stringify({
            text: text,
            model_id: 'eleven_multilingual_v2',
            voice_settings: {
                stability: 0.5,
                similarity_boost: 0.5
            }
        })
    });
    
    if (!response.ok) {
        throw new Error(`ElevenLabs API request failed with status ${response.status}`);
    }
    
    // Convert the response to an audio blob
    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    
    return {
        audioUrl,
        audioBlob
    };
}

/**
 * Generates speech using the free TTS API.
 */
async function generateFreeSpeech(text) {
    // Use the browser's built-in SpeechSynthesis API or a free TTS API
    // For this example, we'll use a simple proxy endpoint that uses a free TTS service
    
    const response = await fetch('/api/free-tts', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            text: text,
            voice: 'en-US' // Default voice
        })
    });
    
    if (!response.ok) {
        throw new Error(`Free TTS API request failed with status ${response.status}`);
    }
    
    // Convert the response to an audio blob
    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    
    return {
        audioUrl,
        audioBlob
    };
} 
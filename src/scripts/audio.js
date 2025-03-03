/**
 * Audio-related functionality
 */

// Get formatAudioTime from the global AIPediaUtils object
const { formatAudioTime, getElevenLabsApiKey, isElevenLabsBetaEnabled } = window.AIPediaUtils || {};
import { getLocaleString } from './locales-module.js';

// Audio player state
export let audioElement = null;
export let isPlaying = false;

/**
 * Sets up the audio player for an article
 * @param {Object} articleData - The article data
 */
export function setupAudioPlayer(articleData) {
    // Check if ElevenLabs beta feature is enabled
    if (!isElevenLabsBetaEnabled()) {
        console.log('ElevenLabs beta feature is not enabled, skipping audio player setup');
        return;
    }
    
    // Check if API key is available
    const apiKey = getElevenLabsApiKey();
    if (!apiKey) {
        console.log('No ElevenLabs API key available, skipping audio player setup');
        return;
    }
    
    // Create audio player elements first
    const articleHeader = document.querySelector('.article-header');
    const articleSummaryContainer = document.querySelector('.article-summary-container');
    
    if (!articleHeader || !articleSummaryContainer) {
        console.error('Article header or summary container not found');
        // Add a retry mechanism with a small delay to wait for the article header to be created
        setTimeout(() => {
            setupAudioPlayer(articleData);
        }, 100);
        return;
    }
    
    // Create audio player
    const audioPlayer = document.createElement('div');
    audioPlayer.className = 'audio-player';
    audioPlayer.style.marginBottom = '20px'; // Ensure it has some margin
    audioPlayer.style.display = 'block'; // Ensure it's visible
    audioPlayer.innerHTML = `
        <div class="audio-controls">
            <button class="audio-play-button" id="audio-play-button">
                <i data-lucide="play"></i>
            </button>
            <div class="audio-progress-container" id="audio-progress">
                <div class="audio-progress-fill" id="audio-progress-fill"></div>
            </div>
            <div class="audio-time" id="audio-time">0:00 / 0:00</div>
        </div>
        <div class="audio-error" id="audio-error" style="display: none;">
            <p>${getLocaleString('tts_not_available')}</p>
        </div>
    `;
    
    // Insert after the article summary container
    articleSummaryContainer.insertAdjacentElement('afterend', audioPlayer);
    
    // Initialize Lucide icons
    if (window.lucide) {
        window.lucide.createIcons();
    }
    
    // Now get references to the elements
    const audioPlayButton = document.getElementById('audio-play-button');
    const audioProgress = document.getElementById('audio-progress');
    const audioProgressFill = document.getElementById('audio-progress-fill');
    const audioTime = document.getElementById('audio-time');
    const audioError = document.getElementById('audio-error');
    
    // Create audio element if it doesn't exist
    if (!audioElement) {
        audioElement = new Audio();
        window.audioElement = audioElement;
    }
    
    // Reset audio player state
    isPlaying = false;
    window.isPlaying = isPlaying;
    
    // Add event listeners
    audioPlayButton.addEventListener('click', toggleAudio);
    
    // Add progress bar click event
    audioProgress.addEventListener('click', (e) => {
        if (!audioElement.src) {
            return;
        }
        
        const rect = audioProgress.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        audioElement.currentTime = pos * audioElement.duration;
    });
    
    // Add audio events
    audioElement.addEventListener('timeupdate', updateAudioProgress);
    audioElement.addEventListener('ended', () => {
        isPlaying = false;
        window.isPlaying = isPlaying;
        updatePlayPauseIcon('play');
        audioProgressFill.style.width = '0%';
        audioElement.currentTime = 0;
    });
    
    audioElement.addEventListener('canplay', () => {
        audioError.style.display = 'none';
    });
    
    audioElement.addEventListener('error', () => {
        audioError.style.display = 'block';
        updatePlayPauseIcon('play');
        isPlaying = false;
        window.isPlaying = false;
    });
    
    /**
     * Toggles audio playback
     */
    function toggleAudio() {
        if (!audioElement.src) {
            // Show loading state
            updatePlayPauseIcon('loader');
            
            // Add a rotating animation to the loader icon
            const loaderIcon = audioPlayButton.querySelector('i');
            if (loaderIcon) {
                loaderIcon.style.animation = 'spin 1s linear infinite';
            }
            
            // Generate speech if not already generated
            generateSpeech(getArticleText(articleData))
                .then(audioUrl => {
                    audioElement.src = audioUrl;
                    audioElement.play();
                    isPlaying = true;
                    window.isPlaying = isPlaying;
                    updatePlayPauseIcon('pause');
                    
                    // Remove the animation
                    if (loaderIcon) {
                        loaderIcon.style.animation = '';
                    }
                })
                .catch(error => {
                    console.error('Error generating speech:', error);
                    audioError.style.display = 'block';
                    updatePlayPauseIcon('play');
                    
                    // Remove the animation
                    if (loaderIcon) {
                        loaderIcon.style.animation = '';
                    }
                });
        } else if (isPlaying) {
            audioElement.pause();
            isPlaying = false;
            window.isPlaying = isPlaying;
            updatePlayPauseIcon('play');
        } else {
            audioElement.play();
            isPlaying = true;
            window.isPlaying = isPlaying;
            updatePlayPauseIcon('pause');
        }
    }
    
    /**
     * Updates the audio progress bar
     */
    function updateAudioProgress() {
        if (!audioElement.duration) {
            return;
        }
        
        const progress = (audioElement.currentTime / audioElement.duration) * 100;
        audioProgressFill.style.width = `${progress}%`;
        
        audioTime.textContent = `${formatAudioTime(audioElement.currentTime)} / ${formatAudioTime(audioElement.duration)}`;
    }
    
    /**
     * Updates the play/pause icon
     * @param {string} iconName - The icon name
     */
    function updatePlayPauseIcon(iconName) {
        const icon = audioPlayButton.querySelector('i');
        if (icon) {
            icon.setAttribute('data-lucide', iconName);
            if (window.lucide) {
                window.lucide.createIcons();
            }
        }
    }
    
    // Initial icon setup
    updatePlayPauseIcon('play');
    audioProgressFill.style.width = '0%';
    audioTime.textContent = '0:00 / 0:00';
    
    /**
     * Gets the article text for speech generation
     * @param {Object} articleData - The article data
     * @returns {string} - The article text
     */
    function getArticleText(articleData) {
        // Only use the title and summary for the audio
        let text = `${articleData.title}. ${articleData.summary}`;
        
        // Limit text length for API
        return text.substring(0, 5000);
    }
}

/**
 * Generates speech from text
 * @param {string} text - The text to convert to speech
 * @returns {Promise<string>} - The audio URL
 */
export async function generateSpeech(text) {
    try {
        // Check if ElevenLabs beta feature is enabled
        if (!isElevenLabsBetaEnabled()) {
            throw new Error('ElevenLabs beta feature is not enabled');
        }
        
        // Get the API key from the beta feature
        const elevenlabsApiKey = getElevenLabsApiKey();
        
        console.log('Using ElevenLabs API key:', elevenlabsApiKey ? 'Found' : 'Not found');
        
        if (!elevenlabsApiKey) {
            throw new Error('ElevenLabs API key not found');
        }
        
        // Make API request to ElevenLabs through our proxy
        const response = await fetch('/api/elevenlabs/tts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'xi-api-key': elevenlabsApiKey
            },
            body: JSON.stringify({
                text: text,
                voice_id: '21m00Tcm4TlvDq8ikWAM',
                model_id: 'eleven_monolingual_v1',
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.5
                }
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('ElevenLabs API error:', errorData);
            throw new Error(`Failed to generate speech: ${response.status} ${response.statusText}`);
        }
        
        // Convert response to blob
        const blob = await response.blob();
        
        // Create object URL
        return URL.createObjectURL(blob);
    } catch (error) {
        console.error('Error generating speech:', error);
        throw error;
    }
} 
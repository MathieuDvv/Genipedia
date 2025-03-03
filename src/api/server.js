// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Rate limiting middleware
const rateLimiter = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 3, // Increased from 2 to 3 requests per minute per IP
  dailyLimit: 300, // 300 requests per day per IP
  requestCounts: new Map(),
  dailyCounts: new Map(),
  
  resetDaily() {
    this.dailyCounts.clear();
    console.log('Daily rate limits reset');
  },
  
  middleware(req, res, next) {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const now = Date.now();
    
    // Initialize or get current counts
    if (!this.requestCounts.has(ip)) {
      this.requestCounts.set(ip, []);
    }
    
    if (!this.dailyCounts.has(ip)) {
      this.dailyCounts.set(ip, 0);
    }
    
    // Get current request times and daily count
    const requests = this.requestCounts.get(ip);
    let dailyCount = this.dailyCounts.get(ip);
    
    // Clean up old requests outside the window
    const recentRequests = requests.filter(time => (now - time) < this.windowMs);
    this.requestCounts.set(ip, recentRequests);
    
    // Check if rate limited
    if (recentRequests.length >= this.maxRequests) {
      const oldestRequest = Math.min(...recentRequests);
      const resetTime = Math.ceil((this.windowMs - (now - oldestRequest)) / 1000);
      
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Too many requests, please try again later.',
        retryAfter: resetTime
      });
    }
    
    // Check daily limit
    if (dailyCount >= this.dailyLimit) {
      return res.status(429).json({
        error: 'Daily limit exceeded',
        message: 'You have reached your daily request limit.',
        retryAfter: 'tomorrow'
      });
    }
    
    // Update counts
    recentRequests.push(now);
    this.requestCounts.set(ip, recentRequests);
    this.dailyCounts.set(ip, dailyCount + 1);
    
    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', this.maxRequests);
    res.setHeader('X-RateLimit-Remaining', this.maxRequests - recentRequests.length);
    res.setHeader('X-RateLimit-Reset', Math.ceil((now + this.windowMs) / 1000));
    
    next();
  }
};

// Setup daily reset for rate limiter
setInterval(() => {
  rateLimiter.resetDaily();
}, 24 * 60 * 60 * 1000); // Reset every 24 hours

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../../')));

// Apply rate limiting to API endpoints
app.use('/api/', (req, res, next) => rateLimiter.middleware(req, res, next));

// Proxy endpoint for DeepSeek API with token limits
app.post('/api/deepseek', async (req, res) => {
  try {
    // Validate and enforce token limits
    if (req.body.messages && Array.isArray(req.body.messages)) {
      // Calculate approximate token count based on characters
      const messageText = req.body.messages.map(msg => msg.content).join(' ');
      const estimatedTokens = Math.ceil(messageText.length / 4); // Rough estimate: 4 chars per token
      
      // Set reasonable limits
      const MAX_TOKENS = 4000;
      
      if (estimatedTokens > MAX_TOKENS) {
        return res.status(400).json({
          error: 'Token limit exceeded',
          message: 'Your request exceeds the maximum allowed tokens.'
        });
      }
    }
    
    // Optimize: Set timeout for the API request
    const TIMEOUT_MS = 110000; // Increase to 110 seconds timeout
    
    // Create a promise that rejects after the timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timed out')), TIMEOUT_MS);
    });
    
    // Create the actual API request promise
    const apiRequestPromise = (async () => {
      // Forward the request to DeepSeek API
      const apiKey = process.env.DEEPSEEK_API_KEY;
      if (!apiKey) {
        throw new Error('DeepSeek API key not configured');
      }
      
      const apiResponse = await axios.post('https://api.deepseek.com/v1/chat/completions', req.body, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        timeout: TIMEOUT_MS - 1000 // Set axios timeout slightly shorter than our promise timeout
      });
      
      return apiResponse.data;
    })();
    
    // Race between the API request and the timeout
    const result = await Promise.race([apiRequestPromise, timeoutPromise]);
    
    // Return the API response
    res.json(result);
    
  } catch (error) {
    console.error('DeepSeek API error:', error.message);
    
    // Handle specific error types
    if (error.message === 'Request timed out') {
      return res.status(504).json({
        error: {
          message: 'The request to DeepSeek API timed out. Please try again with a simpler query.'
        }
      });
    }
    
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      return res.status(error.response.status).json({
        error: {
          message: error.response.data.error?.message || 'Error from DeepSeek API'
        }
      });
    } else if (error.request) {
      // The request was made but no response was received
      return res.status(503).json({
        error: {
          message: 'No response received from DeepSeek API. Please try again.'
        }
      });
    } else {
      // Something happened in setting up the request that triggered an Error
      return res.status(500).json({
        error: {
          message: 'Internal server error when connecting to DeepSeek API.'
        }
      });
    }
  }
});

// Proxy endpoint for Unsplash API
app.get('/api/unsplash/photos/random', async (req, res) => {
  try {
    const query = req.query.query;
    
    // Validate query parameter
    if (!query || query.length > 100) {
      return res.status(400).json({
        error: 'Invalid query',
        message: 'Query parameter is required and must be less than 100 characters.'
      });
    }
    
    // Sanitize the query - remove any potentially harmful characters
    const sanitizedQuery = query.replace(/[^\w\s-]/g, '').trim();
    
    if (!sanitizedQuery) {
      return res.status(400).json({
        error: 'Invalid query',
        message: 'Query contains invalid characters.'
      });
    }
    
    const response = await axios.get(`https://api.unsplash.com/photos/random`, {
      params: {
        query: sanitizedQuery,
        client_id: process.env.UNSPLASH_ACCESS_KEY
      }
    });
    res.json(response.data);
  } catch (error) {
    console.error('Unsplash API error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data || 'Internal Server Error'
    });
  }
});

// Proxy endpoint for Unsplash download tracking
app.get('/api/unsplash/download', async (req, res) => {
  try {
    const downloadUrl = req.query.url;
    if (!downloadUrl) {
      return res.status(400).json({ error: 'Missing URL parameter' });
    }
    
    const response = await axios.get(downloadUrl, {
      headers: {
        'Authorization': `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`
      }
    });
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Unsplash download tracking error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data || 'Internal Server Error'
    });
  }
});

// Proxy endpoint for ElevenLabs text-to-speech
app.post('/api/elevenlabs/tts/:voiceId', async (req, res) => {
  try {
    const { voiceId } = req.params;
    
    // Use API key from request headers if available (for beta users), otherwise use env variable
    const apiKey = req.headers['xi-api-key'] || process.env.ELEVENLABS_API_KEY;
    
    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      req.body,
      {
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': apiKey
        },
        responseType: 'arraybuffer'
      }
    );
    
    // Set the same headers as the original response
    res.set('Content-Type', 'audio/mpeg');
    res.send(response.data);
  } catch (error) {
    console.error('ElevenLabs API error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: 'Text-to-speech error'
    });
  }
});

// Proxy endpoint for ElevenLabs voices
app.get('/api/elevenlabs/voices', async (req, res) => {
  try {
    // Use API key from request headers if available (for beta users), otherwise use env variable
    const apiKey = req.headers['xi-api-key'] || process.env.ELEVENLABS_API_KEY;
    
    const response = await axios.get('https://api.elevenlabs.io/v1/voices', {
      headers: {
        'xi-api-key': apiKey
      }
    });
    res.json(response.data);
  } catch (error) {
    console.error('ElevenLabs voices API error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: 'Failed to fetch voices'
    });
  }
});

// Free TTS API endpoint
app.post('/api/free-tts', async (req, res) => {
  try {
    const { text, voice = 'en-US' } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }
    
    // Use Google Translate TTS as a free alternative
    // This is a simple implementation and might need to be adjusted based on usage limits
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${voice}&client=tw-ob`;
    
    const response = await axios({
      method: 'get',
      url: url,
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    // Set the content type header
    res.set('Content-Type', 'audio/mpeg');
    res.send(response.data);
  } catch (error) {
    console.error('Free TTS API error:', error.message);
    res.status(500).json({
      error: 'Text-to-speech error'
    });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 
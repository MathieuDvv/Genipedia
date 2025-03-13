# Genipedia

Genipedia is a web application that provides AI-generated articles on various topics with a clean, responsive interface.

Available right now on genipedia.org

## Project Structure

```
Genipedia/
├── app.js                  # Main entry point that loads the server
├── index.html              # Main HTML file
├── package.json            # Project dependencies and scripts
├── .env                    # Environment variables (not tracked in git)
├── src/
│   ├── api/                # Server-side code
│   │   └── server.js       # Express server with API proxies
│   ├── styles/             # CSS stylesheets
│   │   ├── styles.css      # Main stylesheet
│   │   └── mobile.css      # Mobile-specific styles
│   ├── scripts/            # JavaScript files
│   │   ├── main.js         # Main application logic
│   │   ├── article.js      # Article generation and rendering
│   │   ├── audio.js        # Text-to-speech functionality
│   │   ├── config.js       # Application configuration
│   │   ├── dom.js          # DOM manipulation utilities
│   │   ├── locales.js      # Internationalization support
│   │   ├── locales-modules.js # Internationalization support connector
│   │   ├── preferences.js  # User preferences handling
│   │   ├── proxy-article.js # Proxy article generation
│   │   ├── proxy-config.js # Proxy configuration
│   │   ├── proxy-audio.js # Proxy audio generation
│   │   ├── proxy-utils.js # Proxy utilities
│   │   ├── search.js       # Search functionality
│   │   └── utils.js        # Utility functions
│   └── assets/ Genipedia.png # Logo in png
```

## Setup

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Set up your environment variables:
   ```
   cp .env.example .env
   ```
   Then edit the `.env` file and add your API keys:
   ```
   DEEPSEEK_API_KEY=your_deepseek_api_key
   UNSPLASH_ACCESS_KEY=your_unsplash_access_key
   UNSPLASH_SECRET_KEY=your_unsplash_secret_key
   ELEVENLABS_API_KEY=your_elevenlabs_api_key
   PORT=3000
   ```

   ### API Keys Setup

   #### DeepSeek API Key
   - Sign up for an account at [DeepSeek](https://www.deepseek.com/)
   - Navigate to your account settings to find your API key
   - Add it to the `.env` file as `DEEPSEEK_API_KEY`

   #### Unsplash API Keys
   - Create a developer account at [Unsplash](https://unsplash.com/developers)
   - Register a new application to get your Access Key and Secret Key
   - Add them to the `.env` file as `UNSPLASH_ACCESS_KEY` and `UNSPLASH_SECRET_KEY`

   #### ElevenLabs API Key
   - Create an account at [ElevenLabs](https://elevenlabs.io)
   - Find your API key in your profile settings
   - Add it to the `.env` file as `ELEVENLABS_API_KEY`

4. Start the server:
   ```
   npm start
   ```
   
## Development

For development with auto-restart on file changes:
```
npm run dev
```

## Features

- AI-generated articles on any topic
- Text-to-speech functionality
- Customizable themes and font sizes
- Responsive design for mobile and desktop
- Multi-language support
- Search history
- Image integration with Unsplash
- Article caching for improved performance

## Technologies Used

- Node.js and Express for the backend
- Vanilla JavaScript for the frontend
- CSS for styling
- DeepSeek API for AI content generation
- ElevenLabs API for text-to-speech
- Unsplash API for images

## API Keys

The application requires the following API keys:

### DeepSeek API
Required for AI-powered article generation. Get your API key from [DeepSeek](https://deepseek.com).

### Unsplash API
Required for fetching relevant images for articles. Get your API key from [Unsplash](https://unsplash.com/developers).

### ElevenLabs API
Required for text-to-speech functionality. Get your API key from [ElevenLabs](https://elevenlabs.io).

Add these keys to your `.env` file as described in the Setup section.

## Caching

AIPedia includes a caching system to improve performance and reduce API calls:

- **Article Caching**: Generated articles are cached in the browser's session storage
- **Image Caching**: Images fetched from Unsplash are also cached
- **Cache Toggle**: Users can enable or disable caching via the settings menu
- **Cache Indicators**: The geek metrics display shows when content is loaded from cache
- **Cache Clearing**: Cache is automatically cleared when caching is disabled

The caching system helps reduce API costs and improves loading times for previously searched topics.

# Setting Up the Proxy Server for AIPedia

This guide explains how to set up the Node.js proxy server to secure your API keys while keeping your website functioning exactly as before.

## Overview

The proxy server handles API requests to:
- DeepSeek for article generation
- Unsplash for images
- ElevenLabs for text-to-speech

All API keys are stored in a `.env` file on the server, keeping them hidden from users.

## Setup Instructions

### 1. Install Dependencies

First, make sure you have Node.js installed, then run:

```bash
npm install express cors axios dotenv
npm install nodemon --save-dev
```

### 2. Create a `.env` File

Create a `.env` file in your project root with your API keys:

```
DEEPSEEK_API_KEY=your_deepseek_api_key
UNSPLASH_ACCESS_KEY=your_unsplash_access_key
UNSPLASH_SECRET_KEY=your_unsplash_secret_key
ELEVENLABS_API_KEY=your_elevenlabs_api_key
PORT=3000
```

### 3. Update Your Website

You have two options:

#### Option 1: Deploy with the proxy server (Recommended)

1. Keep your existing files as they are
2. Deploy the server and let it serve the static files
3. Access your site through the server URL (e.g., `http://localhost:3000`)

#### Option 2: Modify your site to use the proxy

If you want to keep deploying your static files separately, you'll need to:

1. Replace `js/config.js` with `js/proxy-config.js`
2. Add the proxy functions from `js/proxy-article.js` to your `js/article.js`
3. Add the proxy functions from `js/proxy-utils.js` to your `js/utils.js`
4. Add the proxy functions from `js/proxy-audio.js` to your `js/audio.js`
5. Update references to API endpoints in your code

### 4. Start the Server

```bash
# For development
npm run dev

# For production
npm start
```

## Deploying to Production

### Deploying to Heroku

1. Create a Heroku account and install the Heroku CLI
2. Initialize a Git repository if you haven't already:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```
3. Create a Heroku app:
   ```bash
   heroku create your-app-name
   ```
4. Set environment variables:
   ```bash
   heroku config:set DEEPSEEK_API_KEY=your_key
   heroku config:set UNSPLASH_ACCESS_KEY=your_key
   heroku config:set UNSPLASH_SECRET_KEY=your_key
   heroku config:set ELEVENLABS_API_KEY=your_key
   ```
5. Deploy your code:
   ```bash
   git push heroku main
   ```

### Deploying to Vercel or Netlify

1. Create an account
2. Connect your repository
3. Add environment variables in the dashboard
4. Deploy

## Testing the Proxy

1. Start the server locally 
2. Open your browser to `http://localhost:3000`
3. Try searching for an article to test the DeepSeek API
4. Check that images load correctly (Unsplash API)
5. Test the text-to-speech functionality (ElevenLabs API)

Everything should work exactly as before, but now your API keys are secure!

## Troubleshooting

If you encounter issues:

- Check the server logs for error messages
- Verify your API keys are correct in the `.env` file
- Make sure the server is running on the expected port
- Check browser console for any frontend errors

## Security Note

While this proxy setup hides your API keys from users, remember that all requests are still being made on behalf of your server. Be sure to monitor usage to prevent abuse of your API quotas. 
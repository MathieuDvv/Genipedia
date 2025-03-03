# AIPedia Server Proxy

This server acts as a proxy for the AIPedia web application, securing API keys and endpoints while maintaining all existing functionality.

## Features

- Securely hides API keys from client-side code
- Proxies requests to DeepSeek, Unsplash, and ElevenLabs APIs
- Maintains all existing website functionality without modifying the HTML, CSS, or JS

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

## Installation

1. Clone this repository
2. Install dependencies:
```
npm install
```
3. Create a `.env` file with your API keys:
```
DEEPSEEK_API_KEY=your_deepseek_api_key
UNSPLASH_ACCESS_KEY=your_unsplash_access_key
UNSPLASH_SECRET_KEY=your_unsplash_secret_key
ELEVENLABS_API_KEY=your_elevenlabs_api_key
PORT=3000
```

## Usage

1. Start the server:
```
npm start
```

2. Access the application at `http://localhost:3000`

## Development

For development with auto-restart on code changes:
```
npm run dev
```

## Deployment

To deploy to a production environment, you can use services like:

- Heroku
- Vercel
- DigitalOcean
- AWS Elastic Beanstalk

Make sure to set your environment variables in your production environment.

## How It Works

The server works by:

1. Serving static files from the project root directory
2. Intercepting API calls and routing them through server-side proxies
3. Injecting the server's API keys into the requests instead of exposing them to the client

## API Endpoints

- `/api/deepseek` - Proxy for DeepSeek API
- `/api/unsplash/photos/random` - Proxy for Unsplash photo search
- `/api/elevenlabs/tts/:voiceId` - Proxy for ElevenLabs text-to-speech
- `/api/elevenlabs/voices` - Proxy for ElevenLabs voices list

## Security Considerations

- All API keys are stored in environment variables, not in the code
- The server never exposes API keys to the client
- The proxy includes error handling to prevent sensitive data leakage

## License

[MIT](LICENSE) 
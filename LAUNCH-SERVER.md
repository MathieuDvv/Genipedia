# Launching the AIPedia Proxy Server

This quick guide will help you launch and test your proxy server for AIPedia.

## Prerequisites

Make sure you have:

1. Node.js installed (v14 or higher)
2. Created the `.env` file with your API keys
3. Installed all dependencies with `npm install`

## Launch Steps

### 1. Start the server

In your terminal, run:

```bash
# For development (auto-restart on changes)
npm run dev

# OR for production
npm start
```

You should see output like:
```
Server running on port 3000
```

### 2. Test the proxy server

1. Open your web browser and go to:
   ```
   http://localhost:3000/proxy-test.html
   ```

2. Click the test buttons to verify each API works through the proxy:
   - DeepSeek API Test
   - Unsplash API Test
   - ElevenLabs API Test

3. If all tests pass, you're ready to use the main application:
   ```
   http://localhost:3000/
   ```

## Troubleshooting

### If the server won't start:
- Check that port 3000 is not already in use
- Make sure all dependencies are installed
- Verify your `.env` file exists and has the correct format

### If API tests fail:
- Check the server console for error messages
- Verify your API keys are correct in the `.env` file
- Make sure you have valid subscriptions to the services

## Usage in Production

Remember to:

1. Use `npm start` for production environments
2. Set appropriate environment variables
3. Consider using a process manager like PM2 for reliability

## Monitoring

You can monitor API usage by checking the server logs, which will show all requests and any errors that occur.

Happy publishing with your secure API proxy! 
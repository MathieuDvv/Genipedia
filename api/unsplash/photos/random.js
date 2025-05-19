// Unsplash random photos API route handler
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { query } = req.query;
    const response = await fetch(
      `https://api.unsplash.com/photos/random?query=${encodeURIComponent(query)}`,
      {
        headers: {
          'Authorization': `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`
        }
      }
    );

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    console.error('Unsplash API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 
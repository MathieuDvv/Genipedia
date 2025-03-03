/**
 * Fetches an image from Unsplash using the proxy server.
 */
async function fetchImageFromUnsplash(query) {
    try {
        const cleanQuery = query.replace(/[^\w\s]/gi, '').trim();
        const url = `/api/unsplash/photos/random?query=${encodeURIComponent(cleanQuery)}`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Unsplash API request failed with status ${response.status}`);
        }
        
        const data = await response.json();
        
        // If we got a valid response, return the image data
        if (data && data.urls) {
            return {
                success: true,
                imageUrl: data.urls.regular,
                imageAlt: data.alt_description || query,
                credit: {
                    name: data.user.name,
                    username: data.user.username,
                    link: data.user.links.html,
                    downloadLocation: data.links.download_location
                }
            };
        } else {
            throw new Error('Invalid response from Unsplash API');
        }
    } catch (error) {
        console.error('Error fetching image from Unsplash:', error);
        return { success: false };
    }
}

/**
 * Trigger download tracking on Unsplash through the proxy.
 */
async function triggerUnsplashDownload(sourceUrl) {
    try {
        const response = await fetch(`/api/unsplash/download?url=${encodeURIComponent(sourceUrl)}`, {
            method: 'GET'
        });
        return response.ok;
    } catch (error) {
        console.error('Error triggering Unsplash download:', error);
        return false;
    }
} 
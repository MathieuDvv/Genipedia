export const config = {
    runtime: 'edge'
};

export default async function handler(req) {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response(null, {
            status: 204,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            },
        });
    }

    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed', message: 'Only POST requests are allowed' }), {
            status: 405,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
        });
    }

    try {
        const body = await req.json();

        // Validate request body
        if (!body.messages || !Array.isArray(body.messages)) {
            throw new Error('Invalid request body: messages array is required');
        }

        const API_KEY = process.env.DEEPSEEK_API_KEY;
        if (!API_KEY) {
            throw new Error('DEEPSEEK_API_KEY is not set');
        }

        const response = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: body.model || 'deepseek-v4-flash',
                messages: body.messages,
                temperature: body.temperature || 0.7,
                max_tokens: body.max_tokens || 8192,
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('DeepSeek API error detail:', errorText);
            let errorJson;
            try {
                errorJson = JSON.parse(errorText);
            } catch (e) {
                errorJson = { error: { message: errorText } };
            }

            return new Response(JSON.stringify({
                error: errorJson.error?.message || 'DeepSeek API error',
                message: 'Failed to get response from DeepSeek API'
            }), {
                status: response.status,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
            });
        }

        const data = await response.json();

        return new Response(JSON.stringify(data), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
        });
    } catch (error) {
        console.error('DeepSeek API handler error:', error);
        return new Response(JSON.stringify({
            error: 'Internal server error',
            message: error.message
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
        });
    }
}

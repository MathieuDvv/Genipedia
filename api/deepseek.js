export const config = {
    runtime: 'edge'
};

export default async function handler(req) {
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
        return new Response(JSON.stringify({ error: { message: 'Method not allowed' } }), {
            status: 405,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
        });
    }

    try {
        const body = await req.json();

        if (!body.messages || !Array.isArray(body.messages)) {
            return new Response(JSON.stringify({ error: { message: 'Invalid request body: messages array is required' } }), {
                status: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            });
        }

        const API_KEY = process.env.DEEPSEEK_API_KEY;
        if (!API_KEY) {
            return new Response(JSON.stringify({ error: { message: 'DEEPSEEK_API_KEY environment variable is not set on Vercel' } }), {
                status: 500,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            });
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
            let errorMessage = errorText;
            try {
                const errorJson = JSON.parse(errorText);
                errorMessage = errorJson.error?.message || errorText;
            } catch (e) {
                // use raw text
            }

            return new Response(JSON.stringify({ error: { message: errorMessage } }), {
                status: response.status,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            });
        }

        const data = await response.json();

        return new Response(JSON.stringify(data), {
            status: 200,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
    } catch (error) {
        console.error('DeepSeek API handler error:', error);
        return new Response(JSON.stringify({ error: { message: error.message || 'Internal server error' } }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
    }
}

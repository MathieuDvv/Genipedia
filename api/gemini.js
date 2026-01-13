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

        // Extract system prompt and user messages
        const systemMessage = body.messages.find(m => m.role === 'system');
        const userMessages = body.messages.filter(m => m.role !== 'system');

        // Construct Gemini request payload
        const geminiPayload = {
            contents: userMessages.map(msg => ({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{ text: msg.content }]
            })),
            generationConfig: {
                temperature: body.temperature || 0.7,
                maxOutputTokens: body.max_tokens || 8192,
            }
        };

        if (systemMessage) {
            geminiPayload.systemInstruction = {
                parts: [{ text: systemMessage.content }]
            };
        }

        const API_KEY = process.env.GEMINI_API_KEY;
        if (!API_KEY) {
            throw new Error('GEMINI_API_KEY is not set');
        }

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(geminiPayload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Gemini API error detail:', errorText);
            let errorJson;
            try {
                errorJson = JSON.parse(errorText);
            } catch (e) {
                errorJson = { error: { message: errorText } };
            }

            return new Response(JSON.stringify({
                error: errorJson.error?.message || 'Gemini API error',
                message: 'Failed to get response from Gemini API'
            }), {
                status: response.status,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
            });
        }

        const data = await response.json();

        // Transform Gemini response to OpenAI format for frontend compatibility
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        const transformedResponse = {
            choices: [
                {
                    message: {
                        role: 'assistant',
                        content: content
                    }
                }
            ]
        };

        return new Response(JSON.stringify(transformedResponse), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
        });
    } catch (error) {
        console.error('Gemini API handler error:', error);
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

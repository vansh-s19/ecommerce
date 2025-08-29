const fetch = require('node-fetch');

exports.handler = async (event, context) => {
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    console.log('Function called with method:', event.httpMethod);

    try {
        // Handle preflight OPTIONS request
        if (event.httpMethod === "OPTIONS") {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ message: "CORS preflight" })
            };
        }

        // Only allow POST
        if (event.httpMethod !== "POST") {
            console.log('Method not allowed:', event.httpMethod);
            return {
                statusCode: 405,
                headers,
                body: JSON.stringify({ error: "Method Not Allowed" })
            };
        }

        // Parse request body
        let body;
        try {
            body = JSON.parse(event.body || "{}");
            console.log('Parsed request body:', { hasSpecs: !!body.specs });
        } catch (e) {
            console.error('JSON parse error:', e);
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: "Invalid JSON in request body" })
            };
        }

        const { specs } = body;

        // Validate specs
        if (!specs || typeof specs !== 'string' || specs.trim() === "") {
            console.log('Invalid specs provided');
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    error: "Product specifications are required and must be a non-empty string" 
                })
            };
        }

        // Check specs length
        if (specs.trim().length > 2000) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    error: "Product specifications are too long. Please limit to 2000 characters."
                })
            };
        }

        // Get API key
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error("GEMINI_API_KEY not found in environment");
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: "Server configuration error - API key missing" })
            };
        }

        console.log('API key found, making Gemini request for specs:', specs.substring(0, 50) + '...');

        // Gemini API URL
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        
        // Create the prompt
        const prompt = `You are an expert Indian market price analyst. Analyze these product specifications and predict the current market price in India: "${specs.trim()}"

Consider:
- Current Indian market prices from major platforms (Amazon India, Flipkart, etc.)
- Product condition, brand, specifications
- Local demand and supply factors
- GST and import duties if applicable
- Regional price variations

Respond with ONLY valid JSON in this exact format:
{
    "predicted_price_inr": 50000,
    "range_inr": {"min": 45000, "max": 55000},
    "confidence": 0.8,
    "product": "Clean Product Name",
    "category": "Product Category",
    "specs_extracted": {"brand": "value", "model": "value"},
    "explanation_bullets": [
        "Price based on current market analysis",
        "Considered brand positioning in India",
        "Factored in local demand and availability"
    ],
    "anomalies": [],
    "market_sources": ["Amazon India", "Flipkart"],
    "last_updated": "${new Date().toISOString()}"
}

Ensure all prices are realistic for the Indian market and in INR.`;

        const payload = {
            contents: [{
                parts: [{
                    text: prompt
                }]
            }],
            generationConfig: {
                temperature: 0.3,
                topP: 0.8,
                topK: 40,
                maxOutputTokens: 1024,
                responseMimeType: "application/json"
            }
        };

        console.log('Making request to Gemini API...');
        
        // Make the API request
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "User-Agent": "PriceSense-AI/1.0"
            },
            body: JSON.stringify(payload),
            timeout: 30000 // 30 second timeout
        });

        console.log('Gemini API response status:', response.status);

        if (!response.ok) {
            let errorDetails;
            try {
                errorDetails = await response.json();
                console.error('Gemini API error details:', errorDetails);
            } catch {
                console.error('Failed to parse Gemini error response');
                errorDetails = { message: response.statusText };
            }

            // User-friendly error messages
            let userMessage = "AI service temporarily unavailable. Please try again.";
            if (response.status === 429) {
                userMessage = "Too many requests. Please wait a moment and try again.";
            } else if (response.status === 403) {
                userMessage = "API access restricted. Please contact support.";
            } else if (response.status === 400) {
                userMessage = "Invalid request format. Please try different product specifications.";
            }

            return {
                statusCode: response.status,
                headers,
                body: JSON.stringify({ 
                    error: userMessage,
                    code: `GEMINI_${response.status}`
                })
            };
        }

        // Parse the AI response
        const aiData = await response.json();
        console.log('Raw AI response received:', !!aiData);
        
        const generatedText = aiData?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!generatedText) {
            console.error("No generated text from Gemini API");
            console.error("AI response structure:", JSON.stringify(aiData, null, 2));
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ 
                    error: "AI model did not generate a response. Please try with different product specifications."
                })
            };
        }

        console.log('Generated text length:', generatedText.length);

        // Parse the JSON response
        let result;
        try {
            result = JSON.parse(generatedText);
            console.log('Successfully parsed AI response for product:', result.product);
            
            // Validate required fields
            if (!result.predicted_price_inr || !result.range_inr || !result.product) {
                throw new Error("Missing required fields in AI response");
            }

            // Ensure prices are positive
            if (result.predicted_price_inr <= 0 || result.range_inr.min <= 0 || result.range_inr.max <= 0) {
                throw new Error("Invalid price values in AI response");
            }

            // Add timestamp if missing
            if (!result.last_updated) {
                result.last_updated = new Date().toISOString();
            }

        } catch (parseError) {
            console.error("Failed to parse AI JSON response:", parseError);
            console.error("Raw AI response:", generatedText.substring(0, 500));
            
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ 
                    error: "AI response format error. Please try again with clearer product specifications.",
                    code: "INVALID_AI_JSON"
                })
            };
        }

        // Success response
        console.log(`Successful prediction: ${result.product} - ₹${result.predicted_price_inr}`);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(result)
        };

    } catch (error) {
        // Log the full error for debugging
        console.error("Function execution error:", {
            message: error.message,
            stack: error.stack,
            name: error.name
        });

        // Return generic error to user
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: "Internal server error. Please try again later.",
                code: "SERVER_ERROR",
                timestamp: new Date().toISOString()
            })
        };
    }
};

// netlify/functions/predict.js
import fetch from "node-fetch";

export async function handler(event) {
    try {
        if (event.httpMethod !== "POST") {
            return {
                statusCode: 405,
                body: JSON.stringify({ error: "Method Not Allowed" }),
            };
        }

        const { specs } = JSON.parse(event.body || "{}");

        if (!specs || specs.trim() === "") {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "Product specifications are required." }),
            };
        }

        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
        if (!GEMINI_API_KEY) {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "Gemini API key not set in environment variables." }),
            };
        }
        
        // This is the updated, direct prompt for the flash model
        const userPrompt = {
            parts: [{
                text: `You are an expert market analyst for the Indian market. Based on the following product specifications, predict the price in Indian Rupees (INR) and provide a full analysis.

Your response MUST be a single, valid JSON object that strictly adheres to the following schema:
{
  "predicted_price_inr": number,
  "range_inr": {
    "min": number,
    "max": number
  },
  "confidence": number,
  "product": string,
  "category": string,
  "specs_extracted": {
    "spec_key_1": "spec_value_1",
    "spec_key_2": "spec_value_2"
  },
  "explanation_bullets": string[],
  "anomalies": string[]
}

Product to analyze: ${specs}`
            }]
        };

        const payload = {
            contents: [userPrompt],
            generationConfig: {
                temperature: 0.1, // Keep a low temperature for more predictable output
            },
        };

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            }
        );

        if (!response.ok) {
            const errorBody = await response.json();
            return {
                statusCode: response.status,
                body: JSON.stringify({ error: errorBody?.error?.message || "Gemini API error" }),
            };
        }

        const aiData = await response.json();
        const generatedText = aiData?.candidates?.[0]?.content?.parts?.[0]?.text || "";

        const jsonString = generatedText.replace(/```json|```/g, "").trim();

        let result;
        try {
            result = JSON.parse(jsonString);
            if (!result.predicted_price_inr) {
                throw new Error("Invalid JSON response from AI: Missing price.");
            }
        } catch (e) {
            console.error("Failed to parse JSON from AI:", e);
            console.error("AI Response:", generatedText);
            
            // Fallback logic in case AI doesn't return valid JSON
            const fallbackPriceMatch = generatedText.match(/₹\s?([\d,\.]+)/i);
            const fallbackPrice = fallbackPriceMatch
                ? parseFloat(fallbackPriceMatch[1].replace(/,/g, ""))
                : Math.floor(Math.random() * 100000) + 5000;

            result = {
                predicted_price_inr: fallbackPrice,
                range_inr: {
                    min: Math.round(fallbackPrice * 0.9),
                    max: Math.round(fallbackPrice * 1.1),
                },
                confidence: 0.5,
                product: specs.split(",")[0].trim() || "Unknown Product",
                category: "Unknown",
                specs_extracted: {},
                explanation_bullets: ["Prediction based on available data, but a full analysis was not possible."],
                anomalies: ["AI returned an unexpected format. Using a fallback prediction."],
            };
        }

        return {
            statusCode: 200,
            body: JSON.stringify(result),
        };
    } catch (error) {
        console.error("Predict function error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message || "Server error" }),
        };
    }
}

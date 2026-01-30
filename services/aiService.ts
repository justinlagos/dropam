import { GoogleGenAI } from "@google/genai";

export const generateBriefSpark = async (title: string, context: string = "") => {
  try {
    // Initialize the AI client using the API key from environment variables.
    // GUIDELINE: Always use a named parameter and initialize right before making the call.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const prompt = `
      You are a creative director for a top design studio. 
      Analyze this project brief and generate a "Creative Spark".
      
      Project Title: ${title}
      Additional Context: ${context}
      
      Format the response as a single, punchy, high-energy paragraph (max 3 sentences) that defines the creative vision and "north star" for the team. 
      Focus on being inspiring and sharp.
    `;

    // GUIDELINE: For complex text tasks like creative vision generation, use gemini-3-pro-preview.
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
    });

    // GUIDELINE: Access the .text property directly, do not call as a method.
    return response.text || "No insights generated.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "The AI is currently contemplating. Try again shortly.";
  }
};
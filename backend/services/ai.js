const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Service to handle all AI interactions via Gemini.
 */
class GeminiService {
  /**
   * Generates a list of topics based on user settings.
   */
  async generateTopics(settings, count = 5, history = []) {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      You are an expert social media strategist. 
      Niche: ${settings.niche}
      Target Audience: ${settings.target_audience}
      Language: ${settings.language}
      Custom Instructions: ${settings.custom_instructions}

      Recent Topics (Avoid repetition):
      ${history.join(", ")}

      Task: Generate ${count} unique, engaging content topics for a Facebook Page.
      Each topic should have a short title and a detailed brief/instructions for a post.

      Return the response ONLY as a JSON array of objects:
      [
        { "title": "Topic Title", "brief": "Detailed instructions for the AI to write the post later." }
      ]
    `;

    let responseText;
    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      responseText = response.text();
    } catch (error) {
      if (error.message && (error.message.includes('429') || error.message.includes('quota') || error.message.includes('exceeded'))) {
        throw new Error("AI Rate Limit Exceeded. You are on the free tier of the Gemini API. Please wait a minute and try again.");
      }
      throw error;
    }

    const jsonMatch = responseText.match(/\[.*\]/s);
    if (!jsonMatch) throw new Error("Failed to parse AI response into JSON.");
    
    return JSON.parse(jsonMatch[0]);
  }

  /**
   * Generates post content (caption and image prompt) for a specific topic.
   */
  async generatePostContent(topic, settings) {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      You are a creative copywriter.
      Topic: ${topic.title}
      Context/Brief: ${topic.brief}
      Target Audience: ${settings.target_audience}
      Language: ${settings.language}
      Tone/Custom Instructions: ${settings.custom_instructions}
      Image Source Strategy: ${settings.image_source}
      Visual Vibe: ${settings.image_instructions}

      Task: Generate a Facebook post caption and an AI image generation prompt.
      
      Return the response ONLY as a JSON object:
      {
        "caption": "The final post text with emojis.",
        "image_prompt": "A detailed prompt for an AI image generator like Midjourney or DALL-E, matching the visual vibe."
      }
    `;

    let responseText;
    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      responseText = response.text();
    } catch (error) {
      if (error.message && (error.message.includes('429') || error.message.includes('quota') || error.message.includes('exceeded'))) {
        throw new Error("AI Rate Limit Exceeded. You are on the free tier of the Gemini API. Please wait a minute and try again.");
      }
      throw error;
    }

    const jsonMatch = responseText.match(/\{.*\}/s);
    if (!jsonMatch) throw new Error("Failed to parse AI response into JSON.");

    return JSON.parse(jsonMatch[0]);
  }
  /**
   * Enhances or rewrites a given text based on the requested mode.
   */
  async enhanceText(text, mode, settings) {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    let modeInstruction = "";
    switch (mode) {
      case "enhance":
        modeInstruction = "Enhance the text to be more engaging and professional for social media.";
        break;
      case "funnier":
        modeInstruction = "Rewrite the text to be humorous, witty, and entertaining.";
        break;
      case "shorten":
        modeInstruction = "Shorten the text to be concise and punchy without losing the main point.";
        break;
      case "rewrite":
        modeInstruction = "Rewrite the text completely for a fresh perspective while keeping the core message.";
        break;
      case "image":
        modeInstruction = "Based on the text, write a detailed, highly descriptive prompt for an AI image generator (like Midjourney or DALL-E) that matches the visual vibe.";
        break;
      default:
        modeInstruction = "Improve the text.";
    }

    const prompt = `
      You are an expert social media copywriter.
      Target Audience: ${settings.target_audience || 'General audience'}
      Language: ${settings.language || 'English'}
      Brand Tone: ${settings.custom_instructions || 'Professional and friendly'}
      Visual Vibe: ${settings.image_instructions || 'Modern'}

      Original Text:
      "${text}"

      Task: ${modeInstruction}
      
      Return ONLY a JSON object with the result:
      {
        "result": "The final generated text."
      }
    `;

    let responseText;
    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      responseText = response.text();
    } catch (error) {
      if (error.message && (error.message.includes('429') || error.message.includes('quota') || error.message.includes('exceeded'))) {
        throw new Error("AI Rate Limit Exceeded. You are on the free tier of the Gemini API. Please wait a minute and try again.");
      }
      throw error;
    }

    const jsonMatch = responseText.match(/\{.*\}/s);
    if (!jsonMatch) throw new Error("Failed to parse AI response into JSON.");

    return JSON.parse(jsonMatch[0]).result;
  }
}

module.exports = new GeminiService();

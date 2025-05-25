import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OpenAI API Key is not configured. Please contact the system administrator.");
  }
  return new OpenAI({ apiKey });
}

export async function generateBotResponse(userMessage: string, knowledgeBase: string): Promise<string> {
  try {
    const openai = getOpenAIClient();
    const prompt = `You are a helpful AI assistant for a Telegram bot with access to SMM Panel services and other knowledge. Use the following knowledge base to answer user questions accurately and helpfully.

Knowledge Base:
${knowledgeBase}

User Message: ${userMessage}

Instructions:
- If users ask about social media services, followers, likes, views, or SMM services, provide specific details including service IDs, pricing, and order limits from the SMM Panel Services section
- Always mention service IDs (e.g., "ID 1: Instagram Followers") so users can easily identify services
- Provide accurate pricing information in Indonesian Rupiah (Rp)
- If asked about available services, list them clearly with specifications
- Be helpful and provide complete information based on the knowledge base

Please provide a helpful and relevant response:`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a helpful AI assistant integrated into a Telegram bot. You have access to information about SMM Panel services and other knowledge. When users ask about social media services, followers, likes, views, or similar SMM services, provide detailed information including service IDs, pricing, minimum/maximum orders, and descriptions. Always be helpful and provide accurate information based on the provided knowledge base."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    return response.choices[0].message.content || "I'm sorry, I couldn't generate a response at the moment.";
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw new Error("Failed to generate AI response");
  }
}

export async function validateOpenAIKey(apiKey: string): Promise<boolean> {
  try {
    const testClient = new OpenAI({ apiKey });
    await testClient.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: "test" }],
      max_tokens: 1,
    });
    return true;
  } catch (error) {
    return false;
  }
}

export async function checkOpenAIConnection(): Promise<boolean> {
  try {
    const openai = getOpenAIClient();
    await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: "test" }],
      max_tokens: 1,
    });
    return true;
  } catch (error) {
    return false;
  }
}

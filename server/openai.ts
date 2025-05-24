import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

export async function generateBotResponse(userMessage: string, knowledgeBase: string): Promise<string> {
  try {
    const prompt = `You are a helpful AI assistant for a Telegram bot. Use the following knowledge base to answer user questions accurately and helpfully. If the question is not covered by the knowledge base, provide a general helpful response.

Knowledge Base:
${knowledgeBase}

User Message: ${userMessage}

Please provide a helpful and relevant response:`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a helpful AI assistant integrated into a Telegram bot. Provide clear, concise, and helpful responses based on the provided knowledge base."
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

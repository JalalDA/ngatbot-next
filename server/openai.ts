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
    
    // Check if this is a simple greeting or general question
    const lowerMessage = userMessage.toLowerCase();
    const isGreeting = /^(hai|hay|hello|halo|hi|good|selamat|apa kabar|kamu siapa|siapa kamu|who are you)/.test(lowerMessage);
    
    let systemPrompt = "";
    let userPrompt = "";

    if (isGreeting) {
      // For greetings, use a more natural response without SMM services
      systemPrompt = "You are a friendly AI assistant. Respond naturally to greetings and introduce yourself briefly. Be warm and helpful.";
      userPrompt = `User said: "${userMessage}". Please respond naturally as a helpful AI assistant.`;
    } else {
      // For other questions, include knowledge base
      systemPrompt = `You are a helpful AI assistant with access to knowledge about various topics including SMM Panel services. 

Instructions:
- For general questions, answer naturally based on your training
- For SMM-related questions, use the knowledge base to provide specific service details
- Always be helpful and accurate
- If knowledge base contains SMM services, format them clearly with IDs and pricing`;

      userPrompt = `Knowledge Base:
${knowledgeBase}

User Message: ${userMessage}

Please provide a helpful and relevant response:`;
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: userPrompt
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

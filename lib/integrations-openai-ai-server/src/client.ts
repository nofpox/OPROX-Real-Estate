import OpenAI from "openai";

function getOpenAIInstance(): OpenAI {
  const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
  if (!apiKey) {
    throw new Error("AI credentials required: OPENAI_API_KEY environment variable is not set.");
  }
  return new OpenAI({
    apiKey,
    ...(baseURL ? { baseURL } : {}),
  });
}

export const openai = new Proxy({} as OpenAI, {
  get(_target, prop, receiver) {
    const client = getOpenAIInstance();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

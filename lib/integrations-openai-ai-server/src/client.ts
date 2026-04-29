import OpenAI from "openai";

if (!process.env.AI_INTEGRATIONS_OPENAI_BASE_URL) {
  throw new Error(
    "AI_INTEGRATIONS_OPENAI_BASE_URL must be set. Did you forget to provision the OpenAI AI integration?",
  );
}

if (!process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
  throw new Error(
    "AI_INTEGRATIONS_OPENAI_API_KEY must be set. Did you forget to provision the OpenAI AI integration?",
  );
}

const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
const isOpenRouter = /openrouter\.ai/i.test(baseURL ?? "");

export const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL,
  ...(isOpenRouter
    ? {
        defaultHeaders: {
          "HTTP-Referer":
            process.env.OPENROUTER_REFERRER ?? "https://anki-generator.local",
          "X-Title": process.env.OPENROUTER_TITLE ?? "Anki Card Generator",
        },
      }
    : {}),
});

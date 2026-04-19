import { Router, type IRouter } from "express";
import { db, decksTable, cardsTable } from "@workspace/db";
import { GenerateCardsBody } from "@workspace/api-zod";

const router: IRouter = Router();

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getErrorStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  const status = (error as { status?: unknown }).status;
  return typeof status === "number" ? status : undefined;
}

function getErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
}

function isRetryableAIError(error: unknown): boolean {
  const status = getErrorStatus(error);
  return status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

async function createChatCompletionWithRetry(
  openai: Awaited<ReturnType<typeof getOpenAIClient>>,
  payload: Parameters<typeof openai.chat.completions.create>[0],
  requestLog: { warn: (obj: unknown, message: string) => void },
) {
  const delays = [2000, 5000, 10000];

  for (let attempt = 0; ; attempt++) {
    try {
      return await openai.chat.completions.create(payload);
    } catch (error) {
      if (!isRetryableAIError(error) || attempt >= delays.length) {
        throw error;
      }

      const delayMs = delays[attempt];
      requestLog.warn({ err: error, attempt: attempt + 1, delayMs }, "Retrying AI card generation");
      await sleep(delayMs);
    }
  }
}

function parseGeneratedCards(rawContent: string): { front: string; back: string }[] {
  const cleaned = rawContent
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
  const candidates = [
    cleaned,
    cleaned.match(/\[[\s\S]*\]/)?.[0],
    cleaned.match(/\{[\s\S]*\}/)?.[0],
  ].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (Array.isArray(parsed)) return parsed;
      if (parsed && typeof parsed === "object" && Array.isArray((parsed as { cards?: unknown }).cards)) {
        return (parsed as { cards: { front: string; back: string }[] }).cards;
      }
    } catch {
      continue;
    }
  }

  return [];
}

async function getOpenAIClient() {
  if (!process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || !process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
    throw new Error("AI card generation is not configured yet.");
  }

  const { openai } = await import("@workspace/integrations-openai-ai-server");
  return openai;
}

router.post("/generate", async (req, res, next): Promise<void> => {
  const parsed = GenerateCardsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { text, deckName, cardCount = 15, parentId } = parsed.data;

  if (!text || text.trim().length < 10) {
    res.status(400).json({ error: "Text is too short to generate cards from." });
    return;
  }

  const maxCards = Math.min(Math.max(cardCount, 1), 50);

  const systemPrompt = `You are an expert Anki flashcard creator. Given source material, generate high-quality question-answer flashcards that test understanding, not just recall.
  
Rules:
- Questions should be specific and unambiguous
- Answers should be concise but complete
- Avoid trivial or overly obvious cards
- Focus on key concepts, definitions, relationships, and important facts
- Each card should be self-contained (understandable without context)
- Use simple, clear language

Respond with a JSON array of objects with "front" (question) and "back" (answer) fields only. No markdown, no explanation, just the JSON array.`;

  const userPrompt = `Generate exactly ${maxCards} Anki flashcards from the following text. Return only a JSON array:\n\n${text.slice(0, 15000)}`;

  let response;
  try {
    const openai = await getOpenAIClient();
    response = await createChatCompletionWithRetry(openai, {
      model: "gpt-5.2",
      max_completion_tokens: 8192,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }, req.log);
  } catch (error) {
    req.log.error({ err: error }, "AI card generation failed");
    const status = getErrorStatus(error);
    const code = getErrorCode(error);
    if (status === 429 || code === "too_many_requests") {
      res.status(429).json({
        error: "AI is temporarily rate-limited. Wait a minute and try this file again.",
      });
      return;
    }
    res.status(503).json({
      error: error instanceof Error ? error.message : "AI card generation failed.",
    });
    return;
  }

  const rawContent = response.choices[0]?.message?.content ?? "[]";

  let generatedCards: { front: string; back: string }[] = [];
  try {
    generatedCards = parseGeneratedCards(rawContent);
  } catch {
    req.log.error({ rawContent }, "Failed to parse AI response as JSON");
    res.status(500).json({ error: "Failed to parse AI-generated cards." });
    return;
  }

  if (!Array.isArray(generatedCards) || generatedCards.length === 0) {
    res.status(500).json({ error: "AI did not generate any cards." });
    return;
  }

  try {
    const [deck] = await db
      .insert(decksTable)
      .values({ name: deckName, parentId: parentId ?? null })
      .returning();

    const validCards = generatedCards
      .filter(c => c && typeof c.front === "string" && typeof c.back === "string")
      .map(c => ({ deckId: deck.id, front: c.front.trim(), back: c.back.trim() }))
      .filter(c => c.front.length > 0 && c.back.length > 0);

    if (validCards.length === 0) {
      res.status(500).json({ error: "AI returned cards without usable fronts and backs." });
      return;
    }

    const insertedCards = await db.insert(cardsTable).values(validCards).returning();

    res.status(201).json({
      deck: { ...deck, cardCount: insertedCards.length, createdAt: deck.createdAt.toISOString() },
      cards: insertedCards.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() })),
      generatedCount: insertedCards.length,
    });
  } catch (err) {
    next(err);
  }
});

export default router;

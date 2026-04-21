import { Router, type IRouter } from "express";
import { db, decksTable, cardsTable } from "@workspace/db";
import { GenerateCardsBody } from "@workspace/api-zod";

const router: IRouter = Router();

const MAX_PAGE_IMAGES = 100;

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

function parseGeneratedCards(rawContent: string): { front: string; back: string; imageIndex?: number | null }[] {
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
        return (parsed as { cards: { front: string; back: string; imageIndex?: number | null }[] }).cards;
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

  const { text, deckName, cardCount = 20, parentId, pageImages } = parsed.data;

  if (!text || text.trim().length < 10) {
    res.status(400).json({ error: "Text is too short to generate cards from." });
    return;
  }

  const maxCards = Math.min(Math.max(cardCount, 1), 200);

  const hasImages = Array.isArray(pageImages) && pageImages.length > 0;
  const selectedImages = hasImages ? pageImages.slice(0, MAX_PAGE_IMAGES) : [];

  const systemPrompt = `You are an expert Anki flashcard creator. Given source material (text and optionally PDF page images), generate high-quality question-answer flashcards that test understanding, not just recall.

Rules:
- Questions should be specific and unambiguous
- Answers should be concise but complete
- Avoid trivial or overly obvious cards
- Focus on key concepts, definitions, relationships, mechanisms, diagrams, and important facts
- Each card should be self-contained (understandable without context)
- Use simple, clear language
- When the source contains diagrams, tables, charts, or figures, create cards that reference them${hasImages ? `

VISUAL CARDS — ATTACH IMAGES GENEROUSLY:
- You are also given the rendered page images (in order, 0-based indices). Inspect them carefully.
- Whenever a page contains a meaningful visual — diagrams, anatomical illustrations, X-rays, CT/MRI scans, ECGs, dermatology photos, microscopy slides, charts, tables, flowcharts, algorithms, decision trees, graphs, equations, labelled figures — CREATE at least one card about that visual and attach it via "imageIndex" (the 0-based index of the page image).
- Prefer creating image-anchored cards over pure-text cards when a strong visual is present on a page. Visual recall is critical for medical/clinical learning.
- A card that asks the learner to identify, interpret, or describe a visual MUST have "imageIndex" set.
- Do NOT attach images to cards that are about plain text on that page (definitions, lists, prose) — only attach when the visual itself is the subject of the question.
- It is perfectly fine for several cards to share the same imageIndex (e.g. one image → multiple questions about its features).
- If a page is purely text (no meaningful visual), don't attach its image to any card.` : ""}

Respond with a JSON array of objects with "front" (question), "back" (answer)${hasImages ? ', and optionally "imageIndex" (integer, 0-based, references the page image)' : ""} fields only. No markdown, no explanation, just the JSON array.`;

  const textContent = `Generate exactly ${maxCards} Anki flashcards from the following content. Return only a JSON array:\n\n${text.slice(0, 20000)}`;

  type ContentPart = { type: "text"; text: string } | { type: "image_url"; image_url: { url: string; detail: "high" } };
  let userMessageContent: string | ContentPart[];

  if (hasImages && selectedImages.length > 0) {
    const indexedTextContent =
      textContent +
      `\n\nPAGE IMAGES PROVIDED (${selectedImages.length} total): they follow this message in order. Image at imageIndex 0 is the first one, imageIndex ${selectedImages.length - 1} is the last.`;
    userMessageContent = [
      { type: "text" as const, text: indexedTextContent },
      ...selectedImages.map((imgData): ContentPart => ({
        type: "image_url" as const,
        image_url: {
          url: imgData.startsWith("data:") ? imgData : `data:image/jpeg;base64,${imgData}`,
          detail: "high" as const,
        },
      })),
    ];
  } else {
    userMessageContent = textContent;
  }

  let response;
  try {
    const openai = await getOpenAIClient();
    response = await createChatCompletionWithRetry(openai, {
      model: "gpt-4.1-mini",
      max_completion_tokens: 16384,
      stream: false as const,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessageContent as string },
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

  const completion = response as { choices: Array<{ message: { content: string | null } }> };
  const rawContent = completion.choices[0]?.message?.content ?? "[]";

  let generatedCards: { front: string; back: string; imageIndex?: number | null }[] = [];
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
      .map(c => {
        const imageIndex = typeof c.imageIndex === "number" ? c.imageIndex : null;
        const image = (imageIndex !== null && selectedImages[imageIndex]) ? selectedImages[imageIndex] : null;
        return {
          deckId: deck.id,
          front: c.front.trim(),
          back: c.back.trim(),
          image: image ?? null,
        };
      })
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

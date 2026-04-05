import { Router, type IRouter } from "express";
import { createRequire } from "module";
import { eq, inArray } from "drizzle-orm";
import { db, decksTable, cardsTable } from "@workspace/db";
import { logger } from "../lib/logger";

const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AnkiExport: any = require("anki-apkg-export").default;

const router: IRouter = Router();

router.post("/export-apkg", async (req, res): Promise<void> => {
  const { deckIds, exportName } = req.body as {
    deckIds?: number[];
    exportName?: string;
  };

  if (!Array.isArray(deckIds) || deckIds.length === 0) {
    res.status(400).json({ error: "deckIds must be a non-empty array." });
    return;
  }

  const ids = deckIds.map(id => Number(id)).filter(id => !isNaN(id));
  if (ids.length === 0) {
    res.status(400).json({ error: "No valid deck IDs provided." });
    return;
  }

  // Fetch the requested decks
  const requestedDecks = await db
    .select()
    .from(decksTable)
    .where(inArray(decksTable.id, ids));

  if (requestedDecks.length === 0) {
    res.status(404).json({ error: "No matching decks found." });
    return;
  }

  // For parent decks, also fetch their sub-decks automatically
  const parentIds = requestedDecks.filter(d => d.parentId === null).map(d => d.id);
  let subDecks: typeof requestedDecks = [];
  if (parentIds.length > 0) {
    subDecks = await db
      .select()
      .from(decksTable)
      .where(inArray(decksTable.parentId, parentIds));
  }

  // Build full set: requested decks + their sub-decks (deduplicated)
  const allDeckIds = [...new Set([...ids, ...subDecks.map(d => d.id)])];
  const allDecks = [...requestedDecks, ...subDecks.filter(s => !ids.includes(s.id))];

  // Fetch all cards
  const allCards = await db
    .select()
    .from(cardsTable)
    .where(inArray(cardsTable.deckId, allDeckIds))
    .orderBy(cardsTable.createdAt);

  if (allCards.length === 0) {
    res.status(400).json({ error: "Selected decks have no cards to export." });
    return;
  }

  // Build a map: deckId → full Anki deck name (using :: for sub-decks)
  const deckById = new Map(allDecks.map(d => [d.id, d]));
  const getAnkiDeckName = (deckId: number): string => {
    const deck = deckById.get(deckId);
    if (!deck) return exportName ?? "Exported Deck";
    if (deck.parentId) {
      const parent = deckById.get(deck.parentId);
      if (parent) return `${parent.name}::${deck.name}`;
    }
    return deck.name;
  };

  // Determine the root deck name for the .apkg container
  const rootLabel = exportName?.trim() ||
    (requestedDecks.length === 1 ? requestedDecks[0].name : `${requestedDecks.length} Decks`);

  const apkg = AnkiExport(rootLabel);

  for (const card of allCards) {
    const deckName = getAnkiDeckName(card.deckId);
    const baseTags = card.tags
      ? card.tags.split(/[\s,]+/).map((t: string) => t.trim()).filter(Boolean)
      : [];
    // Tag each card with its sub-deck name so users can filter in Anki
    const subDeckTag = deckName.includes("::") ? deckName.split("::").pop()! : undefined;
    const tags = subDeckTag ? [...baseTags, subDeckTag.replace(/\s+/g, "_")] : baseTags;
    apkg.addCard(card.front, card.back, { tags, deckName });
  }

  const zipBuffer: Buffer = await apkg.save();

  const safeName = rootLabel.replace(/[^a-z0-9_\-]/gi, "_");
  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader("Content-Disposition", `attachment; filename="${safeName}.apkg"`);
  res.setHeader("Content-Length", zipBuffer.length);

  req.log.info(
    { deckCount: allDecks.length, cardCount: allCards.length, subDeckCount: subDecks.length },
    "Exported .apkg"
  );

  res.end(zipBuffer);
});

export default router;

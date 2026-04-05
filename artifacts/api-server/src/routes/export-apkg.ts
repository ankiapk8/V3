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

  const ids = deckIds.map((id) => Number(id)).filter((id) => !isNaN(id));
  if (ids.length === 0) {
    res.status(400).json({ error: "No valid deck IDs provided." });
    return;
  }

  const decks = await db
    .select()
    .from(decksTable)
    .where(inArray(decksTable.id, ids));

  if (decks.length === 0) {
    res.status(404).json({ error: "No matching decks found." });
    return;
  }

  const cards = await db
    .select()
    .from(cardsTable)
    .where(inArray(cardsTable.deckId, ids))
    .orderBy(cardsTable.createdAt);

  if (cards.length === 0) {
    res.status(400).json({ error: "Selected decks have no cards to export." });
    return;
  }

  const deckLabel =
    exportName?.trim() ||
    (decks.length === 1 ? decks[0].name : `${decks.length} Decks`);

  const apkg = AnkiExport(deckLabel);

  for (const card of cards) {
    const tags = card.tags
      ? card.tags
          .split(/[\s,]+/)
          .map((t: string) => t.trim())
          .filter(Boolean)
      : [];
    apkg.addCard(card.front, card.back, { tags });
  }

  const zipBuffer: Buffer = await apkg.save();

  const safeName = deckLabel.replace(/[^a-z0-9_\-]/gi, "_");
  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${safeName}.apkg"`,
  );
  res.setHeader("Content-Length", zipBuffer.length);

  req.log.info(
    { deckCount: decks.length, cardCount: cards.length },
    "Exported .apkg",
  );

  res.end(zipBuffer);
});

export default router;

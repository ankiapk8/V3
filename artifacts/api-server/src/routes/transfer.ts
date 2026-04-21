import { Router, type IRouter } from "express";
import { inArray } from "drizzle-orm";
import { db, decksTable, cardsTable } from "@workspace/db";

const router: IRouter = Router();

const FORMAT_VERSION = 1;

type ExportedCard = {
  front: string;
  back: string;
  tags: string | null;
  image: string | null;
};

type ExportedNode = {
  name: string;
  description: string | null;
  cards: ExportedCard[];
  subDecks: ExportedNode[];
};

type ExportedFile = {
  format: "ankigen-deck";
  version: number;
  exportedAt: string;
  root: ExportedNode;
};

function buildNode(
  deckId: number,
  allDecks: (typeof decksTable.$inferSelect)[],
  cardsByDeck: Map<number, (typeof cardsTable.$inferSelect)[]>
): ExportedNode {
  const deck = allDecks.find(d => d.id === deckId)!;
  const children = allDecks.filter(d => d.parentId === deckId);
  const cards = cardsByDeck.get(deckId) ?? [];
  return {
    name: deck.name,
    description: deck.description ?? null,
    cards: cards.map(c => ({
      front: c.front,
      back: c.back,
      tags: c.tags ?? null,
      image: c.image ?? null,
    })),
    subDecks: children.map(c => buildNode(c.id, allDecks, cardsByDeck)),
  };
}

router.get("/decks/:id/export-json", async (req, res, next): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid deck ID" });
    return;
  }

  try {
    const allDecks = await db.select().from(decksTable);
    const root = allDecks.find(d => d.id === id);
    if (!root) {
      res.status(404).json({ error: "Deck not found" });
      return;
    }

    function descendantIds(parentId: number): number[] {
      const direct = allDecks.filter(d => d.parentId === parentId).map(d => d.id);
      return [...direct, ...direct.flatMap(descendantIds)];
    }

    const allIds = [id, ...descendantIds(id)];
    const cards = await db
      .select()
      .from(cardsTable)
      .where(inArray(cardsTable.deckId, allIds))
      .orderBy(cardsTable.createdAt);

    const cardsByDeck = new Map<number, (typeof cardsTable.$inferSelect)[]>();
    for (const c of cards) {
      const list = cardsByDeck.get(c.deckId) ?? [];
      list.push(c);
      cardsByDeck.set(c.deckId, list);
    }

    const file: ExportedFile = {
      format: "ankigen-deck",
      version: FORMAT_VERSION,
      exportedAt: new Date().toISOString(),
      root: buildNode(id, allDecks, cardsByDeck),
    };

    const safeName = root.name.replace(/[^a-z0-9_\-]/gi, "_");
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${safeName}.ankigen.json"`
    );
    res.end(JSON.stringify(file, null, 2));
  } catch (err) {
    next(err);
  }
});

function isString(v: unknown): v is string {
  return typeof v === "string";
}

function validateNode(node: unknown, path: string): string | null {
  if (!node || typeof node !== "object") return `${path}: not an object`;
  const n = node as Record<string, unknown>;
  if (!isString(n.name) || n.name.trim() === "") return `${path}.name missing`;
  if (n.description !== null && n.description !== undefined && !isString(n.description))
    return `${path}.description must be string or null`;
  if (!Array.isArray(n.cards)) return `${path}.cards must be array`;
  if (!Array.isArray(n.subDecks)) return `${path}.subDecks must be array`;
  for (let i = 0; i < n.cards.length; i++) {
    const c = n.cards[i] as Record<string, unknown>;
    if (!c || typeof c !== "object") return `${path}.cards[${i}] not object`;
    if (!isString(c.front)) return `${path}.cards[${i}].front missing`;
    if (!isString(c.back)) return `${path}.cards[${i}].back missing`;
  }
  for (let i = 0; i < n.subDecks.length; i++) {
    const err = validateNode(n.subDecks[i], `${path}.subDecks[${i}]`);
    if (err) return err;
  }
  return null;
}

async function importNode(
  node: ExportedNode,
  parentId: number | null
): Promise<{ deckCount: number; cardCount: number }> {
  const [created] = await db
    .insert(decksTable)
    .values({
      name: node.name,
      description: node.description ?? undefined,
      parentId: parentId ?? undefined,
    })
    .returning();

  let deckCount = 1;
  let cardCount = 0;

  if (node.cards.length > 0) {
    await db.insert(cardsTable).values(
      node.cards.map(c => ({
        deckId: created.id,
        front: c.front,
        back: c.back,
        tags: c.tags ?? undefined,
        image: c.image ?? undefined,
      }))
    );
    cardCount += node.cards.length;
  }

  for (const sub of node.subDecks) {
    const r = await importNode(sub, created.id);
    deckCount += r.deckCount;
    cardCount += r.cardCount;
  }

  return { deckCount, cardCount };
}

router.post("/import-deck-json", async (req, res, next): Promise<void> => {
  try {
    const body = req.body as Record<string, unknown>;
    if (!body || body.format !== "ankigen-deck") {
      res.status(400).json({ error: "Not a valid AnkiGen deck file." });
      return;
    }
    if (typeof body.version !== "number" || body.version > FORMAT_VERSION) {
      res.status(400).json({
        error: `Unsupported file version (got ${String(body.version)}, this server supports up to ${FORMAT_VERSION}).`,
      });
      return;
    }
    const validationErr = validateNode(body.root, "root");
    if (validationErr) {
      res.status(400).json({ error: `Invalid file: ${validationErr}` });
      return;
    }

    // Auto-rename root if a top-level deck with the same name already exists
    const root = body.root as ExportedNode;
    const allDecks = await db.select({ name: decksTable.name, parentId: decksTable.parentId }).from(decksTable);
    const topNames = new Set(allDecks.filter(d => d.parentId === null).map(d => d.name));
    let importName = root.name;
    if (topNames.has(importName)) {
      let i = 2;
      while (topNames.has(`${root.name} (${i})`)) i++;
      importName = `${root.name} (${i})`;
    }

    const result = await importNode({ ...root, name: importName }, null);

    res.status(201).json({
      deckId: undefined,
      importedName: importName,
      deckCount: result.deckCount,
      cardCount: result.cardCount,
    });
  } catch (err) {
    next(err);
  }
});

export default router;

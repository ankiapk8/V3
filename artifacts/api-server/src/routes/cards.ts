import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, cardsTable } from "@workspace/db";
import {
  UpdateCardParams,
  UpdateCardBody,
  DeleteCardParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.patch("/cards/:id", async (req, res, next): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateCardParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateCardBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const [card] = await db
      .update(cardsTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(cardsTable.id, params.data.id))
      .returning();

    if (!card) {
      res.status(404).json({ error: "Card not found" });
      return;
    }

    res.json({ ...card, createdAt: card.createdAt.toISOString() });
  } catch (err) {
    next(err);
  }
});

router.delete("/cards/:id", async (req, res, next): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteCardParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  try {
    const [deleted] = await db
      .delete(cardsTable)
      .where(eq(cardsTable.id, params.data.id))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "Card not found" });
      return;
    }

    res.sendStatus(204);
  } catch (err) {
    next(err);
  }
});

export default router;

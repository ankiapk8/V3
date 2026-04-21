import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { decksTable } from "./decks";

export const cardsTable = pgTable("cards", {
  id: serial("id").primaryKey(),
  deckId: integer("deck_id").notNull().references(() => decksTable.id, { onDelete: "cascade" }),
  front: text("front").notNull(),
  back: text("back").notNull(),
  tags: text("tags"),
  image: text("image"),
  sourceImage: text("source_image"),
  bbox: text("bbox"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCardSchema = createInsertSchema(cardsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCard = z.infer<typeof insertCardSchema>;
export type Card = typeof cardsTable.$inferSelect;

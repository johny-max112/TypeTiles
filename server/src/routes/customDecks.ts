import { Router, type Request, type Response } from "express";
import { authMiddleware, roleMiddleware } from "../middleware.js";
import { databaseTransaction, getDatabase } from "../db.js";

const router = Router();

const PRACTICE_FORMATS = new Set(["word-phrase", "full-sentence"]);
const MAX_DECK_NAME_LENGTH = 100;
const MAX_ENTRY_LENGTH = 500;
const MAX_PROMPT_LENGTH = 500;
const MAX_DECK_ITEMS = 500;

type DeckEntryInput = {
  prompt?: unknown;
  answer?: unknown;
  sort_order?: unknown;
};

function parseDeckId(value: string): number | null {
  if (!/^[1-9]\d*$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}

function validatePracticeFormat(value: unknown): value is "word-phrase" | "full-sentence" {
  return typeof value === "string" && PRACTICE_FORMATS.has(value);
}

function validateEntries(value: unknown): { error?: string; entries?: Array<{ prompt: string | null; answer: string; sortOrder: number }> } {
  if (!Array.isArray(value)) return { error: "Entries must be an array" };
  if (value.length > MAX_DECK_ITEMS) return { error: `A deck can contain at most ${MAX_DECK_ITEMS} entries` };

  const entries: Array<{ prompt: string | null; answer: string; sortOrder: number }> = [];
  const suppliedOrders: number[] = [];
  for (const [index, raw] of value.entries()) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return { error: `Entry ${index + 1} must be an object` };
    }
    const input = raw as DeckEntryInput;
    if (typeof input.answer !== "string") return { error: `Entry ${index + 1} answer is required` };
    const answer = input.answer.trim();
    if (!answer) return { error: `Entry ${index + 1} answer must not be empty` };
    if (answer.length > MAX_ENTRY_LENGTH) return { error: `Entry ${index + 1} answer must be ${MAX_ENTRY_LENGTH} characters or fewer` };

    let prompt: string | null = null;
    if (input.prompt !== undefined && input.prompt !== null) {
      if (typeof input.prompt !== "string") return { error: `Entry ${index + 1} prompt must be text` };
      prompt = input.prompt.trim();
      if (!prompt) prompt = null;
      if (prompt && prompt.length > MAX_PROMPT_LENGTH) return { error: `Entry ${index + 1} prompt must be ${MAX_PROMPT_LENGTH} characters or fewer` };
    }

    let sortOrder = index;
    if (input.sort_order !== undefined) {
      if (!Number.isInteger(input.sort_order) || (input.sort_order as number) < 0) {
        return { error: `Entry ${index + 1} sort order must be a non-negative integer` };
      }
      sortOrder = input.sort_order as number;
      suppliedOrders.push(sortOrder);
    }
    entries.push({ prompt, answer, sortOrder });
  }

  if (suppliedOrders.length > 0) {
    if (suppliedOrders.length !== entries.length) {
      return { error: "sort_order must be provided consistently for every entry" };
    }
    if (new Set(suppliedOrders).size !== suppliedOrders.length) {
      return { error: "sort_order values must be unique" };
    }
    entries.sort((left, right) => left.sortOrder - right.sortOrder);
  }
  return {
    entries: entries.map((entry, index) => ({ ...entry, sortOrder: index })),
  };
}

function validateDeckName(value: unknown): { error?: string; name?: string } {
  if (typeof value !== "string") return { error: "Deck name is required" };
  const name = value.trim();
  if (!name) return { error: "Deck name must not be empty" };
  if (name.length > MAX_DECK_NAME_LENGTH) return { error: `Deck name must be ${MAX_DECK_NAME_LENGTH} characters or fewer` };
  return { name };
}

async function getOwnedDeck(db: ReturnType<typeof getDatabase>, deckId: number, teacherUserId: number) {
  return db.get(
    "SELECT id, teacher_user_id, name, practice_format, status, created_at, updated_at FROM custom_decks WHERE id=? AND teacher_user_id=?",
    deckId,
    teacherUserId,
  );
}

router.post("/custom-decks", authMiddleware, roleMiddleware("teacher"), async (req: Request, res: Response) => {
  const nameValidation = validateDeckName(req.body?.name);
  if (nameValidation.error) return res.status(400).json({ error: nameValidation.error });
  if (!validatePracticeFormat(req.body?.practiceFormat)) {
    return res.status(400).json({ error: "Practice format must be word-phrase or full-sentence" });
  }

  const entriesValidation = validateEntries(req.body?.entries ?? []);
  if (entriesValidation.error) return res.status(400).json({ error: entriesValidation.error });

  try {
    const result = await databaseTransaction(async (db) => {
      const created = await db.run(
        `INSERT INTO custom_decks (teacher_user_id, name, practice_format, status)
         VALUES (?, ?, ?, 'active')`,
        req.user!.userId,
        nameValidation.name!,
        req.body.practiceFormat,
      );
      const deckId = created.lastID!;
      for (const entry of entriesValidation.entries ?? []) {
        await db.run(
          "INSERT INTO custom_deck_items (deck_id, prompt, answer, sort_order) VALUES (?, ?, ?, ?)",
          deckId,
          entry.prompt,
          entry.answer,
          entry.sortOrder,
        );
      }
      return deckId;
    });

    const deck = await getOwnedDeck(getDatabase(), result, req.user!.userId);
    const entries = await getDatabase().all(
      "SELECT id, prompt, answer, sort_order FROM custom_deck_items WHERE deck_id=? ORDER BY sort_order ASC",
      result,
    );
    return res.status(201).json({ deck: { ...deck, entries } });
  } catch (error) {
    console.error("Create custom deck error:", error);
    return res.status(500).json({ error: "Unable to create custom deck" });
  }
});

router.get("/custom-decks", authMiddleware, roleMiddleware("teacher"), async (req: Request, res: Response) => {
  try {
    const decks = await getDatabase().all(
      `SELECT d.id, d.teacher_user_id, d.name, d.practice_format, d.status,
              d.created_at, d.updated_at,
              (SELECT COUNT(*) FROM custom_deck_items i WHERE i.deck_id=d.id) AS entry_count
       FROM custom_decks d
       WHERE d.teacher_user_id=?
       ORDER BY d.updated_at DESC, d.id DESC`,
      req.user!.userId,
    );
    return res.json({ decks });
  } catch (error) {
    console.error("List custom decks error:", error);
    return res.status(500).json({ error: "Unable to list custom decks" });
  }
});

router.get("/custom-decks/:id", authMiddleware, roleMiddleware("teacher"), async (req: Request, res: Response) => {
  const deckId = parseDeckId(req.params.id);
  if (!deckId) return res.status(400).json({ error: "Invalid deck ID" });
  try {
    const deck = await getOwnedDeck(getDatabase(), deckId, req.user!.userId);
    if (!deck) return res.status(404).json({ error: "Custom deck not found" });
    const entries = await getDatabase().all(
      "SELECT id, prompt, answer, sort_order FROM custom_deck_items WHERE deck_id=? ORDER BY sort_order ASC",
      deckId,
    );
    return res.json({ deck: { ...deck, entries } });
  } catch (error) {
    console.error("Get custom deck error:", error);
    return res.status(500).json({ error: "Unable to retrieve custom deck" });
  }
});

async function updateDeck(req: Request, res: Response) {
  const deckId = parseDeckId(req.params.id);
  if (!deckId) return res.status(400).json({ error: "Invalid deck ID" });

  const updatesName = req.body?.name !== undefined;
  const updatesFormat = req.body?.practiceFormat !== undefined;
  const updatesEntries = req.body?.entries !== undefined;
  if (!updatesName && !updatesFormat && !updatesEntries) {
    return res.status(400).json({ error: "No deck changes provided" });
  }

  let name: string | undefined;
  if (updatesName) {
    const nameValidation = validateDeckName(req.body.name);
    if (nameValidation.error) return res.status(400).json({ error: nameValidation.error });
    name = nameValidation.name;
  }
  let practiceFormat: "word-phrase" | "full-sentence" | undefined;
  if (updatesFormat) {
    if (!validatePracticeFormat(req.body.practiceFormat)) {
      return res.status(400).json({ error: "Practice format must be word-phrase or full-sentence" });
    }
    practiceFormat = req.body.practiceFormat;
  }
  let entries: Array<{ prompt: string | null; answer: string; sortOrder: number }> | undefined;
  if (updatesEntries) {
    const entriesValidation = validateEntries(req.body.entries);
    if (entriesValidation.error) return res.status(400).json({ error: entriesValidation.error });
    entries = entriesValidation.entries;
  }

  try {
    await databaseTransaction(async (db) => {
      const owned = await getOwnedDeck(db, deckId, req.user!.userId);
      if (!owned) return false;

      if (updatesName || updatesFormat) {
        await db.run(
          `UPDATE custom_decks
           SET name=COALESCE(?, name),
               practice_format=COALESCE(?, practice_format),
               updated_at=CURRENT_TIMESTAMP
           WHERE id=? AND teacher_user_id=?`,
          name ?? null,
          practiceFormat ?? null,
          deckId,
          req.user!.userId,
        );
      }
      if (updatesEntries) {
        await db.run("DELETE FROM custom_deck_items WHERE deck_id=?", deckId);
        for (const entry of entries ?? []) {
          await db.run(
            "INSERT INTO custom_deck_items (deck_id, prompt, answer, sort_order) VALUES (?, ?, ?, ?)",
            deckId,
            entry.prompt,
            entry.answer,
            entry.sortOrder,
          );
        }
        await db.run(
          "UPDATE custom_decks SET updated_at=CURRENT_TIMESTAMP WHERE id=? AND teacher_user_id=?",
          deckId,
          req.user!.userId,
        );
      }
      return true;
    }).then((owned) => {
      if (!owned) return undefined;
      return owned;
    });

    const owned = await getOwnedDeck(getDatabase(), deckId, req.user!.userId);
    if (!owned) return res.status(404).json({ error: "Custom deck not found" });
    const resultEntries = await getDatabase().all(
      "SELECT id, prompt, answer, sort_order FROM custom_deck_items WHERE deck_id=? ORDER BY sort_order ASC",
      deckId,
    );
    return res.json({ deck: { ...owned, entries: resultEntries } });
  } catch (error) {
    console.error("Update custom deck error:", error);
    return res.status(500).json({ error: "Unable to update custom deck" });
  }
}

router.put("/custom-decks/:id", authMiddleware, roleMiddleware("teacher"), updateDeck);
router.patch("/custom-decks/:id", authMiddleware, roleMiddleware("teacher"), updateDeck);

async function archiveDeck(req: Request, res: Response) {
  const deckId = parseDeckId(req.params.id);
  if (!deckId) return res.status(400).json({ error: "Invalid deck ID" });
  try {
    const result = await databaseTransaction(async (db) => {
      const owned = await getOwnedDeck(db, deckId, req.user!.userId);
      if (!owned) return false;
      await db.run(
        "UPDATE custom_decks SET status='archived', updated_at=CURRENT_TIMESTAMP WHERE id=? AND teacher_user_id=?",
        deckId,
        req.user!.userId,
      );
      return true;
    });
    if (!result) return res.status(404).json({ error: "Custom deck not found" });
    return res.json({ deck: await getOwnedDeck(getDatabase(), deckId, req.user!.userId) });
  } catch (error) {
    console.error("Archive custom deck error:", error);
    return res.status(500).json({ error: "Unable to archive custom deck" });
  }
}

router.post("/custom-decks/:id/archive", authMiddleware, roleMiddleware("teacher"), archiveDeck);

router.delete("/custom-decks/:id", authMiddleware, roleMiddleware("teacher"), async (req: Request, res: Response) => {
  const deckId = parseDeckId(req.params.id);
  if (!deckId) return res.status(400).json({ error: "Invalid deck ID" });
  try {
    const result = await databaseTransaction(async (db) => {
      const owned = await getOwnedDeck(db, deckId, req.user!.userId);
      if (!owned) return false;
      await db.run("DELETE FROM custom_decks WHERE id=? AND teacher_user_id=?", deckId, req.user!.userId);
      return true;
    });
    if (!result) return res.status(404).json({ error: "Custom deck not found" });
    return res.status(200).json({ deleted: true });
  } catch (error) {
    console.error("Delete custom deck error:", error);
    return res.status(500).json({ error: "Unable to delete custom deck" });
  }
});

export default router;

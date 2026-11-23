import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CUSTOM_DECK_IMPORT_MAX_BYTES,
  parseCustomDeckImport,
} from "../../src/lib/customDeckImport.js";

test("CSV and TXT import parsing preserves answers, prompts and duplicate validation", () => {
  const csv = parseCustomDeckImport("deck.csv", "answer,prompt\nGood morning,Common greeting\nThank you,Common expression\nMeeting,Office vocabulary\n");
  assert.deepEqual(csv.errors, []);
  assert.deepEqual(csv.entries.map((entry) => [entry.answer, entry.prompt]), [
    ["Good morning", "Common greeting"],
    ["Thank you", "Common expression"],
    ["Meeting", "Office vocabulary"],
  ]);

  const txt = parseCustomDeckImport("deck.txt", "Good morning\r\nThank you\r\nMeeting\r\n");
  assert.deepEqual(txt.errors, []);
  assert.deepEqual(txt.entries.map((entry) => entry.answer), ["Good morning", "Thank you", "Meeting"]);

  const duplicate = parseCustomDeckImport("deck.csv", "answer,prompt\nMeeting,Office\nmeeting,office\n");
  assert.equal(duplicate.entries.length, 1);
  assert.match(duplicate.warnings.join(" "), /1 duplicate entry was removed/);
});

test("TSV, malformed files, missing answers, extensions and limits are rejected", () => {
  const tsv = parseCustomDeckImport("deck.tsv", "answer\tprompt\nAppointment\tSchedule\n");
  assert.deepEqual(tsv.errors, []);
  assert.deepEqual(tsv.entries, [{ prompt: "Schedule", answer: "Appointment", sourceRow: 2 }]);

  assert(parseCustomDeckImport("deck.pdf", "answer").errors.some((error) => /Unsupported file format/.test(error)));
  assert(parseCustomDeckImport("deck.txt", "   ").errors.some((error) => /empty/.test(error)));
  assert(parseCustomDeckImport("deck.csv", "answer,prompt\n\"unterminated,Office").errors.some((error) => /Malformed/.test(error)));
  assert(parseCustomDeckImport("deck.csv", "answer,prompt\n,Missing answer\n").errors.some((error) => /missing answer/.test(error)));
  assert(parseCustomDeckImport("deck.txt", "x".repeat(501)).errors.some((error) => /exceeds 500/.test(error)));
  assert(parseCustomDeckImport("deck.txt", "word", CUSTOM_DECK_IMPORT_MAX_BYTES + 1).errors.some((error) => /too large/.test(error)));

  const excessive = parseCustomDeckImport("deck.txt", Array.from({ length: 501 }, (_, index) => `word${index}`).join("\n"));
  assert(excessive.errors.some((error) => /exceeds 500 entries/.test(error)));
});

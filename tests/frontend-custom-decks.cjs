const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");

function source(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("Custom Deck manager is teacher-only and registered in the existing app shell", () => {
  const app = source("src/App.tsx");
  const shell = source("src/components/AppShell.tsx");
  const dashboard = source("src/pages/Index.tsx");
  const teacherDashboard = source("src/pages/TeacherDashboard.tsx");

  assert(app.includes('path="custom-decks"'));
  assert(app.includes("user?.role === \"teacher\""));
  assert(app.includes("TeacherCustomDecksRoute"));
  assert(shell.includes('to: "/app/custom-decks"'));
  assert(shell.includes("teacherOnly: true"));
  assert(dashboard.includes('to="/app/custom-decks"'));
  assert(teacherDashboard.includes('to="/app/custom-decks"'));
});

test("Custom Deck API integration uses the existing authenticated request module", () => {
  const api = source("src/lib/playerApi.ts");
  assert(api.includes("export function getCustomDecks"));
  assert(api.includes("export function getCustomDeck"));
  assert(api.includes("export function createCustomDeck"));
  assert(api.includes("export function updateCustomDeck"));
  assert(api.includes("export function archiveCustomDeck"));
  assert(api.includes("export function deleteCustomDeck"));
  assert(api.includes('authenticatedRequest<{ decks: CustomDeck[] }>("/custom-decks")'));
  assert(api.includes('method: "POST"'));
  assert(api.includes('method: "PATCH"'));
  assert(api.includes('method: "DELETE"'));
});

test("Custom Deck manager implements create, edit, archive, delete and entry ordering controls", () => {
  const page = source("src/pages/CustomDecks.tsx");
  assert(page.includes("New Deck"));
  assert(page.includes("View / Edit"));
  assert(page.includes("Archive"));
  assert(page.includes("Delete"));
  assert(page.includes("addEntry"));
  assert(page.includes("removeEntry"));
  assert(page.includes("moveEntry"));
  assert(page.includes("sort_order"));
  assert(page.includes("Deck name is required."));
  assert(page.includes("A deck can contain at most 500 entries."));
  assert(page.includes('window.confirm'));
  assert(page.includes('role="alert"'));
  assert(page.includes('role="status"'));
});

test("Existing Word Bank file is not changed or repurposed", () => {
  const wordBank = source("src/pages/WordBank.tsx");
  assert(wordBank.includes("Gregg Stenography Word Bank"));
  assert(wordBank.includes("STENO_EXERCISES"));
});

test("Lobby Match Settings contains custom deck selection but no direct deck download", () => {
  const lobby = source("src/pages/Lobby.tsx");
  assert(lobby.includes("Practice Content"));
  assert(lobby.includes("My Custom Decks"));
  assert(lobby.includes("getCustomDecks"));
  assert(lobby.includes("customDeckId"));
  assert(lobby.includes("No active custom decks"));
  assert(!lobby.includes("FileReader"));
  assert(!lobby.includes("readAsText"));
});

test("Custom Deck manager includes browser import preview and append or replace controls", () => {
  const page = source("src/pages/CustomDecks.tsx");
  const parser = source("src/lib/customDeckImport.ts");
  assert(page.includes("Import File"));
  assert(page.includes("Confirm Import"));
  assert(page.includes("import-preview"));
  assert(page.includes("Append"));
  assert(page.includes("Replace"));
  assert(page.includes('accept=".csv,.txt,.tsv'));
  assert(page.includes("2 MB"));
  assert(parser.includes("parseCustomDeckImport"));
  assert(parser.includes("CUSTOM_DECK_IMPORT_MAX_BYTES"));
  assert(parser.includes("CUSTOM_DECK_MAX_ENTRIES"));
});

test("Partner POV uses a React preview and responsive split-screen layout", () => {
  const game = source("src/pages/Game.tsx");
  const preview = source("src/components/PartnerPovPreview.tsx");
  const scene = source("src/scenes/GameScene.ts");
  assert(game.includes("PartnerPovPreview"));
  assert(game.includes("partner_pov_update"));
  assert(game.includes("lg:flex-row"));
  assert(game.includes("lg:w-[35%]"));
  assert(preview.includes("Waiting for a partner"));
  assert(preview.includes("Disconnected"));
  assert(scene.includes("typedPrefix"));
  assert(scene.includes("remainingTime"));
});

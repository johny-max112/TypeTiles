import { useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import { ArrowDown, ArrowUp, Plus, RefreshCw, Trash2, Upload } from "lucide-react";
import {
  CUSTOM_DECK_IMPORT_MAX_BYTES,
  parseCustomDeckImport,
  type ImportedDeckEntry,
} from "../lib/customDeckImport";
import {
  archiveCustomDeck,
  createCustomDeck,
  deleteCustomDeck,
  getCustomDeck,
  getCustomDecks,
  updateCustomDeck,
  type CustomDeck,
  type CustomDeckEntryInput,
  type CustomDeckPracticeFormat,
} from "../lib/playerApi";

type EntryDraft = {
  prompt: string;
  answer: string;
};

type DeckDraft = {
  name: string;
  practiceFormat: CustomDeckPracticeFormat;
  entries: EntryDraft[];
};

const blankDeck: DeckDraft = {
  name: "",
  practiceFormat: "word-phrase",
  entries: [],
};

function formatPracticeFormat(format: CustomDeckPracticeFormat): string {
  return format === "full-sentence" ? "Full Sentence" : "Word / Phrase";
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown" : date.toLocaleString();
}

export default function CustomDecks() {
  const [decks, setDecks] = useState<CustomDeck[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [draft, setDraft] = useState<DeckDraft>(blankDeck);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportedDeckEntry[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [importFileName, setImportFileName] = useState("");
  const [importMode, setImportMode] = useState<"append" | "replace">("replace");

  const loadDecks = async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const response = await getCustomDecks();
      setDecks(response.decks);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load custom decks");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadDecks();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setDraft({ ...blankDeck, entries: [] });
    setSuccess("");
    setError("");
    setEditorOpen(true);
  };

  const openEdit = async (deckId: number) => {
    setError("");
    setSuccess("");
    try {
      const response = await getCustomDeck(deckId);
      setEditingId(deckId);
      setDraft({
        name: response.deck.name,
        practiceFormat: response.deck.practice_format,
        entries: (response.deck.entries ?? [])
          .slice()
          .sort((left, right) => left.sort_order - right.sort_order)
          .map((entry) => ({ prompt: entry.prompt ?? "", answer: entry.answer })),
      });
      setEditorOpen(true);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load the custom deck");
    }
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setEditingId(null);
    setDraft({ ...blankDeck, entries: [] });
  };

  const validateDraft = () => {
    const name = draft.name.trim();
    if (!name) return "Deck name is required.";
    if (name.length > 100) return "Deck name must be 100 characters or fewer.";
    if (draft.entries.length > 500) return "A deck can contain at most 500 entries.";
    for (const [index, entry] of draft.entries.entries()) {
      if (!entry.answer.trim()) return `Entry ${index + 1} requires an answer.`;
      if (entry.answer.trim().length > 500) return `Entry ${index + 1} answer must be 500 characters or fewer.`;
      if (entry.prompt.length > 500) return `Entry ${index + 1} prompt must be 500 characters or fewer.`;
    }
    return null;
  };

  const saveDeck = async () => {
    const validationError = validateDraft();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");
    const entries: CustomDeckEntryInput[] = draft.entries.map((entry, index) => ({
      prompt: entry.prompt.trim() || null,
      answer: entry.answer.trim(),
      sort_order: index,
    }));
    try {
      if (editingId === null) {
        await createCustomDeck({
          name: draft.name.trim(),
          practiceFormat: draft.practiceFormat,
          entries,
        });
        setSuccess("Custom deck created.");
      } else {
        await updateCustomDeck(editingId, {
          name: draft.name.trim(),
          practiceFormat: draft.practiceFormat,
          entries,
        });
        setSuccess("Custom deck updated.");
      }
      closeEditor();
      await loadDecks(true);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save the custom deck");
    } finally {
      setSaving(false);
    }
  };

  const addEntry = () => {
    if (draft.entries.length >= 500) {
      setError("A deck can contain at most 500 entries.");
      return;
    }
    setDraft((current) => ({
      ...current,
      entries: [...current.entries, { prompt: "", answer: "" }],
    }));
  };

  const updateEntry = (index: number, field: keyof EntryDraft, value: string) => {
    setDraft((current) => ({
      ...current,
      entries: current.entries.map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, [field]: value } : entry),
    }));
  };

  const removeEntry = (index: number) => {
    setDraft((current) => ({
      ...current,
      entries: current.entries.filter((_, entryIndex) => entryIndex !== index),
    }));
  };

  const moveEntry = (index: number, direction: -1 | 1) => {
    setDraft((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.entries.length) return current;
      const entries = [...current.entries];
      [entries[index], entries[target]] = [entries[target], entries[index]];
      return { ...current, entries };
    });
  };

  const openImport = () => {
    setImportPreview([]);
    setImportErrors([]);
    setImportWarnings([]);
    setImportFileName("");
    setImportMode(draft.entries.length > 0 ? "append" : "replace");
    setImportOpen(true);
  };

  const closeImport = () => {
    setImportOpen(false);
    setImportPreview([]);
    setImportErrors([]);
    setImportWarnings([]);
    setImportFileName("");
  };

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setImportFileName(file.name);
    setImportErrors([]);
    setImportWarnings([]);
    setImportPreview([]);
    if (file.size > CUSTOM_DECK_IMPORT_MAX_BYTES) {
      setImportErrors(["File is too large. Maximum file size is 2 MB."]);
      return;
    }
    const extension = file.name.toLowerCase().split(".").pop();
    if (!["csv", "txt", "tsv"].includes(extension ?? "")) {
      setImportErrors(["Unsupported file format. Use CSV, TXT, or TSV."]);
      return;
    }
    try {
      const content = await file.text();
      const result = parseCustomDeckImport(file.name, content, file.size);
      setImportPreview(result.entries);
      setImportErrors(result.errors);
      setImportWarnings(result.warnings);
    } catch {
      setImportErrors(["Unable to read the selected file."]);
    }
  };

  const updateImportEntry = (index: number, field: "prompt" | "answer", value: string) => {
    setImportPreview((current) => current.map((entry, entryIndex) =>
      entryIndex === index ? { ...entry, [field]: value } : entry));
  };

  const removeImportEntry = (index: number) => {
    setImportPreview((current) => current.filter((_, entryIndex) => entryIndex !== index));
  };

  const confirmImport = () => {
    const previewErrors: string[] = [];
    if (importPreview.length === 0) previewErrors.push("The import contains no entries.");
    if (importPreview.length > 500) previewErrors.push("The import exceeds 500 entries.");
    importPreview.forEach((entry, index) => {
      if (!entry.answer.trim()) previewErrors.push(`Preview entry ${index + 1} requires an answer.`);
      if (entry.answer.trim().length > 500) previewErrors.push(`Preview entry ${index + 1} answer exceeds 500 characters.`);
      if (entry.prompt.length > 500) previewErrors.push(`Preview entry ${index + 1} prompt exceeds 500 characters.`);
    });
    if (importErrors.length > 0 || previewErrors.length > 0) {
      setImportErrors([...importErrors, ...previewErrors]);
      return;
    }

    const imported = importPreview.map((entry) => ({
      prompt: entry.prompt.trim(),
      answer: entry.answer.trim(),
    }));
    const seen = new Set(importMode === "replace" ? [] : draft.entries.map((entry) => `${entry.prompt.trim().toLowerCase()}|\u0000|${entry.answer.trim().toLowerCase()}`));
    const combined = importMode === "replace"
      ? []
      : draft.entries.map((entry) => ({ prompt: entry.prompt.trim(), answer: entry.answer.trim() }));
    for (const entry of imported) {
      const key = `${entry.prompt.toLowerCase()}|\u0000|${entry.answer.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      combined.push(entry);
    }
    if (combined.length > 500) {
      setImportErrors(["The resulting deck would exceed 500 entries. Remove entries or use Replace mode."]);
      return;
    }
    setDraft((current) => ({
      ...current,
      entries: combined,
    }));
    setSuccess(`${importPreview.length} imported entries staged. Save the deck to apply them.`);
    closeImport();
  };

  const archiveDeck = async (deck: CustomDeck) => {
    if (!window.confirm(`Archive "${deck.name}"? Historical match records and snapshots will remain intact.`)) return;
    setError("");
    setSuccess("");
    try {
      await archiveCustomDeck(deck.id);
      setSuccess(`"${deck.name}" was archived.`);
      await loadDecks(true);
    } catch (archiveError) {
      setError(archiveError instanceof Error ? archiveError.message : "Unable to archive the custom deck");
    }
  };

  const removeDeck = async (deck: CustomDeck) => {
    if (!window.confirm(`Delete "${deck.name}"? Match snapshots will remain intact.`)) return;
    setError("");
    setSuccess("");
    try {
      await deleteCustomDeck(deck.id);
      setSuccess(`"${deck.name}" was deleted.`);
      await loadDecks(true);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete the custom deck");
    }
  };

  return (
    <section className="h-full overflow-y-auto pb-6" aria-labelledby="custom-decks-heading">
      <div className="rounded-[8px] bg-[linear-gradient(197deg,#08122e_17%,rgba(43,51,89,.9)_46%,#13173b_81%)] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[998px]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.35em] text-emerald-300">Teacher Content</div>
              <h1 id="custom-decks-heading" className="mt-2 text-3xl font-semibold text-white">Custom Decks</h1>
              <p className="mt-2 text-sm text-slate-300">Create private word and sentence practice lists for your classes.</p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => void loadDecks(true)} disabled={refreshing} className="inline-flex items-center gap-2 rounded-[8px] border border-white/15 px-4 py-2 text-sm text-white disabled:opacity-60">
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </button>
              <button type="button" onClick={openCreate} className="inline-flex items-center gap-2 rounded-[8px] bg-[#2746a6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#3558c5]">
                <Plus className="h-4 w-4" />
                New Deck
              </button>
            </div>
          </div>

          {error ? <div role="alert" className="mt-4 rounded-lg border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">{error}</div> : null}
          {success ? <div role="status" className="mt-4 rounded-lg border border-emerald-400/40 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">{success}</div> : null}

          {loading ? (
            <div className="mt-6 rounded-[8px] border border-white/10 bg-[#0a1325]/70 p-8 text-center text-slate-300">Loading custom decks...</div>
          ) : decks.length === 0 ? (
            <div className="mt-6 rounded-[8px] border border-dashed border-white/20 bg-[#0a1325]/70 p-8 text-center">
              <h2 className="text-xl font-semibold text-white">No custom decks yet</h2>
              <p className="mt-2 text-sm text-slate-300">Create your first word or sentence deck.</p>
              <button type="button" onClick={openCreate} className="mt-5 rounded-[8px] bg-[#2746a6] px-5 py-2.5 text-sm font-semibold text-white">Create Deck</button>
            </div>
          ) : (
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              {decks.map((deck) => (
                <article key={deck.id} className={`rounded-[8px] border p-5 ${deck.status === "archived" ? "border-slate-500/40 bg-slate-900/60" : "border-[#2967a1] bg-[#0a1325]/70"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate text-xl font-semibold text-white" title={deck.name}>{deck.name}</h2>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full border border-white/10 px-2 py-1 text-slate-200">{formatPracticeFormat(deck.practice_format)}</span>
                        <span className={`rounded-full px-2 py-1 ${deck.status === "active" ? "bg-emerald-400/15 text-emerald-300" : "bg-slate-400/15 text-slate-300"}`}>{deck.status === "active" ? "Active" : "Archived"}</span>
                        <span className="rounded-full border border-white/10 px-2 py-1 text-slate-300">{deck.entry_count ?? deck.entries?.length ?? 0} entries</span>
                      </div>
                    </div>
                  </div>
                  <p className="mt-4 text-xs text-slate-400">Updated {formatDate(deck.updated_at)}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button type="button" onClick={() => void openEdit(deck.id)} className="rounded-[7px] border border-sky-400/40 px-3 py-2 text-sm text-sky-200 hover:bg-sky-400/10">View / Edit</button>
                    {deck.status === "active" ? (
                      <button type="button" onClick={() => void archiveDeck(deck)} className="rounded-[7px] border border-amber-300/40 px-3 py-2 text-sm text-amber-200 hover:bg-amber-300/10">Archive</button>
                    ) : null}
                    <button type="button" onClick={() => void removeDeck(deck)} className="inline-flex items-center gap-1 rounded-[7px] border border-red-400/40 px-3 py-2 text-sm text-red-200 hover:bg-red-400/10">
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>

      {editorOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="deck-editor-heading">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[12px] border border-white/10 bg-[#11163d] shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#11163d] px-5 py-4">
              <h2 id="deck-editor-heading" className="text-xl font-semibold text-white">{editingId === null ? "Create Custom Deck" : "Edit Custom Deck"}</h2>
              <button type="button" onClick={closeEditor} disabled={saving} className="text-sm text-slate-300 hover:text-white">Cancel</button>
            </div>
            <div className="grid gap-5 p-5 lg:grid-cols-[260px_minmax(0,1fr)]">
              <div className="space-y-4">
                <label className="block text-sm text-slate-300" htmlFor="deck-name">
                  Deck name
                  <input id="deck-name" value={draft.name} maxLength={100} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2.5 text-white outline-none focus:border-sky-400" />
                </label>
                <label className="block text-sm text-slate-300" htmlFor="deck-format">
                  Practice format
                  <select id="deck-format" value={draft.practiceFormat} onChange={(event) => setDraft((current) => ({ ...current, practiceFormat: event.target.value as CustomDeckPracticeFormat }))} className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2.5 text-white outline-none focus:border-sky-400">
                    <option value="word-phrase">Word / Phrase</option>
                    <option value="full-sentence">Full Sentence</option>
                  </select>
                </label>
                <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-xs text-slate-400">
                  Up to 500 entries. Answers are required and limited to 500 characters.
                </div>
              </div>

              <div className="min-w-0">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="font-semibold text-white">Entries <span className="text-sm text-slate-400">({draft.entries.length}/500)</span></h3>
                  <div className="flex gap-2">
                    <button type="button" onClick={openImport} className="inline-flex items-center gap-2 rounded-[7px] border border-sky-400/40 px-3 py-2 text-sm text-sky-200">
                      <Upload className="h-4 w-4" />
                      Import File
                    </button>
                    <button type="button" onClick={addEntry} disabled={draft.entries.length >= 500} className="inline-flex items-center gap-2 rounded-[7px] border border-emerald-400/40 px-3 py-2 text-sm text-emerald-200 disabled:opacity-50">
                      <Plus className="h-4 w-4" />
                      Add Entry
                    </button>
                  </div>
                </div>
                {draft.entries.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-white/15 p-6 text-center text-sm text-slate-400">No entries added.</div>
                ) : (
                  <div className="space-y-3">
                    {draft.entries.map((entry, index) => (
                      <div key={index} className="grid gap-2 rounded-lg border border-white/10 bg-slate-950/40 p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
                        <label className="text-xs text-slate-400" htmlFor={`entry-prompt-${index}`}>
                          Prompt <span className="text-slate-500">(optional)</span>
                          <input id={`entry-prompt-${index}`} value={entry.prompt} maxLength={500} onChange={(event) => updateEntry(index, "prompt", event.target.value)} className="mt-1 w-full rounded border border-white/10 bg-[#11183a] px-3 py-2 text-sm text-white" />
                        </label>
                        <label className="text-xs text-slate-400" htmlFor={`entry-answer-${index}`}>
                          Answer
                          <input id={`entry-answer-${index}`} value={entry.answer} maxLength={500} onChange={(event) => updateEntry(index, "answer", event.target.value)} className="mt-1 w-full rounded border border-white/10 bg-[#11183a] px-3 py-2 text-sm text-white" />
                        </label>
                        <div className="flex gap-1">
                          <button type="button" onClick={() => moveEntry(index, -1)} disabled={index === 0} aria-label={`Move entry ${index + 1} up`} className="rounded border border-white/10 p-2 text-slate-300 disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
                          <button type="button" onClick={() => moveEntry(index, 1)} disabled={index === draft.entries.length - 1} aria-label={`Move entry ${index + 1} down`} className="rounded border border-white/10 p-2 text-slate-300 disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
                          <button type="button" onClick={() => removeEntry(index)} aria-label={`Remove entry ${index + 1}`} className="rounded border border-red-400/30 p-2 text-red-300"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="sticky bottom-0 flex justify-end gap-2 border-t border-white/10 bg-[#11163d] px-5 py-4">
              <button type="button" onClick={closeEditor} disabled={saving} className="rounded-[7px] border border-white/15 px-4 py-2 text-sm text-white disabled:opacity-50">Cancel</button>
              <button type="button" onClick={() => void saveDeck()} disabled={saving} className="rounded-[7px] bg-emerald-400 px-5 py-2 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60">
                {saving ? "Saving..." : editingId === null ? "Create Deck" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {importOpen ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/85 p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="deck-import-heading">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-[12px] border border-white/10 bg-[#11163d] shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#11163d] px-5 py-4">
              <div>
                <h2 id="deck-import-heading" className="text-xl font-semibold text-white">Import Deck File</h2>
                {importFileName ? <p className="mt-1 text-xs text-slate-400">{importFileName}</p> : null}
              </div>
              <button type="button" onClick={closeImport} className="text-sm text-slate-300 hover:text-white">Cancel</button>
            </div>
            <div className="p-5">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                <label className="block text-sm text-slate-300" htmlFor="custom-deck-import-file">
                  CSV, TXT, or TSV file (maximum 2 MB)
                  <input
                    id="custom-deck-import-file"
                    type="file"
                    accept=".csv,.txt,.tsv,text/csv,text/plain,text/tab-separated-values"
                    onChange={(event) => void handleImportFile(event)}
                    className="mt-2 block w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white file:mr-3 file:rounded file:border-0 file:bg-[#2746a6] file:px-3 file:py-2 file:text-white"
                  />
                </label>
                <fieldset className="rounded-lg border border-white/10 p-3 text-sm text-slate-300">
                  <legend className="px-2 text-xs uppercase tracking-wide text-slate-400">Import behavior</legend>
                  <label className="mr-4 inline-flex items-center gap-2">
                    <input type="radio" name="import-mode" checked={importMode === "append"} onChange={() => setImportMode("append")} />
                    Append
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input type="radio" name="import-mode" checked={importMode === "replace"} onChange={() => setImportMode("replace")} />
                    Replace
                  </label>
                </fieldset>
              </div>

              {importErrors.length > 0 ? (
                <div role="alert" className="mt-4 space-y-1 rounded-lg border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
                  {importErrors.map((message, index) => <div key={`${message}-${index}`}>{message}</div>)}
                </div>
              ) : null}
              {importWarnings.length > 0 ? (
                <div role="status" className="mt-4 space-y-1 rounded-lg border border-sky-400/40 bg-sky-400/10 px-4 py-3 text-sm text-sky-200">
                  {importWarnings.map((message, index) => <div key={`${message}-${index}`}>{message}</div>)}
                </div>
              ) : null}

              <div className="mt-5">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-semibold text-white">Preview</h3>
                  <span className="text-sm text-slate-400">{importPreview.length} valid entries</span>
                </div>
                {importPreview.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-white/15 p-6 text-center text-sm text-slate-400">Select a supported file to preview entries.</div>
                ) : (
                  <div data-testid="import-preview" className="max-h-[45vh] overflow-y-auto rounded-lg border border-white/10">
                    <table className="w-full text-left text-sm text-white">
                      <thead className="sticky top-0 bg-slate-950 text-xs uppercase text-slate-400">
                        <tr>
                          <th className="px-3 py-2">Row</th>
                          <th className="px-3 py-2">Prompt</th>
                          <th className="px-3 py-2">Answer</th>
                          <th className="px-3 py-2 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importPreview.map((entry, index) => (
                          <tr key={`${entry.sourceRow}-${index}`} className="border-t border-white/10">
                            <td className="px-3 py-2 text-slate-400">{entry.sourceRow}</td>
                            <td className="px-3 py-2">
                              <input value={entry.prompt} maxLength={500} aria-label={`Imported prompt row ${entry.sourceRow}`} onChange={(event) => updateImportEntry(index, "prompt", event.target.value)} className="w-full rounded border border-white/10 bg-slate-950/60 px-2 py-1.5" />
                            </td>
                            <td className="px-3 py-2">
                              <input value={entry.answer} maxLength={500} aria-label={`Imported answer row ${entry.sourceRow}`} onChange={(event) => updateImportEntry(index, "answer", event.target.value)} className="w-full rounded border border-white/10 bg-slate-950/60 px-2 py-1.5" />
                            </td>
                            <td className="px-3 py-2 text-right">
                              <button type="button" onClick={() => removeImportEntry(index)} className="rounded border border-red-400/30 p-2 text-red-300" aria-label={`Remove imported row ${entry.sourceRow}`}><Trash2 className="h-4 w-4" /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
            <div className="sticky bottom-0 flex justify-end gap-2 border-t border-white/10 bg-[#11163d] px-5 py-4">
              <button type="button" onClick={closeImport} className="rounded-[7px] border border-white/15 px-4 py-2 text-sm text-white">Cancel</button>
              <button type="button" onClick={confirmImport} disabled={importPreview.length === 0} className="rounded-[7px] bg-emerald-400 px-5 py-2 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50">
                Confirm Import
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

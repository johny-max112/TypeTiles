export type ImportedDeckEntry = {
  prompt: string;
  answer: string;
  sourceRow: number;
};

export type CustomDeckImportResult = {
  entries: ImportedDeckEntry[];
  errors: string[];
  warnings: string[];
};

export const CUSTOM_DECK_IMPORT_MAX_BYTES = 2 * 1024 * 1024;
export const CUSTOM_DECK_MAX_ENTRIES = 500;
export const CUSTOM_DECK_MAX_ANSWER_LENGTH = 500;
export const CUSTOM_DECK_MAX_PROMPT_LENGTH = 500;

function parseDelimited(text: string, delimiter: "," | "\t"): { rows: string[][]; errors: string[] } {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const errors: string[] = [];

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"') {
      if (field.length === 0) quoted = true;
      else field += character;
      continue;
    }
    if (character === delimiter) {
      row.push(field);
      field = "";
      continue;
    }
    if (character === "\r") {
      if (text[index + 1] === "\n") index += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }
    if (character === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }
    field += character;
  }

  if (quoted) errors.push("Malformed delimited file: an opening quotation mark is missing its closing quote.");
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return { rows: rows.filter((current) => current.some((value) => value.trim().length > 0)), errors };
}

export function parseCustomDeckImport(fileName: string, content: string, fileSize?: number): CustomDeckImportResult {
  if (fileSize !== undefined && fileSize > CUSTOM_DECK_IMPORT_MAX_BYTES) {
    return { entries: [], errors: ["File is too large. Maximum file size is 2 MB."], warnings: [] };
  }

  const extension = fileName.trim().toLowerCase().split(".").pop();
  if (!["csv", "txt", "tsv"].includes(extension ?? "")) {
    return { entries: [], errors: ["Unsupported file format. Use CSV, TXT, or TSV."], warnings: [] };
  }
  if (!content.trim()) {
    return { entries: [], errors: ["The selected file is empty."], warnings: [] };
  }

  if (extension === "txt") {
    const entries: ImportedDeckEntry[] = [];
    const errors: string[] = [];
    content.split(/\r?\n/).forEach((line, index) => {
      const answer = line.trim();
      if (!answer) return;
      if (answer.length > CUSTOM_DECK_MAX_ANSWER_LENGTH) {
        errors.push(`Row ${index + 1}: answer exceeds ${CUSTOM_DECK_MAX_ANSWER_LENGTH} characters.`);
        return;
      }
      entries.push({ prompt: "", answer, sourceRow: index + 1 });
    });
    return finalizeImport(entries, errors);
  }

  const delimiter = extension === "tsv" ? "\t" : ",";
  const parsed = parseDelimited(content, delimiter);
  const errors = [...parsed.errors];
  if (parsed.rows.length === 0) return { entries: [], errors: ["The selected file contains no entries."], warnings: [] };

  const first = parsed.rows[0].map((value) => value.trim().toLowerCase());
  const answerHeaderIndex = first.findIndex((value) => ["answer", "content", "word", "phrase"].includes(value));
  const promptHeaderIndex = first.findIndex((value) => ["prompt", "meaning", "shorthand"].includes(value));
  const hasAnswerHeader = answerHeaderIndex >= 0;
  const answerIndex = hasAnswerHeader ? answerHeaderIndex : 0;
  const promptIndex = promptHeaderIndex >= 0 ? promptHeaderIndex : (hasAnswerHeader ? 1 : 1);
  const dataRows = hasAnswerHeader ? parsed.rows.slice(1) : parsed.rows;

  const entries: ImportedDeckEntry[] = [];
  dataRows.forEach((row, rowIndex) => {
    const sourceRow = rowIndex + (hasAnswerHeader ? 2 : 1);
    if (row.length > parsed.rows[0].length) {
      errors.push(`Row ${sourceRow}: malformed row has more columns than the header.`);
    }
    const answer = (row[answerIndex] ?? "").trim();
    const prompt = (row[promptIndex] ?? "").trim();
    if (!answer) {
      errors.push(`Row ${sourceRow}: missing answer.`);
      return;
    }
    if (answer.length > CUSTOM_DECK_MAX_ANSWER_LENGTH) {
      errors.push(`Row ${sourceRow}: answer exceeds ${CUSTOM_DECK_MAX_ANSWER_LENGTH} characters.`);
      return;
    }
    if (prompt.length > CUSTOM_DECK_MAX_PROMPT_LENGTH) {
      errors.push(`Row ${sourceRow}: prompt exceeds ${CUSTOM_DECK_MAX_PROMPT_LENGTH} characters.`);
      return;
    }
    entries.push({ prompt, answer, sourceRow });
  });

  return finalizeImport(entries, errors);
}

function finalizeImport(entries: ImportedDeckEntry[], errors: string[]): CustomDeckImportResult {
  if (entries.length > CUSTOM_DECK_MAX_ENTRIES) {
    errors.push(`Import exceeds ${CUSTOM_DECK_MAX_ENTRIES} entries.`);
  }

  const unique: ImportedDeckEntry[] = [];
  const warnings: string[] = [];
  let duplicateCount = 0;
  const seen = new Set<string>();
  for (const entry of entries) {
    const key = `${entry.prompt.trim().toLowerCase()}|\u0000|${entry.answer.trim().toLowerCase()}`;
    if (seen.has(key)) {
      duplicateCount += 1;
      continue;
    }
    seen.add(key);
    unique.push(entry);
  }
  if (duplicateCount > 0) warnings.push(`${duplicateCount} duplicate ${duplicateCount === 1 ? "entry was" : "entries were"} removed.`);
  if (entries.length === 0 && errors.length === 0) errors.push("The selected file contains no valid entries.");
  return { entries: unique, errors, warnings };
}

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const sql = fs.readFileSync(path.join(dir, '../../supabase/migrations/20261018000100_initial_type_tiles.sql'), 'utf8');
const tables = [...sql.matchAll(/CREATE TABLE public\.(\w+) \(([\s\S]*?)\n  \);/g)].map(([, name, body]) => ({
  name,
  columns: body.split('\n').map(x => x.trim()).filter(x => x && !x.startsWith('--')).map(line => {
    const [, name, rawType] = line.match(/^(\w+)\s+(\w+)/);
    const type = rawType === 'DOUBLE' ? 'REAL' : rawType;
    const key = /PRIMARY KEY/.test(line) ? ' PK' : /REFERENCES/.test(line) ? (/UNIQUE/.test(line) ? ' FK,UK' : ' FK') : /UNIQUE/.test(line) ? ' UK' : '';
    return `        ${type} ${name}${key}`;
  }),
}));
tables.find(t => t.name === 'matches').columns.push('        INTEGER owner_user_id FK');
const relationships = [
  '    users ||--o| user_stats : summarizes',
  '    users |o--o{ matches : owns',
  '    users ||--o{ match_participants : participates',
  '    matches ||--o{ match_participants : contains',
  '    users ||--o{ match_results : receives',
  '    matches ||--o{ match_results : has',
  '    users ||--o{ admin_logs : performs',
  '    users |o--o{ admin_logs : targets',
  '    users ||--o{ feedback : submits',
  '    users ||--o{ email_verification_codes : verifies',
  '    users ||--o{ password_reset_codes : resets',
];
const diagram = ['erDiagram', '    direction LR', ...relationships, ...tables.flatMap(t => [`    ${t.name} {`, ...t.columns, '    }'])].join('\n') + '\n';
fs.writeFileSync(path.join(dir, 'type-tiles-erd.mmd'), diagram);
fs.writeFileSync(path.join(dir, 'puppeteer-config.json'), JSON.stringify({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' }));
console.log(`Generated ${tables.length}-table ERD from migrations, including classroom ownership.`);

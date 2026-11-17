import { readFile, writeFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
async function load(path) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  return import(`data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(source)).toString('base64')}`);
}
const { demoProducts } = await load('../src/data/demo.ts');
const { demoOffers } = await load('../src/data/offers.ts');
const quote = value => `'${String(value).replaceAll("'", "''")}'`;
const statements = ['-- Initial catalogue only. INSERT OR IGNORE preserves existing edits.'];
for (const [table, records] of [['products', demoProducts], ['offers', demoOffers]]) {
  records.forEach((record, index) => statements.push(`INSERT OR IGNORE INTO ${table}(id,data,active,sort_order) VALUES (${quote(record.id)},${quote(JSON.stringify(record))},${Number(record.active)},${index});`));
}
const file = new URL('../migrations/0002_catalog.sql', import.meta.url);
// This seed migration is committed once; later edits belong in the admin UI or a new migration.
try { await writeFile(file, statements.join('\n') + '\n', { flag: 'wx' }); console.log('Created migrations/0002_catalog.sql'); }
catch (error) { if (error.code === 'EEXIST') console.log('Seed already exists; left unchanged.'); else throw error; }

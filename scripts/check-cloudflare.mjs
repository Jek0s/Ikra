import { readFile } from 'node:fs/promises';
const config = JSON.parse(await readFile(new URL('../wrangler.jsonc', import.meta.url), 'utf8'));
const id = config.d1_databases?.find(binding => binding.binding === 'DB')?.database_id;
if (!id || id === '00000000-0000-0000-0000-000000000000') {
  console.error('Сначала создайте базу: npx wrangler d1 create ikra-deluxe\nЗатем укажите полученный database_id в wrangler.jsonc. Инструкция: ПОДКЛЮЧЕНИЕ-CLOUDFLARE.md');
  process.exit(1);
}

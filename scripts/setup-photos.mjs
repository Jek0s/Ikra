import { readFile, writeFile, chmod } from 'node:fs/promises';
import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';
import { spawnSync } from 'node:child_process';

if (!process.stdin.isTTY) {
  console.error('Запустите в терминале IntelliJ: npm run photos:setup');
  process.exit(1);
}

// Hide every credential while typing; never put secrets into shell arguments.
const hidden = new Writable({ write(_chunk, _encoding, callback) { callback(); } });
const rl = createInterface({ input: process.stdin, output: hidden, terminal: true });
rl.on('SIGINT', () => { rl.close(); process.stdout.write('\n'); process.exit(130); });
const values = {};
try {
  console.log('Откройте Cloudinary → Settings → API Keys. Ввод данных скрыт.');
  for (const [name, label, pattern] of [
    ['CLOUDINARY_CLOUD_NAME', 'Cloud name', /^[a-zA-Z0-9_-]+$/],
    ['CLOUDINARY_API_KEY', 'API Key', /^\d+$/],
    ['CLOUDINARY_API_SECRET', 'API Secret', /^[a-zA-Z0-9_-]+$/],
  ]) {
    process.stdout.write(`${label}: `);
    const value = (await rl.question('')).trim();
    process.stdout.write('\n');
    if (!pattern.test(value)) throw new Error(`Проверьте поле ${label}. Данные не сохранены.`);
    values[name] = value;
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  rl.close();
}
if (process.exitCode) process.exit(process.exitCode);

let existing = '';
try { existing = await readFile('.dev.vars', 'utf8'); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
const kept = existing.split('\n').filter(line => !Object.keys(values).some(name => new RegExp(`^\\s*(?:export\\s+)?${name}\\s*=`).test(line))).join('\n').trim();
await writeFile('.dev.vars', [kept, ...Object.entries(values).map(([name, value]) => `${name}=${JSON.stringify(value)}`)].filter(Boolean).join('\n') + '\n', { mode: 0o600 });
await chmod('.dev.vars', 0o600);
console.log('Настройки сохранены для локального сайта. Перезапустите локальный сервер Cloudflare.');

if (process.argv.includes('--remote')) {
  const result = spawnSync(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'secret', 'bulk'], {
    input: JSON.stringify(values), stdio: ['pipe', 'inherit', 'inherit'],
  });
  if (result.status !== 0) {
    console.error('Не удалось сохранить настройки в Cloudflare. Локальные настройки сохранены. Проверьте вход командой npx wrangler login и повторите настройку.');
    process.exitCode = 1;
  } else {
    console.log('Настройки отправлены в Cloudflare. Проверьте загрузку фото через админку опубликованного сайта и сохраните товар.');
  }
} else {
  console.log('Для опубликованного сайта используйте npm run photos:setup -- --remote.');
}

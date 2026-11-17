import { randomBytes, createHash } from 'node:crypto';
import { readFile, writeFile, chmod } from 'node:fs/promises';
import { createInterface } from 'node:readline/promises';
import { spawnSync } from 'node:child_process';
const rl = createInterface({ input: process.stdin, output: process.stdout });
const login = (await rl.question('Логин единственного администратора (например, ikra_admin): ')).trim().toLowerCase();
rl.close();
if (!/^[a-z0-9_.@+-]{3,64}$/.test(login)) throw new Error('Логин: от 3 до 64 латинских букв, цифр или символов _ . @ + -');
const password = randomBytes(24).toString('base64url');
const values = { ADMIN_LOGIN: login, ADMIN_PASSWORD_SHA256: createHash('sha256').update(password).digest('hex'), SESSION_SECRET: randomBytes(48).toString('base64url') };
if (process.argv.includes('--remote')) {
  for (const [name, value] of Object.entries(values)) {
    const result = spawnSync(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'secret', 'put', name], { input: value, stdio: ['pipe', 'inherit', 'inherit'] });
    if (result.status !== 0) throw new Error(`Не удалось сохранить ${name}`);
  }
} else {
  let existing = '';
  try { existing = await readFile('.dev.vars', 'utf8'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const filtered = existing.split('\n').filter(line => ![...Object.keys(values), 'ADMIN_EMAIL'].some(name => line.startsWith(`${name}=`))).join('\n').trim();
  await writeFile('.dev.vars', [filtered, ...Object.entries(values).map(([name, value]) => `${name}=${JSON.stringify(value)}`)].filter(Boolean).join('\n') + '\n', { mode: 0o600 });
  await chmod('.dev.vars', 0o600);
}
console.log(`\nЛогин: ${login}\nПароль: ${password}\nСохраните пароль в менеджере паролей. Не присылайте его в чат.\n${process.argv.includes('--remote') ? 'Секреты записаны в Cloudflare.' : 'Локальные секреты записаны в .dev.vars (не публикуется).'}\nПовторный запуск заменит пароль и завершит старые сессии.`);

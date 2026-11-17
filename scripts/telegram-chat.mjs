import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';

if (!process.stdin.isTTY) {
  console.error('Запустите эту команду в обычном терминале: node scripts/telegram-chat.mjs');
  process.exit(1);
}
const hidden = new Writable({ write(_chunk, _encoding, callback) { callback(); } });
const rl = createInterface({ input: process.stdin, output: hidden, terminal: true });
rl.on('SIGINT', () => { rl.close(); process.stdout.write('\n'); process.exit(130); });
process.stdout.write('Вставьте токен BotFather (ввод скрыт), затем Enter: ');
const token = (await rl.question('')).trim();
rl.close(); process.stdout.write('\n');
if (!/^\d+:[a-zA-Z0-9_-]+$/.test(token)) { console.error('Некорректный формат токена'); process.exit(1); }
try {
  const response = await fetch(`https://api.telegram.org/bot${token}/getUpdates`, { signal: AbortSignal.timeout(15000) });
  const data = await response.json();
  if (!response.ok || !data.ok) throw new Error('telegram_error');
  const chats = new Map();
  for (const update of data.result ?? []) {
    const chat = update.message?.chat ?? update.my_chat_member?.chat ?? update.channel_post?.chat;
    if (chat) chats.set(chat.id, chat.type);
  }
  if (!chats.size) console.log('Чатов пока нет. Отправьте боту /start и повторите команду.');
  for (const [id, type] of chats) console.log(`TELEGRAM_CHAT_ID=${id} (${type})`);
} catch {
  console.error('Не удалось получить список чатов. Проверьте токен, доступ к Telegram и отсутствие другого активного обработчика этого бота.');
  process.exitCode = 1;
}

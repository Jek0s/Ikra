# Доповнення IKRA DeLuxe

Реалізовано: рухомий акційний рядок із паузою, триденний таймер зі збереженням між перезавантаженнями та повторним циклом, український FAQ, Maxi на 7 баночок, фото горбуші й новий товар «Голець» (599 грн), оновлений телефон, підсвітка номера, плаваючі контакти та карусель прикладів відгуків.

Maxi: 1 999 грн, попередня ціна 4 893 грн, економія 2 894 грн, приблизно 286 грн за баночку. Зображення: `public/offers/maxi.png`.

Контакти редагуються в `src/config/contact.ts`. Telegram очікує посилання магазину; порожнє посилання не відображається. Вигадані відгуки позначено як демонстраційні; для публікації справжніх відгуків замініть масив у `src/components/StorefrontExtras.tsx`.

Каталог має одноразове оновлення локально збережених товарів: змінюється стандартне фото горбуші, додається голець, зберігаються ціни й інші редагування. Локально збережені набори отримують Maxi. Після міграції видалені в адмінці нові позиції не відновлюються автоматично. Якщо увімкнути Supabase, його товари керуються окремо через адмінку.

Перевірки: production build, Chrome desktop 1440 px, мобільні екрани 390 і 320 px, відсутність горизонтального переповнення, завантаження всіх зображень, додавання Maxi у кошик, збереження таймера після перезавантаження та новий цикл після завершення. Надсилання замовлень не перевірялося: автоматична перевірка безпеки відхилила тестову відправку через потенційне звернення до зовнішньої бази.

## Зображення Maxi

Створено вбудованим imagegen за наявним референсом `public/offers/bundle-6.png`. Збережено в `public/offers/maxi.png`.

Фінальний промпт:

> Use case: product-mockup. Create a new luxury ecommerce product photograph for IKRA DeLuxe Maxi caviar collection. Reference image: use the exact glass jar shape, metallic gold lid, black branded label with gold IKRA DeLuxe lettering and fish, warm premium lighting and dark stone backdrop. Change composition to EXACTLY SEVEN individual jars, all clearly countable, four in back row and three in front, no extra jars, no loose lids. Seven varieties: four jars red/orange roe in subtly different colors, one black roe jar, two pale golden/yellow roe jars. All seven jars have the same legible IKRA DeLuxe gold on black branding. Wide landscape 3:2 composition, generous framing around all jars so none cropped. Elegant understated warm golden lighting, tiny ice crystals on dark stone base, subtle dark brown backdrop. No price text, no banners, no other text outside labels.

CREATE TABLE products (
 id TEXT PRIMARY KEY,
 data TEXT NOT NULL CHECK(json_valid(data)),
 active INTEGER NOT NULL CHECK(active IN (0,1)),
 sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE offers (
 id TEXT PRIMARY KEY,
 data TEXT NOT NULL CHECK(json_valid(data)),
 active INTEGER NOT NULL CHECK(active IN (0,1)),
 sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE site_sections (
 id TEXT PRIMARY KEY,
 data TEXT NOT NULL CHECK(json_valid(data)),
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE orders (
 id TEXT PRIMARY KEY,
 idempotency_key TEXT NOT NULL UNIQUE,
 request_hash TEXT NOT NULL,
 data TEXT NOT NULL CHECK(json_valid(data)),
 status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new','processing','shipped','done','cancelled')),
 created_at TEXT NOT NULL
);
CREATE INDEX orders_created_at ON orders(created_at DESC);
CREATE TABLE telegram_outbox (
 order_id TEXT PRIMARY KEY REFERENCES orders(id),
 attempts INTEGER NOT NULL DEFAULT 0,
 next_attempt INTEGER NOT NULL DEFAULT 0,
 lease_until INTEGER NOT NULL DEFAULT 0,
 sent_at INTEGER,
 last_error TEXT
);
CREATE INDEX telegram_outbox_due ON telegram_outbox(sent_at,next_attempt);
CREATE TABLE rate_limits (
 key TEXT PRIMARY KEY,
 count INTEGER NOT NULL,
 expires INTEGER NOT NULL
);

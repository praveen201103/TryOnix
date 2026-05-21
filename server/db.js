// ===== TryOnix — Database Setup (sql.js) =====
import initSqlJs from 'sql.js';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// On Vercel, the filesystem is read-only except /tmp
const isVercel = process.env.VERCEL === '1';
const dbDir = isVercel ? '/tmp' : path.join(__dirname, '..', 'data');
if (!isVercel && !existsSync(dbDir)) mkdirSync(dbDir, { recursive: true });

const dbPath = path.join(dbDir, 'tryonix.db');

const SQL = await initSqlJs();

let db;
if (existsSync(dbPath)) {
  const buffer = readFileSync(dbPath);
  db = new SQL.Database(buffer);
} else {
  db = new SQL.Database();
}

// Create tables
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    gender TEXT DEFAULT 'unisex',
    body_type TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

db.run(`
  CREATE TABLE IF NOT EXISTS avatars (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    image_path TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

db.run(`
  CREATE TABLE IF NOT EXISTS saved_outfits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    outfit_id TEXT NOT NULL,
    tryon_result_url TEXT,
    notes TEXT,
    saved_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, outfit_id)
  );
`);

db.run(`
  CREATE TABLE IF NOT EXISTS preferences (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    default_occasion TEXT,
    default_budget TEXT,
    default_body_type TEXT,
    default_gender TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Save DB to disk
function saveDb() {
  const data = db.export();
  const buffer = Buffer.from(data);
  writeFileSync(dbPath, buffer);
}

// Auto-save on changes
const originalRun = db.run.bind(db);
db.run = function (...args) {
  const result = originalRun(...args);
  saveDb();
  return result;
};

// Wrapper to mimic better-sqlite3's prepare().get() / .all() / .run() API
export const dbHelper = {
  get(sql, params = []) {
    const stmt = db.prepare(sql);
    if (params.length) stmt.bind(params);
    if (stmt.step()) {
      const cols = stmt.getColumnNames();
      const vals = stmt.get();
      stmt.free();
      const row = {};
      cols.forEach((col, i) => row[col] = vals[i]);
      return row;
    }
    stmt.free();
    return undefined;
  },

  all(sql, params = []) {
    const stmt = db.prepare(sql);
    if (params.length) stmt.bind(params);
    const results = [];
    while (stmt.step()) {
      const cols = stmt.getColumnNames();
      const vals = stmt.get();
      const row = {};
      cols.forEach((col, i) => row[col] = vals[i]);
      results.push(row);
    }
    stmt.free();
    return results;
  },

  run(sql, params = []) {
    db.run(sql, params);
    const changes = db.getRowsModified();
    // Get last insert rowid
    const lastId = dbHelper.get('SELECT last_insert_rowid() as id');
    return { changes, lastInsertRowid: lastId ? lastId.id : 0 };
  },
};

// Save initial state
saveDb();

export default dbHelper;

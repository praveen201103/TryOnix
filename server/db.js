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

// Lazy-initialized database (avoids top-level await issues on Vercel)
let db = null;
let dbReady = null;

async function initDb() {
  if (db) return db;
  if (dbReady) return dbReady;

  dbReady = (async () => {
    const SQL = await initSqlJs();

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

    // Save initial state
    saveDb();

    return db;
  })();

  return dbReady;
}

// Save DB to disk
function saveDb() {
  try {
    if (!db) return;
    const data = db.export();
    const buffer = Buffer.from(data);
    writeFileSync(dbPath, buffer);
  } catch (e) {
    // On Vercel, /tmp writes may sometimes fail — don't crash
    console.warn('DB save warning:', e.message);
  }
}

// Wrapper to mimic better-sqlite3's prepare().get() / .all() / .run() API
// All methods are now async since DB initialization is lazy
export const dbHelper = {
  async get(sql, params = []) {
    await initDb();
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

  async all(sql, params = []) {
    await initDb();
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

  async run(sql, params = []) {
    await initDb();
    db.run(sql, params);
    const changes = db.getRowsModified();
    // Get last insert rowid
    const lastIdRow = await dbHelper.get('SELECT last_insert_rowid() as id');
    saveDb();
    return { changes, lastInsertRowid: lastIdRow ? lastIdRow.id : 0 };
  },
};

export default dbHelper;

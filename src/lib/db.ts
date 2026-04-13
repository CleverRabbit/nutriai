import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.resolve(process.cwd(), 'data.db');
const db = new Database(dbPath);

// Initialize tables
db.exec("PRAGMA foreign_keys = ON;");
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    telegram_token TEXT,
    telegram_chat_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS family_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    age INTEGER,
    weight REAL,
    activity_level TEXT, -- 'low', 'medium', 'high'
    preferences TEXT,
    is_active INTEGER DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    quantity REAL NOT NULL,
    unit TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS nutrition_plan (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER UNIQUE NOT NULL,
    daily_kcal INTEGER NOT NULL,
    protein_g INTEGER NOT NULL,
    fat_g INTEGER NOT NULL,
    carbs_g INTEGER NOT NULL,
    summary TEXT,
    FOREIGN KEY (member_id) REFERENCES family_members(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    member_id INTEGER NOT NULL,
    type TEXT NOT NULL, -- 'food', 'exercise'
    description TEXT NOT NULL,
    kcal INTEGER DEFAULT 0,
    protein_g INTEGER DEFAULT 0,
    fat_g INTEGER DEFAULT 0,
    carbs_g INTEGER DEFAULT 0,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (member_id) REFERENCES family_members(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL,
    tg_bot_token TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

export default db;

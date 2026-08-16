const { createClient } = require('@libsql/client');

let _db = null;

async function initDB() {
  if (_db) return _db;

  const url = process.env.TURSO_DB_URL.replace('libsql://', 'https://');

  _db = createClient({
    url,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  // Create tables if they don't exist
  await _db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user TEXT NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'Other',
      note TEXT DEFAULT '',
      date TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner TEXT NOT NULL,
      scope TEXT NOT NULL DEFAULT 'personal',
      type TEXT NOT NULL,
      category TEXT,
      target_amount REAL NOT NULL,
      period TEXT NOT NULL DEFAULT 'monthly',
      label TEXT,
      created_at TEXT NOT NULL
    );
  `);

  return _db;
}

/**
 * Run a SELECT and return all rows as plain objects.
 */
async function queryAll(db, sql, params = []) {
  const result = await db.execute({ sql, args: params });
  return result.rows.map(row => Object.fromEntries(
    result.columns.map((col, i) => [col, row[i]])
  ));
}

/**
 * Run a SELECT and return first row or null.
 */
async function queryOne(db, sql, params = []) {
  const rows = await queryAll(db, sql, params);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Run INSERT/UPDATE/DELETE and return lastInsertRowid.
 */
async function run(db, sql, params = []) {
  const result = await db.execute({ sql, args: params });
  return result.lastInsertRowid ? Number(result.lastInsertRowid) : null;
}

module.exports = { initDB, queryAll, queryOne, run };

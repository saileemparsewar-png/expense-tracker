const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

// On Railway, use /data volume for persistence. Locally, use the db folder.
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'expenses.db');

let _db = null;

/**
 * Save the in-memory DB to disk.
 * Called after every write operation.
 */
function persist(db) {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

/**
 * Initialize and return the sql.js DB instance.
 * Loads from disk if file exists, otherwise creates fresh.
 */
async function initDB() {
  if (_db) return _db;

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    _db = new SQL.Database(fileBuffer);
  } else {
    _db = new SQL.Database();
  }

  _db.run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user TEXT NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'Other',
      note TEXT DEFAULT '',
      date TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS budgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user TEXT NOT NULL,
      category TEXT NOT NULL,
      monthly_limit REAL NOT NULL,
      month TEXT NOT NULL,
      UNIQUE(user, category, month)
    );
  `);

  persist(_db);
  return _db;
}

/**
 * Helper: run a SELECT and return all rows as objects.
 */
function queryAll(db, sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

/**
 * Helper: run a SELECT and return first row or null.
 */
function queryOne(db, sql, params = []) {
  const rows = queryAll(db, sql, params);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Helper: run INSERT/UPDATE/DELETE, persist to disk, return lastInsertRowid.
 */
function run(db, sql, params = []) {
  db.run(sql, params);
  persist(db);
  // Get last insert row id
  const result = queryOne(db, 'SELECT last_insert_rowid() as id');
  return result ? result.id : null;
}

module.exports = { initDB, persist, queryAll, queryOne, run, DB_PATH };

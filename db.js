const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// Use Render's persistent disk in production, local dir otherwise
const DB_DIR = process.env.NODE_ENV === 'production' ? '/data' : __dirname;
const DB_PATH = path.join(DB_DIR, 'exam_portal.db');

let db; // sql.js Database instance

// Save DB to disk
function saveDb() {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

// Initialize DB synchronously using a wrapper
async function initDb() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      roll_no TEXT UNIQUE NOT NULL
    );
    CREATE TABLE IF NOT EXISTS quizzes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      subject TEXT NOT NULL,
      duration_mins INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quiz_id INTEGER NOT NULL,
      question_text TEXT NOT NULL,
      option_a TEXT NOT NULL,
      option_b TEXT NOT NULL,
      option_c TEXT NOT NULL,
      option_d TEXT NOT NULL,
      correct_option TEXT NOT NULL,
      FOREIGN KEY (quiz_id) REFERENCES quizzes(id)
    );
    CREATE TABLE IF NOT EXISTS results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      quiz_id INTEGER NOT NULL,
      score INTEGER NOT NULL,
      total INTEGER NOT NULL,
      attempted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES students(id),
      FOREIGN KEY (quiz_id) REFERENCES quizzes(id)
    );
  `);

  // Seed default admin
  const adminRows = db.exec("SELECT id FROM admins WHERE username='admin'");
  if (!adminRows.length || !adminRows[0].values.length) {
    const hashed = bcrypt.hashSync('admin123', 10);
    db.run('INSERT INTO admins (username, password) VALUES (?, ?)', ['admin', hashed]);
    console.log('✅ Default admin created: admin / admin123');
  }

  saveDb();
  console.log('✅ SQLite database initialized.');
  return db;
}

// Helper: run a query and return last insert rowid
function run(sql, params = []) {
  db.run(sql, params);
  const rowId = db.exec('SELECT last_insert_rowid() as id');
  const lastId = rowId[0]?.values[0]?.[0] ?? null;
  saveDb();
  return { lastInsertRowid: lastId };
}

// Helper: get single row
function get(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

// Helper: get all rows
function all(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

module.exports = { initDb, run, get, all, saveDb };

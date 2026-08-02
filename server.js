const express = require('express');
const path = require('path');
const initSqlJs = require('sql.js');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const DB_PATH = path.join(__dirname, 'checklisty.db');

let db;

function query(sql, params = []) {
  const stmt = db.prepare(sql);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

function saveDb() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

async function initDb() {
  const SQL = await initSqlJs({
    locateFile: file => `./node_modules/sql.js/dist/${file}`
  });

  let existingDb = null;
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    existingDb = new SQL.Database(fileBuffer);
  }

  db = existingDb || new SQL.Database();

  db.run(`CREATE TABLE IF NOT EXISTS lists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#6366f1',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    list_id INTEGER NOT NULL,
    text TEXT NOT NULL,
    completed INTEGER DEFAULT 0,
    order_index INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (list_id) REFERENCES lists(id) ON DELETE CASCADE
  )`);

  try {
    db.run("SELECT * FROM stats LIMIT 0");
  } catch (e) {
    db.run(`CREATE TABLE IF NOT EXISTS stats (
      total_completed INTEGER DEFAULT 0,
      streak INTEGER DEFAULT 0,
      last_completed_date TEXT
    )`);
    db.run("INSERT INTO stats (total_completed, streak) VALUES (0, 0)");
  }

  saveDb();
}

// Lists API
app.get('/api/lists', (req, res) => {
  const rows = query("SELECT * FROM lists ORDER BY created_at DESC");
  res.json(rows);
});

app.post('/api/lists', (req, res) => {
  const { name, color } = req.body;
  const colorChoices = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#14b8a6'];
  const listColor = color || colorChoices[Math.floor(Math.random() * colorChoices.length)];
  db.run("INSERT INTO lists (name, color) VALUES (?, ?)", [name, listColor]);
  const result = db.exec("SELECT id, name, color, created_at FROM lists ORDER BY rowid DESC LIMIT 1")[0];
  const list = result.values[0];
  const row = { id: list[0], name: list[1], color: list[2], created_at: list[3] };
  saveDb();
  res.json(row);
});

app.delete('/api/lists/:id', (req, res) => {
  db.run("DELETE FROM lists WHERE id = ?", [req.params.id]);
  saveDb();
  res.json({ success: true });
});

// Items API
app.get('/api/lists/:listId/items', (req, res) => {
  const rows = query(`SELECT * FROM items WHERE list_id = ${req.params.listId} ORDER BY order_index ASC`);
  res.json(rows);
});

app.post('/api/lists/:listId/items', (req, res) => {
  const { text } = req.body;
  const count = db.exec(`SELECT COUNT(*) as count FROM items WHERE list_id = ${req.params.listId}`)[0].values[0][0];
  db.run("INSERT INTO items (list_id, text, order_index) VALUES (?, ?, ?)", [req.params.listId, text, count]);
  const result = db.exec("SELECT id, list_id, text, completed, order_index, created_at FROM items ORDER BY rowid DESC LIMIT 1")[0];
  const item = result.values[0];
  const row = { id: item[0], list_id: item[1], text: item[2], completed: item[3], order_index: item[4], created_at: item[5] };
  saveDb();
  res.json(row);
});

app.post('/api/items/:id/toggle', (req, res) => {
  const item = query(`SELECT * FROM items WHERE id = ${req.params.id}`)[0];
  if (!item) return res.status(404).json({ error: 'Item not found' });

  const newCompleted = item.completed ? 0 : 1;
  db.run("UPDATE items SET completed = ? WHERE id = ?", [newCompleted, req.params.id]);

  if (newCompleted) {
    const stats = db.exec("SELECT * FROM stats LIMIT 1")[0];
    const statsRow = stats.values[0];
    const completed = statsRow[stats.columns.indexOf('total_completed')];
    const streak = statsRow[stats.columns.indexOf('streak')];
    const lastDate = statsRow[stats.columns.indexOf('last_completed_date')];

    const today = new Date().toISOString().split('T')[0];
    let newStreak = streak;

    if (lastDate === today) {
      // same day, don't increment
    } else if (lastDate === new Date(Date.now() - 86400000).toISOString().split('T')[0]) {
      newStreak = streak + 1;
    } else {
      newStreak = 1;
    }

    db.run("UPDATE stats SET total_completed = ?, streak = ?, last_completed_date = ?", [completed + 1, newStreak, today]);
  }

  const updated = query(`SELECT * FROM items WHERE id = ${req.params.id}`)[0];
  saveDb();
  res.json(updated);
});

app.delete('/api/items/:id', (req, res) => {
  db.run("DELETE FROM items WHERE id = ?", [req.params.id]);
  saveDb();
  res.json({ success: true });
});

app.put('/api/items/:id/reorder', (req, res) => {
  db.run("UPDATE items SET order_index = ? WHERE id = ?", [req.body.order_index, req.params.id]);
  const updated = query(`SELECT * FROM items WHERE id = ${req.params.id}`)[0];
  saveDb();
  res.json(updated);
});

// Stats API
app.get('/api/stats', (req, res) => {
  const stats = db.exec("SELECT * FROM stats LIMIT 1")[0];
  const statsRow = stats.values[0];
  const totalItems = db.exec("SELECT COUNT(*) as count FROM items")[0].values[0][0];
  const completedItems = db.exec("SELECT COUNT(*) as count FROM items WHERE completed = 1")[0].values[0][0];
  res.json({
    total_completed: statsRow[stats.columns.indexOf('total_completed')],
    streak: statsRow[stats.columns.indexOf('streak')],
    last_completed_date: statsRow[stats.columns.indexOf('last_completed_date')],
    total_items: totalItems,
    completed_items: completedItems
  });
});

app.post('/api/stats/reset', (req, res) => {
  db.run("UPDATE stats SET total_completed = 0, streak = 0, last_completed_date = NULL");
  saveDb();
  const stats = db.exec("SELECT * FROM stats LIMIT 1")[0];
  const statsRow = stats.values[0];
  res.json({
    total_completed: statsRow[stats.columns.indexOf('total_completed')],
    streak: statsRow[stats.columns.indexOf('streak')],
    last_completed_date: statsRow[stats.columns.indexOf('last_completed_date')]
  });
});

app.get('/api/lists/:listId/progress', (req, res) => {
  const total = db.exec(`SELECT COUNT(*) as count FROM items WHERE list_id = ${req.params.listId}`)[0].values[0][0];
  const completed = db.exec(`SELECT COUNT(*) as count FROM items WHERE list_id = ${req.params.listId} AND completed = 1`)[0].values[0][0];
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  res.json({ total, completed, percent });
});

initDb().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Checklisty running at http://localhost:${PORT}`);
  });
});

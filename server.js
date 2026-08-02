const express = require('express');
const path = require('path');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const db = new Database(path.join(__dirname, 'checklisty.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS lists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#6366f1',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    list_id INTEGER NOT NULL,
    text TEXT NOT NULL,
    completed INTEGER DEFAULT 0,
    order_index INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (list_id) REFERENCES lists(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS stats (
    id INTEGER PRIMARY KEY KEY VALUE,
    total_completed INTEGER DEFAULT 0,
    streak INTEGER DEFAULT 0,
    last_completed_date TEXT
  );

  INSERT OR IGNORE INTO stats (id, total_completed, streak) VALUES (1, 0, 0);
`);

// Lists API
app.get('/api/lists', (req, res) => {
  const lists = db.prepare('SELECT * FROM lists ORDER BY created_at DESC').all();
  res.json(lists);
});

app.post('/api/lists', (req, res) => {
  const { name, color } = req.body;
  const colorChoices = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#14b8a6'];
  const listColor = color || colorChoices[Math.floor(Math.random() * colorChoices.length)];
  const stmt = db.prepare('INSERT INTO lists (name, color) VALUES (?, ?)');
  const result = stmt.run(name, listColor);
  const list = db.prepare('SELECT * FROM lists WHERE id = ?').get(result.lastInsertRowid);
  res.json(list);
});

app.delete('/api/lists/:id', (req, res) => {
  db.prepare('DELETE FROM lists WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Items API
app.get('/api/lists/:listId/items', (req, res) => {
  const items = db.prepare('SELECT * FROM items WHERE list_id = ? ORDER BY order_index ASC').all(req.params.listId);
  res.json(items);
});

app.post('/api/lists/:listId/items', (req, res) => {
  const { text } = req.body;
  const count = db.prepare('SELECT COUNT(*) as count FROM items WHERE list_id = ?').get(req.params.listId);
  const stmt = db.prepare('INSERT INTO items (list_id, text, order_index) VALUES (?, ?, ?)');
  const result = stmt.run(req.params.listId, text, count.count);
  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(result.lastInsertRowid);
  res.json(item);
});

app.post('/api/items/:id/toggle', (req, res) => {
  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Item not found' });

  const newCompleted = item.completed ? 0 : 1;
  db.prepare('UPDATE items SET completed = ? WHERE id = ?').run(newCompleted, req.params.id);

  if (newCompleted) {
    const stats = db.prepare('SELECT * FROM stats WHERE id = 1').get();
    const today = new Date().toISOString().split('T')[0];
    let newStreak = stats.streak;

    if (stats.last_completed_date === today) {
      // Same day, don't increment streak
    } else if (stats.last_completed_date === new Date(Date.now() - 86400000).toISOString().split('T')[0]) {
      newStreak = stats.streak + 1;
    } else {
      newStreak = 1;
    }

    db.prepare('UPDATE stats SET total_completed = total_completed + 1, streak = ?, last_completed_date = ? WHERE id = 1')
      .run(newStreak, today);
  }

  const updated = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id);
  res.json(updated);
});

app.delete('/api/items/:id', (req, res) => {
  db.prepare('DELETE FROM items WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.put('/api/items/:id/reorder', (req, res) => {
  const { order_index } = req.body;
  db.prepare('UPDATE items SET order_index = ? WHERE id = ?').run(order_index, req.params.id);
  const updated = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// Stats API
app.get('/api/stats', (req, res) => {
  const stats = db.prepare('SELECT * FROM stats WHERE id = 1').get();
  const totalItems = db.prepare('SELECT COUNT(*) as count FROM items').get();
  const completedItems = db.prepare('SELECT COUNT(*) as count FROM items WHERE completed = 1').get();
  res.json({
    ...stats,
    total_items: totalItems.count,
    completed_items: completedItems.count
  });
});

app.post('/api/stats/reset', (req, res) => {
  db.prepare('UPDATE stats SET total_completed = 0, streak = 0, last_completed_date = NULL WHERE id = 1').run();
  const stats = db.prepare('SELECT * FROM stats WHERE id = 1').get();
  res.json(stats);
});

app.get('/api/lists/:listId/progress', (req, res) => {
  const total = db.prepare('SELECT COUNT(*) as count FROM items WHERE list_id = ?').get(req.params.listId);
  const completed = db.prepare('SELECT COUNT(*) as count FROM items WHERE list_id = ? AND completed = 1').get(req.params.listId);
  const percent = total.count > 0 ? Math.round((completed.count / total.count) * 100) : 0;
  res.json({ total: total.count, completed: completed.count, percent });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Checklisty running at http://localhost:${PORT}`);
});

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const { initDB, queryAll, queryOne, run } = require('./db/schema');
const { categorize, getCategories } = require('./categorizer');
const { generateInsights } = require('./insights');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'] },
});

app.use(cors());
app.use(express.json());

// Serve React build
app.use(express.static(path.join(__dirname, '../client/build')));

// ─────────────────────────────────────────────
// Boot: init DB then start server
// ─────────────────────────────────────────────
let db;

async function start() {
  db = await initDB();

  // ─────────────────────────────────────────────
  // TRANSACTIONS
  // ─────────────────────────────────────────────

  app.get('/api/transactions', (req, res) => {
    const { user, month, type, limit } = req.query;
    let sql = 'SELECT * FROM transactions WHERE 1=1';
    const params = [];

    if (user)  { sql += ' AND user = ?';       params.push(user); }
    if (month) { sql += ' AND date LIKE ?';    params.push(`${month}%`); }
    if (type)  { sql += ' AND type = ?';       params.push(type); }

    sql += ' ORDER BY date DESC, created_at DESC';
    if (limit) { sql += ' LIMIT ?'; params.push(parseInt(limit)); }

    try {
      const rows = queryAll(db, sql, params);
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/transactions', (req, res) => {
    const { user, type, amount, description, note, date, category: manualCategory } = req.body;

    if (!user || !type || !amount || !description) {
      return res.status(400).json({ error: 'user, type, amount, description are required.' });
    }

    const category = manualCategory || categorize(description, type);
    const txDate = date || new Date().toISOString().split('T')[0];
    const createdAt = new Date().toISOString().replace('T', ' ').slice(0, 19);

    try {
      const id = run(
        db,
        'INSERT INTO transactions (user, type, amount, description, category, note, date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [user, type, parseFloat(amount), description, category, note || '', txDate, createdAt]
      );
      const newTx = queryOne(db, 'SELECT * FROM transactions WHERE id = ?', [id]);
      io.emit('transaction:new', newTx);
      res.status(201).json(newTx);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/transactions/:id', (req, res) => {
    const { id } = req.params;
    const { amount, description, category, note, date, type } = req.body;

    const existing = queryOne(db, 'SELECT * FROM transactions WHERE id = ?', [parseInt(id)]);
    if (!existing) return res.status(404).json({ error: 'Transaction not found.' });

    const updatedCategory = category || categorize(description || existing.description, type || existing.type);

    try {
      run(
        db,
        'UPDATE transactions SET amount=?, description=?, category=?, note=?, date=?, type=? WHERE id=?',
        [
          amount ?? existing.amount,
          description ?? existing.description,
          updatedCategory,
          note ?? existing.note,
          date ?? existing.date,
          type ?? existing.type,
          parseInt(id),
        ]
      );
      const updated = queryOne(db, 'SELECT * FROM transactions WHERE id = ?', [parseInt(id)]);
      io.emit('transaction:updated', updated);
      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/transactions/:id', (req, res) => {
    const { id } = req.params;
    const existing = queryOne(db, 'SELECT * FROM transactions WHERE id = ?', [parseInt(id)]);
    if (!existing) return res.status(404).json({ error: 'Transaction not found.' });

    run(db, 'DELETE FROM transactions WHERE id = ?', [parseInt(id)]);
    io.emit('transaction:deleted', { id: parseInt(id) });
    res.json({ success: true });
  });

  // ─────────────────────────────────────────────
  // CATEGORIZE
  // ─────────────────────────────────────────────
  app.post('/api/categorize', (req, res) => {
    const { description, type } = req.body;
    res.json({ category: categorize(description, type) });
  });

  app.get('/api/categories', (req, res) => {
    res.json(getCategories());
  });

  // ─────────────────────────────────────────────
  // INSIGHTS & SUMMARY
  // ─────────────────────────────────────────────
  app.get('/api/insights', (req, res) => {
    try {
      const all = queryAll(db, 'SELECT * FROM transactions ORDER BY date ASC');
      const insights = generateInsights(all);
      res.json(insights);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/summary', (req, res) => {
    const { month } = req.query;
    const m = month || new Date().toISOString().slice(0, 7);

    try {
      const transactions = queryAll(db, 'SELECT * FROM transactions WHERE date LIKE ?', [`${m}%`]);
      const expenses = transactions.filter(t => t.type === 'expense');
      const income = transactions.filter(t => t.type === 'income');

      const catMap = {};
      for (const t of expenses) {
        catMap[t.category] = (catMap[t.category] || 0) + t.amount;
      }
      const categoryBreakdown = Object.entries(catMap)
        .sort((a, b) => b[1] - a[1])
        .map(([category, amount]) => ({ category, amount }));

      res.json({
        month: m,
        totalExpense: expenses.reduce((s, t) => s + t.amount, 0),
        totalIncome: income.reduce((s, t) => s + t.amount, 0),
        sailee: {
          expense: expenses.filter(t => t.user === 'sailee').reduce((s, t) => s + t.amount, 0),
          income: income.filter(t => t.user === 'sailee').reduce((s, t) => s + t.amount, 0),
        },
        ajinkya: {
          expense: expenses.filter(t => t.user === 'ajinkya').reduce((s, t) => s + t.amount, 0),
          income: income.filter(t => t.user === 'ajinkya').reduce((s, t) => s + t.amount, 0),
        },
        categoryBreakdown,
        transactionCount: transactions.length,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─────────────────────────────────────────────
  // SOCKET.IO
  // ─────────────────────────────────────────────
  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);
    socket.on('disconnect', () => console.log(`Client disconnected: ${socket.id}`));
  });

  // Catch-all: serve React app
  app.get('*', (req, res) => {
    const buildPath = path.join(__dirname, '../client/build/index.html');
    res.sendFile(buildPath, (err) => {
      if (err) res.status(200).json({ message: 'Expense Tracker API running. Build the React client to serve the UI.' });
    });
  });

  const PORT = process.env.PORT || 3001;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n✅ Expense Tracker server running on port ${PORT}`);
    console.log(`   Local:   http://localhost:${PORT}`);
    console.log(`   Network: http://<your-local-ip>:${PORT}`);
    console.log('\n   Run: ipconfig   to find your local IP address\n');
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

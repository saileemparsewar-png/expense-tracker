const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const { initDB, queryAll, queryOne, run } = require('./db/schema');
const { categorize, getCategories } = require('./categorizer');
const { generateInsights } = require('./insights');
const { analysePatterns, checkTransactionAgainstGoals } = require('./patterns');
const { generateWeeklyRecap } = require('./recap');
const { chat, extractTransactionsFromPDF } = require('./ai');
const multer = require('multer');
const pdfParse = require('pdf-parse');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'] },
});

app.use(cors());
app.use(express.json());

// Serve React build
app.use(express.static(path.join(__dirname, '../client/build')));

let db;

async function start() {
  db = await initDB();

  // ─────────────────────────────────────────────
  // TRANSACTIONS
  // ─────────────────────────────────────────────

  app.get('/api/transactions', async (req, res) => {
    const { user, month, type, limit } = req.query;
    let sql = 'SELECT * FROM transactions WHERE 1=1';
    const params = [];

    if (user)  { sql += ' AND user = ?';    params.push(user); }
    if (month) { sql += ' AND date LIKE ?'; params.push(`${month}%`); }
    if (type)  { sql += ' AND type = ?';    params.push(type); }

    sql += ' ORDER BY date DESC, created_at DESC';
    if (limit) { sql += ' LIMIT ?'; params.push(parseInt(limit)); }

    try {
      const rows = await queryAll(db, sql, params);
      res.json(rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/transactions', async (req, res) => {
    const { user, type, amount, description, note, date, category: manualCategory } = req.body;

    if (!user || !type || !amount || !description) {
      return res.status(400).json({ error: 'user, type, amount, description are required.' });
    }

    const category = manualCategory || categorize(description, type);
    const txDate = date || new Date().toISOString().split('T')[0];
    const createdAt = new Date().toISOString().replace('T', ' ').slice(0, 19);

    try {
      const id = await run(
        db,
        'INSERT INTO transactions (user, type, amount, description, category, note, date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [user, type, parseFloat(amount), description, category, note || '', txDate, createdAt]
      );
      const newTx = await queryOne(db, 'SELECT * FROM transactions WHERE id = ?', [id]);

      // Check against goals and generate nudges
      const allTxs = await queryAll(db, 'SELECT * FROM transactions');
      const goals = await queryAll(db, 'SELECT * FROM goals');
      const nudges = checkTransactionAgainstGoals(newTx, allTxs, goals);

      io.emit('transaction:new', { ...newTx, nudges });
      res.status(201).json({ ...newTx, nudges });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/transactions/:id', async (req, res) => {
    const { id } = req.params;
    const { amount, description, category, note, date, type } = req.body;

    const existing = await queryOne(db, 'SELECT * FROM transactions WHERE id = ?', [parseInt(id)]);
    if (!existing) return res.status(404).json({ error: 'Transaction not found.' });

    const updatedCategory = category || categorize(description || existing.description, type || existing.type);

    try {
      await run(
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
      const updated = await queryOne(db, 'SELECT * FROM transactions WHERE id = ?', [parseInt(id)]);
      io.emit('transaction:updated', updated);
      res.json(updated);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/transactions/:id', async (req, res) => {
    const { id } = req.params;
    const existing = await queryOne(db, 'SELECT * FROM transactions WHERE id = ?', [parseInt(id)]);
    if (!existing) return res.status(404).json({ error: 'Transaction not found.' });

    await run(db, 'DELETE FROM transactions WHERE id = ?', [parseInt(id)]);
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
  app.get('/api/insights', async (req, res) => {
    try {
      const all = await queryAll(db, 'SELECT * FROM transactions ORDER BY date ASC');
      const insights = generateInsights(all);
      res.json(insights);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/summary', async (req, res) => {
    const { month } = req.query;
    const m = month || new Date().toISOString().slice(0, 7);

    try {
      const transactions = await queryAll(db, 'SELECT * FROM transactions WHERE date LIKE ?', [`${m}%`]);
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
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // ─────────────────────────────────────────────
  // GOALS
  // ─────────────────────────────────────────────

  // Get all goals (optionally filtered by user)
  app.get('/api/goals', async (req, res) => {
    const { user } = req.query;
    try {
      let sql = 'SELECT * FROM goals WHERE 1=1';
      const params = [];
      if (user) {
        sql += ' AND (owner = ? OR scope = ?)';
        params.push(user, 'household');
      }
      sql += ' ORDER BY created_at DESC';
      const goals = await queryAll(db, sql, params);
      res.json(goals);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Add a goal
  app.post('/api/goals', async (req, res) => {
    const { owner, scope, type, category, target_amount, period, label } = req.body;
    if (!owner || !type || !target_amount) {
      return res.status(400).json({ error: 'owner, type, target_amount required.' });
    }
    const createdAt = new Date().toISOString().replace('T', ' ').slice(0, 19);
    try {
      const id = await run(
        db,
        'INSERT INTO goals (owner, scope, type, category, target_amount, period, label, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [owner, scope || 'personal', type, category || null, parseFloat(target_amount), period || 'monthly', label || null, createdAt]
      );
      const goal = await queryOne(db, 'SELECT * FROM goals WHERE id = ?', [id]);
      io.emit('goal:new', goal);
      res.status(201).json(goal);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Update a goal
  app.put('/api/goals/:id', async (req, res) => {
    const { id } = req.params;
    const { target_amount, label, scope, period } = req.body;
    const existing = await queryOne(db, 'SELECT * FROM goals WHERE id = ?', [parseInt(id)]);
    if (!existing) return res.status(404).json({ error: 'Goal not found.' });
    try {
      await run(
        db,
        'UPDATE goals SET target_amount=?, label=?, scope=?, period=? WHERE id=?',
        [target_amount ?? existing.target_amount, label ?? existing.label, scope ?? existing.scope, period ?? existing.period, parseInt(id)]
      );
      const updated = await queryOne(db, 'SELECT * FROM goals WHERE id = ?', [parseInt(id)]);
      io.emit('goal:updated', updated);
      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Delete a goal
  app.delete('/api/goals/:id', async (req, res) => {
    const { id } = req.params;
    await run(db, 'DELETE FROM goals WHERE id = ?', [parseInt(id)]);
    io.emit('goal:deleted', { id: parseInt(id) });
    res.json({ success: true });
  });

  // Goal progress — how much spent vs target this month
  app.get('/api/goals/progress', async (req, res) => {
    const { user } = req.query;
    const month = new Date().toISOString().slice(0, 7);
    try {
      let sql = 'SELECT * FROM goals WHERE 1=1';
      const params = [];
      if (user) { sql += ' AND (owner = ? OR scope = ?)'; params.push(user, 'household'); }
      const goals = await queryAll(db, sql, params);
      const allTxs = await queryAll(db, 'SELECT * FROM transactions WHERE date LIKE ?', [`${month}%`]);

      const progress = goals.map(goal => {
        let spent = 0;
        if (goal.type === 'category_limit') {
          spent = allTxs
            .filter(t =>
              t.type === 'expense' &&
              t.category === goal.category &&
              (goal.scope === 'household' || t.user === goal.owner)
            )
            .reduce((s, t) => s + t.amount, 0);
        } else if (goal.type === 'total_limit') {
          spent = allTxs
            .filter(t =>
              t.type === 'expense' &&
              (goal.scope === 'household' || t.user === goal.owner)
            )
            .reduce((s, t) => s + t.amount, 0);
        } else if (goal.type === 'savings') {
          const income = allTxs
            .filter(t => t.type === 'income' && (goal.scope === 'household' || t.user === goal.owner))
            .reduce((s, t) => s + t.amount, 0);
          const expense = allTxs
            .filter(t => t.type === 'expense' && (goal.scope === 'household' || t.user === goal.owner))
            .reduce((s, t) => s + t.amount, 0);
          spent = income - expense; // for savings, "spent" is actually "saved"
        }

        const pct = goal.target_amount > 0
          ? Math.min((spent / goal.target_amount) * 100, 999)
          : 0;

        return {
          ...goal,
          spent,
          remaining: goal.type === 'savings' ? goal.target_amount - spent : Math.max(goal.target_amount - spent, 0),
          percentage: Math.round(pct),
          status: goal.type === 'savings'
            ? (spent >= goal.target_amount ? 'achieved' : 'in_progress')
            : (pct >= 100 ? 'exceeded' : pct >= 80 ? 'warning' : 'ok'),
        };
      });

      res.json(progress);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─────────────────────────────────────────────
  // PATTERNS
  // ─────────────────────────────────────────────
  app.get('/api/patterns', async (req, res) => {
    const { user } = req.query;
    if (!user) return res.status(400).json({ error: 'user required' });
    try {
      const all = await queryAll(db, 'SELECT * FROM transactions ORDER BY date ASC');
      const patterns = analysePatterns(all, user);
      res.json(patterns);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─────────────────────────────────────────────
  // WEEKLY RECAP
  // ─────────────────────────────────────────────
  app.get('/api/recap', async (req, res) => {
    const { user } = req.query;
    if (!user) return res.status(400).json({ error: 'user required' });
    try {
      const all = await queryAll(db, 'SELECT * FROM transactions ORDER BY date ASC');
      const recap = generateWeeklyRecap(all, user);
      res.json(recap);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─────────────────────────────────────────────
  // AI CHAT
  // ─────────────────────────────────────────────
  app.post('/api/chat', async (req, res) => {
    const { messages, user } = req.body;
    if (!messages || !user) return res.status(400).json({ error: 'messages and user required' });

    try {
      const month = new Date().toISOString().slice(0, 7);
      const [allTxs, summary, goalsProgress, patterns] = await Promise.all([
        queryAll(db, 'SELECT * FROM transactions ORDER BY date DESC LIMIT 50'),
        (async () => {
          const txs = await queryAll(db, 'SELECT * FROM transactions WHERE date LIKE ?', [`${month}%`]);
          const expenses = txs.filter(t => t.type === 'expense');
          const income = txs.filter(t => t.type === 'income');
          const catMap = {};
          for (const t of expenses) catMap[t.category] = (catMap[t.category] || 0) + t.amount;
          return {
            totalExpense: expenses.reduce((s, t) => s + t.amount, 0),
            totalIncome: income.reduce((s, t) => s + t.amount, 0),
            sailee_or_user_expense: expenses.filter(t => t.user === user).reduce((s, t) => s + t.amount, 0),
            sailee_or_user_income: income.filter(t => t.user === user).reduce((s, t) => s + t.amount, 0),
            categoryBreakdown: Object.entries(catMap).sort((a, b) => b[1] - a[1]).map(([category, amount]) => ({ category, amount })),
          };
        })(),
        (async () => {
          const goals = await queryAll(db, 'SELECT * FROM goals WHERE owner = ? OR scope = ?', [user, 'household']);
          const txs = await queryAll(db, 'SELECT * FROM transactions WHERE date LIKE ?', [`${month}%`]);
          return goals.map(goal => {
            const spent = txs.filter(t => t.type === 'expense' && (goal.scope === 'household' || t.user === user) && (goal.category ? t.category === goal.category : true)).reduce((s, t) => s + t.amount, 0);
            const pct = goal.target_amount > 0 ? Math.round((spent / goal.target_amount) * 100) : 0;
            return { ...goal, spent, percentage: pct, status: pct >= 100 ? 'exceeded' : pct >= 80 ? 'warning' : 'ok' };
          });
        })(),
        (async () => { try { return analysePatterns(await queryAll(db, 'SELECT * FROM transactions ORDER BY date ASC'), user); } catch { return []; } })(),
      ]);

      const insights = generateInsights(await queryAll(db, 'SELECT * FROM transactions ORDER BY date ASC'));

      const reply = await chat(messages, {
        user,
        summary,
        goals: goalsProgress,
        patterns,
        recentTxs: allTxs,
        insights,
      });

      res.json({ reply });
    } catch (err) {
      console.error('Chat error:', err);
      res.status(500).json({ error: 'AI service unavailable. Please try again.' });
    }
  });

  // ─────────────────────────────────────────────
  // PDF IMPORT
  // ─────────────────────────────────────────────
  app.post('/api/import/pdf', upload.single('pdf'), async (req, res) => {
    const { user } = req.body;
    if (!req.file) return res.status(400).json({ error: 'No PDF file uploaded.' });
    if (!user) return res.status(400).json({ error: 'user required.' });

    try {
      // Parse PDF to text
      const pdfData = await pdfParse(req.file.buffer);
      const text = pdfData.text;

      if (!text || text.trim().length < 50) {
        return res.status(400).json({ error: 'Could not extract text from PDF. Make sure it is a text-based PDF, not a scanned image.' });
      }

      // Extract transactions using AI
      const extracted = await extractTransactionsFromPDF(text, user);

      if (extracted.length === 0) {
        return res.status(400).json({ error: 'No transactions found in the PDF. Make sure this is a bank statement.' });
      }

      // Duplicate detection — check against existing transactions
      const existing = await queryAll(db, 'SELECT * FROM transactions WHERE user = ?', [user]);

      const withDuplicateFlags = extracted.map(tx => {
        const possible = existing.find(e => {
          const dateDiff = Math.abs(new Date(e.date) - new Date(tx.date)) / (1000 * 60 * 60 * 24);
          const amountMatch = Math.abs(e.amount - tx.amount) <= 10;
          const descMatch = e.description.toLowerCase().includes(tx.description.toLowerCase().slice(0, 6)) ||
            tx.description.toLowerCase().includes(e.description.toLowerCase().slice(0, 6));
          return dateDiff <= 1 && amountMatch && descMatch;
        });

        return {
          ...tx,
          isDuplicate: !!possible,
          duplicateOf: possible ? { id: possible.id, description: possible.description, date: possible.date } : null,
          selected: !possible, // auto-deselect duplicates
        };
      });

      res.json({
        transactions: withDuplicateFlags,
        total: extracted.length,
        duplicates: withDuplicateFlags.filter(t => t.isDuplicate).length,
        new: withDuplicateFlags.filter(t => !t.isDuplicate).length,
      });
    } catch (err) {
      console.error('PDF import error:', err);
      res.status(500).json({ error: err.message || 'Failed to process PDF.' });
    }
  });

  // Confirm and save selected transactions from PDF import
  app.post('/api/import/confirm', async (req, res) => {
    const { transactions, user } = req.body;
    if (!transactions || !user) return res.status(400).json({ error: 'transactions and user required.' });

    try {
      const { categorize } = require('./categorizer');
      const saved = [];
      for (const tx of transactions) {
        const category = categorize(tx.description, tx.type);
        const createdAt = new Date().toISOString().replace('T', ' ').slice(0, 19);
        const id = await run(
          db,
          'INSERT INTO transactions (user, type, amount, description, category, note, date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [user, tx.type, parseFloat(tx.amount), tx.description, category, 'Imported from bank statement', tx.date, createdAt]
        );
        const newTx = await queryOne(db, 'SELECT * FROM transactions WHERE id = ?', [id]);
        saved.push(newTx);
        io.emit('transaction:new', newTx);
      }
      res.json({ saved: saved.length, transactions: saved });
    } catch (err) {
      console.error('Import confirm error:', err);
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
      if (err) res.status(200).json({ message: 'Expense Tracker API running.' });
    });
  });

  const PORT = process.env.PORT || 3001;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n✅ Expense Tracker running on port ${PORT}\n`);
  });
}

start().catch(err => {
  console.error('Failed to start:', err);
  process.exit(1);
});

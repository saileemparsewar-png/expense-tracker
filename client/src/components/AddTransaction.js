import React, { useState, useEffect, useRef } from 'react';
import { addTransaction, updateTransaction, previewCategory, getCategories } from '../api';
import './AddTransaction.css';

const DEBOUNCE_MS = 400;

export default function AddTransaction({ activeUser, editingTx, onClose, onAdded }) {
  const [type, setType] = useState(editingTx?.type || 'expense');
  const [amount, setAmount] = useState(editingTx ? String(editingTx.amount) : '');
  const [description, setDescription] = useState(editingTx?.description || '');
  const [category, setCategory] = useState(editingTx?.category || '');
  const [note, setNote] = useState(editingTx?.note || '');
  const [date, setDate] = useState(editingTx?.date || new Date().toISOString().split('T')[0]);
  const [autoCategory, setAutoCategory] = useState(editingTx?.category || '');
  const [categories, setCategories] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const amountRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    getCategories().then(setCategories);
    setTimeout(() => amountRef.current?.focus(), 100);
  }, []);

  // Auto-categorize on description change
  useEffect(() => {
    if (!description || type === 'income') {
      if (type === 'income') setAutoCategory('Income');
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const res = await previewCategory(description, type);
      if (!category) setAutoCategory(res.category);
    }, DEBOUNCE_MS);
    return () => clearTimeout(debounceRef.current);
  }, [description, type]);

  const displayCategory = category || autoCategory;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!amount || !description) {
      setError('Amount and description are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const data = {
        user: activeUser,
        type,
        amount: parseFloat(amount),
        description: description.trim(),
        category: displayCategory || undefined,
        note: note.trim(),
        date,
      };
      if (editingTx) {
        await updateTransaction(editingTx.id, data);
        onClose();
      } else {
        const result = await addTransaction(data);
        if (result.nudges && result.nudges.length > 0) {
          onAdded?.(result.nudges);
        }
        onClose();
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-sheet">
        <div className="modal-handle" />
        <div className="add-tx-header">
          <h2>{editingTx ? 'Edit Entry' : 'Add Entry'}</h2>
          <button className="btn btn-ghost close-btn" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="add-tx-form">
          {/* Type toggle */}
          <div className="form-group">
            <div className="toggle-group">
              <button
                type="button"
                className={`toggle-btn ${type === 'expense' ? 'active-expense' : ''}`}
                onClick={() => { setType('expense'); setCategory(''); setAutoCategory(''); }}
              >
                💸 Expense
              </button>
              <button
                type="button"
                className={`toggle-btn ${type === 'income' ? 'active-income' : ''}`}
                onClick={() => { setType('income'); setCategory('Income'); setAutoCategory('Income'); }}
              >
                💰 Income
              </button>
            </div>
          </div>

          {/* Amount */}
          <div className="form-group amount-group">
            <span className="rupee-prefix">₹</span>
            <input
              ref={amountRef}
              type="number"
              inputMode="decimal"
              className="form-input amount-input"
              placeholder="0"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              min="0"
              step="0.01"
              required
            />
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label">What's this for?</label>
            <input
              type="text"
              className="form-input"
              placeholder={type === 'income' ? 'e.g. July salary, freelance project' : 'e.g. Zomato dinner, Rent July'}
              value={description}
              onChange={e => setDescription(e.target.value)}
              required
            />
            {displayCategory && (
              <div className="category-preview">
                <span className="category-pill">🏷️ {displayCategory}</span>
                {!category && <span className="auto-label">auto-detected</span>}
              </div>
            )}
          </div>

          {/* Category override */}
          <div className="form-group">
            <label className="form-label">Category <span className="optional-label">(optional — overrides auto)</span></label>
            <select
              className="form-input"
              value={category}
              onChange={e => setCategory(e.target.value)}
            >
              <option value="">— Auto detect —</option>
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div className="form-group">
            <label className="form-label">Date</label>
            <input
              type="date"
              className="form-input"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>

          {/* Note (optional) */}
          <div className="form-group">
            <label className="form-label">Note <span className="optional-label">(optional)</span></label>
            <input
              type="text"
              className="form-input"
              placeholder="Any extra details..."
              value={note}
              onChange={e => setNote(e.target.value)}
            />
          </div>

          {error && <p className="form-error">{error}</p>}

          <div className="add-tx-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className={`btn btn-primary ${type === 'income' ? 'btn-income' : ''}`} disabled={saving}>
              {saving ? 'Saving...' : editingTx ? 'Save Changes' : `Add ${type === 'income' ? 'Income' : 'Expense'}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

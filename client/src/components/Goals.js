import React, { useState, useEffect } from 'react';
import { getGoalProgress, addGoal, deleteGoal, getCategories } from '../api';
import './Goals.css';

const GOAL_TYPES = [
  { value: 'category_limit', label: '🗂️ Category Limit', desc: 'Limit spending in a category' },
  { value: 'total_limit', label: '💸 Total Spending Limit', desc: 'Cap your total monthly spending' },
  { value: 'savings', label: '🎯 Savings Goal', desc: 'Target how much to save' },
];

const STATUS_COLORS = {
  ok: '#10b981',
  warning: '#f59e0b',
  exceeded: '#ef4444',
  achieved: '#10b981',
  in_progress: '#6366f1',
};

const STATUS_LABELS = {
  ok: 'On track',
  warning: 'Getting close',
  exceeded: 'Exceeded!',
  achieved: '🎉 Achieved!',
  in_progress: 'In progress',
};

function formatINR(n) {
  return '₹' + Math.abs(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export default function Goals({ activeUser }) {
  const [progress, setProgress] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProgress();
  }, [activeUser]);

  async function loadProgress() {
    setLoading(true);
    try {
      const data = await getGoalProgress(activeUser);
      setProgress(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function handleDelete(id) {
    await deleteGoal(id);
    loadProgress();
  }

  const myGoals = progress.filter(g => g.owner === activeUser || g.scope === 'household');
  const monthName = new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' });

  return (
    <div className="goals-page">
      <div className="goals-header">
        <div>
          <h2>Goals</h2>
          <p className="goals-month">{monthName}</p>
        </div>
        <button className="btn btn-primary add-goal-btn" onClick={() => setShowAdd(true)}>
          + Add Goal
        </button>
      </div>

      {loading ? (
        <div className="goals-loading">Loading...</div>
      ) : myGoals.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🎯</div>
          <p>No goals yet. Set a budget or savings target to stay on track.</p>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowAdd(true)}>
            Set your first goal
          </button>
        </div>
      ) : (
        <div className="goals-list">
          {myGoals.map(goal => (
            <GoalCard key={goal.id} goal={goal} onDelete={() => handleDelete(goal.id)} />
          ))}
        </div>
      )}

      {showAdd && (
        <AddGoalSheet
          activeUser={activeUser}
          onClose={() => setShowAdd(false)}
          onAdded={() => { setShowAdd(false); loadProgress(); }}
        />
      )}
    </div>
  );
}

function GoalCard({ goal, onDelete }) {
  const pct = Math.min(goal.percentage, 100);
  const color = STATUS_COLORS[goal.status] || '#6366f1';
  const isSavings = goal.type === 'savings';
  const label = goal.label || goal.category || (goal.type === 'total_limit' ? 'Total Spending' : 'Savings');

  return (
    <div className="goal-card">
      <div className="goal-card-top">
        <div className="goal-info">
          <span className="goal-label">{label}</span>
          <div className="goal-tags">
            <span className={`tag tag-${goal.scope === 'household' ? 'household' : goal.owner}`}>
              {goal.scope === 'household' ? '👥 Household' : goal.owner === 'sailee' ? '👩 Sailee' : '👨 Ajinkya'}
            </span>
            <span className="goal-period">{goal.period}</span>
          </div>
        </div>
        <button className="goal-delete-btn" onClick={onDelete}>✕</button>
      </div>

      {/* Progress bar */}
      <div className="goal-progress-row">
        <div className="goal-bar-track">
          <div
            className="goal-bar-fill"
            style={{
              width: `${pct}%`,
              background: color,
            }}
          />
        </div>
        <span className="goal-pct" style={{ color }}>{isSavings ? `${goal.percentage}%` : `${goal.percentage}%`}</span>
      </div>

      {/* Amounts */}
      <div className="goal-amounts">
        <span className="goal-spent">
          {isSavings ? `Saved: ${formatINR(goal.spent)}` : `Spent: ${formatINR(goal.spent)}`}
        </span>
        <span className="goal-target">
          {isSavings ? `Target: ${formatINR(goal.target_amount)}` : `Limit: ${formatINR(goal.target_amount)}`}
        </span>
      </div>

      {/* Remaining */}
      <div className="goal-status" style={{ color }}>
        {STATUS_LABELS[goal.status]}
        {!isSavings && goal.status !== 'exceeded' && (
          <span className="goal-remaining"> · {formatINR(goal.remaining)} left</span>
        )}
        {isSavings && goal.status !== 'achieved' && (
          <span className="goal-remaining"> · {formatINR(goal.remaining)} to go</span>
        )}
      </div>
    </div>
  );
}

function AddGoalSheet({ activeUser, onClose, onAdded }) {
  const [type, setType] = useState('category_limit');
  const [category, setCategory] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [scope, setScope] = useState('personal');
  const [label, setLabel] = useState('');
  const [categories, setCategories] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getCategories().then(cats => setCategories(cats.filter(c => c !== 'Income')));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!targetAmount) return;
    setSaving(true);
    try {
      await addGoal({
        owner: activeUser,
        scope,
        type,
        category: type === 'category_limit' ? category : null,
        target_amount: parseFloat(targetAmount),
        period: 'monthly',
        label: label.trim() || null,
      });
      onAdded();
    } catch (err) {
      console.error(err);
    }
    setSaving(false);
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-sheet">
        <div className="modal-handle" />
        <div className="add-tx-header">
          <h2>New Goal</h2>
          <button className="btn btn-ghost close-btn" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className="add-tx-form">

          {/* Goal type */}
          <div className="form-group">
            <label className="form-label">Goal Type</label>
            <div className="goal-type-grid">
              {GOAL_TYPES.map(gt => (
                <button
                  key={gt.value}
                  type="button"
                  className={`goal-type-btn ${type === gt.value ? 'active' : ''}`}
                  onClick={() => setType(gt.value)}
                >
                  <span className="goal-type-label">{gt.label}</span>
                  <span className="goal-type-desc">{gt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Category (only for category_limit) */}
          {type === 'category_limit' && (
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-input" value={category} onChange={e => setCategory(e.target.value)} required>
                <option value="">Select category...</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}

          {/* Target amount */}
          <div className="form-group amount-group">
            <span className="rupee-prefix">₹</span>
            <input
              type="number"
              inputMode="decimal"
              className="form-input amount-input"
              placeholder="0"
              value={targetAmount}
              onChange={e => setTargetAmount(e.target.value)}
              required
            />
          </div>

          {/* Scope */}
          <div className="form-group">
            <label className="form-label">Applies to</label>
            <div className="toggle-group">
              <button
                type="button"
                className={`toggle-btn ${scope === 'personal' ? 'active-expense' : ''}`}
                onClick={() => setScope('personal')}
              >
                👤 Just me
              </button>
              <button
                type="button"
                className={`toggle-btn ${scope === 'household' ? 'active-income' : ''}`}
                onClick={() => setScope('household')}
              >
                👥 Household
              </button>
            </div>
          </div>

          {/* Label (optional) */}
          <div className="form-group">
            <label className="form-label">Label <span className="optional-label">(optional)</span></label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Dining budget, Emergency fund..."
              value={label}
              onChange={e => setLabel(e.target.value)}
            />
          </div>

          <div className="add-tx-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Add Goal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

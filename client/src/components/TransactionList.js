import React, { useState } from 'react';
import './TransactionList.css';

const CATEGORY_ICONS = {
  'Rent & Housing': '🏠',
  'Groceries': '🛒',
  'Food & Dining': '🍽️',
  'Transport': '🚗',
  'Utilities': '⚡',
  'Mobile & Recharge': '📱',
  'Shopping': '🛍️',
  'Health & Medical': '💊',
  'Entertainment': '🎬',
  'Education': '📚',
  'Personal Care': '💇',
  'Investments & Savings': '📈',
  'EMI & Loans': '🏦',
  'Travel & Vacation': '✈️',
  'Gifts & Donations': '🎁',
  'Household': '🏡',
  'Income': '💰',
  'Other': '📌',
};

function formatINR(n) {
  return '₹' + Math.abs(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function groupByDate(transactions) {
  const groups = {};
  for (const tx of transactions) {
    if (!groups[tx.date]) groups[tx.date] = [];
    groups[tx.date].push(tx);
  }
  return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined });
}

export default function TransactionList({ transactions, activeUser, onDelete, onEdit }) {
  const [filter, setFilter] = useState('all'); // all | mine | theirs | income | expense
  const [search, setSearch] = useState('');
  const [swipedId, setSwipedId] = useState(null);

  const otherUser = activeUser === 'sailee' ? 'ajinkya' : 'sailee';

  const filtered = transactions.filter(tx => {
    if (filter === 'mine' && tx.user !== activeUser) return false;
    if (filter === 'theirs' && tx.user !== otherUser) return false;
    if (filter === 'income' && tx.type !== 'income') return false;
    if (filter === 'expense' && tx.type !== 'expense') return false;
    if (search && !tx.description.toLowerCase().includes(search.toLowerCase()) &&
        !tx.category.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const grouped = groupByDate(filtered);
  const myName = activeUser === 'sailee' ? 'Sailee' : 'Ajinkya';
  const theirName = activeUser === 'sailee' ? 'Ajinkya' : 'Sailee';

  return (
    <div className="tx-list-page">
      {/* Header */}
      <div className="tx-list-header">
        <h2>Transactions</h2>
        <div className="tx-search">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder="Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Filter pills */}
      <div className="filter-pills">
        {[
          { id: 'all', label: 'All' },
          { id: 'mine', label: `Mine` },
          { id: 'theirs', label: theirName },
          { id: 'income', label: '💰 Income' },
          { id: 'expense', label: '💸 Expense' },
        ].map(f => (
          <button
            key={f.id}
            className={`filter-pill ${filter === f.id ? 'active' : ''}`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="tx-groups">
        {grouped.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <p>No transactions found</p>
          </div>
        ) : (
          grouped.map(([date, txs]) => (
            <div key={date} className="tx-group">
              <div className="tx-date-label">
                <span>{formatDate(date)}</span>
                <span className="tx-date-total">
                  {formatINR(txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0))}
                </span>
              </div>
              {txs.map(tx => (
                <TxItem
                  key={tx.id}
                  tx={tx}
                  activeUser={activeUser}
                  isOwn={tx.user === activeUser}
                  swiped={swipedId === tx.id}
                  onSwipe={() => setSwipedId(swipedId === tx.id ? null : tx.id)}
                  onEdit={() => { setSwipedId(null); onEdit(tx); }}
                  onDelete={() => { setSwipedId(null); onDelete(tx.id); }}
                />
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function TxItem({ tx, activeUser, isOwn, swiped, onSwipe, onEdit, onDelete }) {
  const icon = CATEGORY_ICONS[tx.category] || '📌';
  const userName = tx.user === 'sailee' ? 'Sailee' : 'Ajinkya';

  return (
    <div className={`tx-item-wrapper ${swiped ? 'swiped' : ''}`}>
      <div className="tx-item-actions">
        {isOwn && (
          <>
            <button className="tx-action-btn edit-btn" onClick={onEdit}>✏️</button>
            <button className="tx-action-btn delete-btn" onClick={onDelete}>🗑️</button>
          </>
        )}
      </div>
      <div
        className={`tx-item ${!isOwn ? 'tx-item-other' : ''}`}
        onClick={onSwipe}
      >
        <div className="tx-icon">{icon}</div>
        <div className="tx-details">
          <div className="tx-desc">{tx.description}</div>
          <div className="tx-meta">
            <span className={`tag tag-${tx.user}`}>{userName}</span>
            <span className="tx-cat">{tx.category}</span>
            {tx.note && <span className="tx-note">· {tx.note}</span>}
          </div>
        </div>
        <div className={`tx-amount ${tx.type === 'income' ? 'amount-income' : 'amount-expense'}`}>
          {tx.type === 'income' ? '+' : '-'}{formatINR(tx.amount)}
        </div>
      </div>
    </div>
  );
}

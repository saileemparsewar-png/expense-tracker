import React from 'react';
import './BottomNav.css';

export default function BottomNav({ activeTab, onTabChange, onAdd, activeUser }) {
  const userColor = activeUser === 'sailee' ? '#ec4899' : '#3b82f6';

  return (
    <div className="bottom-nav">
      <button
        className={`nav-btn ${activeTab === 'home' ? 'nav-active' : ''}`}
        onClick={() => onTabChange('home')}
      >
        <span className="nav-icon">🏠</span>
        <span className="nav-label">Home</span>
      </button>

      {/* FAB — Add transaction */}
      <button
        className="nav-fab"
        style={{ background: userColor }}
        onClick={onAdd}
        aria-label="Add transaction"
      >
        <span className="nav-fab-icon">+</span>
      </button>

      <button
        className={`nav-btn ${activeTab === 'transactions' ? 'nav-active' : ''}`}
        onClick={() => onTabChange('transactions')}
      >
        <span className="nav-icon">📋</span>
        <span className="nav-label">Transactions</span>
      </button>
    </div>
  );
}

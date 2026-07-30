import React from 'react';
import './UserSelect.css';

export default function UserSelect({ onSelect }) {
  return (
    <div className="user-select">
      <div className="user-select-inner">
        <div className="user-select-logo">💰</div>
        <h1 className="user-select-title">Sailee & Ajinkya</h1>
        <p className="user-select-subtitle">Expense Tracker</p>
        <p className="user-select-prompt">Who are you?</p>
        <div className="user-cards">
          <button className="user-card user-card-sailee" onClick={() => onSelect('sailee')}>
            <span className="user-card-avatar">👩</span>
            <span className="user-card-name">Sailee</span>
          </button>
          <button className="user-card user-card-ajinkya" onClick={() => onSelect('ajinkya')}>
            <span className="user-card-avatar">👨</span>
            <span className="user-card-name">Ajinkya</span>
          </button>
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import './BottomNav.css';

const TABS = [
  { id: 'home',         icon: '🏠', label: 'Home' },
  { id: 'transactions', icon: '📋', label: 'History' },
  { id: 'goals',        icon: '🎯', label: 'Goals' },
  { id: 'insights',     icon: '💡', label: 'Insights' },
  { id: 'chat',         icon: '🤖', label: 'Ask AI' },
  { id: 'import',       icon: '📄', label: 'Import' },
];

export default function BottomNav({ activeTab, onTabChange, onAdd, activeUser }) {
  const userColor = activeUser === 'sailee' ? '#ec4899' : '#3b82f6';

  return (
    <div className="bottom-nav">
      <div className="nav-scroll">
        {TABS.slice(0, 2).map(tab => (
          <NavBtn key={tab.id} tab={tab} active={activeTab === tab.id} onClick={() => onTabChange(tab.id)} />
        ))}

        {/* FAB */}
        <button
          className="nav-fab"
          style={{ background: userColor }}
          onClick={onAdd}
          aria-label="Add transaction"
        >
          <span className="nav-fab-icon">+</span>
        </button>

        {TABS.slice(2).map(tab => (
          <NavBtn key={tab.id} tab={tab} active={activeTab === tab.id} onClick={() => onTabChange(tab.id)} />
        ))}
      </div>
    </div>
  );
}

function NavBtn({ tab, active, onClick }) {
  return (
    <button className={`nav-btn ${active ? 'nav-active' : ''}`} onClick={onClick}>
      <span className="nav-icon">{tab.icon}</span>
      <span className="nav-label">{tab.label}</span>
    </button>
  );
}

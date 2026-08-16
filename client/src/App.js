import React, { useState, useEffect } from 'react';
import socket from './socket';
import { getTransactions, deleteTransaction } from './api';
import UserSelect from './components/UserSelect';
import AddTransaction from './components/AddTransaction';
import TransactionList from './components/TransactionList';
import Dashboard from './components/Dashboard';
import Goals from './components/Goals';
import Nudge from './components/Nudge';
import IntelligenceScreen from './components/IntelligenceScreen';
import BottomNav from './components/BottomNav';
import PinLock from './components/PinLock';
import './App.css';

const PIN_TTL_MS = 8 * 60 * 60 * 1000;

function isPinUnlocked() {
  const ts = localStorage.getItem('pinUnlockedAt');
  if (!ts) return false;
  return Date.now() - parseInt(ts) < PIN_TTL_MS;
}

export default function App() {
  const [unlocked, setUnlocked] = useState(() => isPinUnlocked());
  const [activeUser, setActiveUser] = useState(() => localStorage.getItem('activeUser') || null);
  const [transactions, setTransactions] = useState([]);
  const [activeTab, setActiveTab] = useState('home');
  const [showAdd, setShowAdd] = useState(false);
  const [connected, setConnected] = useState(false);
  const [editingTx, setEditingTx] = useState(null);
  const [nudges, setNudges] = useState([]);

  useEffect(() => {
    if (activeUser) localStorage.setItem('activeUser', activeUser);
  }, [activeUser]);

  useEffect(() => {
    if (!activeUser) return;
    loadTransactions();
  }, [activeUser]);

  async function loadTransactions() {
    const data = await getTransactions();
    setTransactions(data);
  }

  useEffect(() => {
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('transaction:new', (tx) => {
      // Show nudges if they belong to this user
      if (tx.nudges && tx.nudges.length > 0 && tx.user === activeUser) {
        setNudges(tx.nudges);
      }
      const { nudges: _, ...cleanTx } = tx;
      setTransactions(prev => {
        if (prev.find(t => t.id === cleanTx.id)) return prev;
        return [cleanTx, ...prev];
      });
    });

    socket.on('transaction:updated', (tx) => {
      setTransactions(prev => prev.map(t => t.id === tx.id ? tx : t));
    });

    socket.on('transaction:deleted', ({ id }) => {
      setTransactions(prev => prev.filter(t => t.id !== id));
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('transaction:new');
      socket.off('transaction:updated');
      socket.off('transaction:deleted');
    };
  }, [activeUser]);

  async function handleDelete(id) {
    await deleteTransaction(id);
  }

  function handleEdit(tx) {
    setEditingTx(tx);
    setShowAdd(true);
  }

  function handleUnlock() {
    localStorage.setItem('pinUnlockedAt', Date.now().toString());
    setUnlocked(true);
  }

  if (!unlocked) return <PinLock onUnlock={handleUnlock} />;
  if (!activeUser) return <UserSelect onSelect={setActiveUser} />;

  return (
    <div className="app">
      <div className={`sync-dot ${connected ? 'connected' : 'disconnected'}`} />

      {/* Nudge alerts */}
      {nudges.length > 0 && (
        <Nudge nudges={nudges} onDismiss={() => setNudges([])} />
      )}

      <div className="app-content">
        {activeTab === 'home' && (
          <Dashboard
            transactions={transactions}
            activeUser={activeUser}
            onSwitchUser={() => setActiveUser(null)}
          />
        )}
        {activeTab === 'transactions' && (
          <TransactionList
            transactions={transactions}
            activeUser={activeUser}
            onDelete={handleDelete}
            onEdit={handleEdit}
          />
        )}
        {activeTab === 'goals' && (
          <Goals activeUser={activeUser} />
        )}
        {activeTab === 'insights' && (
          <IntelligenceScreen activeUser={activeUser} transactions={transactions} />
        )}
      </div>

      <BottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onAdd={() => { setEditingTx(null); setShowAdd(true); }}
        activeUser={activeUser}
      />

      {showAdd && (
        <AddTransaction
          activeUser={activeUser}
          editingTx={editingTx}
          onClose={() => { setShowAdd(false); setEditingTx(null); }}
          onAdded={(nudgesFromTx) => {
            if (nudgesFromTx && nudgesFromTx.length > 0) setNudges(nudgesFromTx);
          }}
        />
      )}
    </div>
  );
}

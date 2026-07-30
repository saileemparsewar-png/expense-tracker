import React, { useState, useEffect } from 'react';
import socket from './socket';
import { getTransactions, deleteTransaction } from './api';
import UserSelect from './components/UserSelect';
import AddTransaction from './components/AddTransaction';
import TransactionList from './components/TransactionList';
import Dashboard from './components/Dashboard';
import BottomNav from './components/BottomNav';
import PinLock from './components/PinLock';
import './App.css';

// PIN unlock lasts for 8 hours per device
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

  // Persist selected user
  useEffect(() => {
    if (activeUser) localStorage.setItem('activeUser', activeUser);
  }, [activeUser]);

  // Load transactions
  useEffect(() => {
    if (!activeUser) return;
    loadTransactions();
  }, [activeUser]);

  async function loadTransactions() {
    const data = await getTransactions();
    setTransactions(data);
  }

  // Real-time socket sync
  useEffect(() => {
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('transaction:new', (tx) => {
      setTransactions(prev => [tx, ...prev]);
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
  }, []);

  async function handleDelete(id) {
    await deleteTransaction(id);
    // socket will update state
  }

  function handleEdit(tx) {
    setEditingTx(tx);
    setShowAdd(true);
  }

  function handleUnlock() {
    localStorage.setItem('pinUnlockedAt', Date.now().toString());
    setUnlocked(true);
  }

  if (!unlocked) {
    return <PinLock onUnlock={handleUnlock} />;
  }

  if (!activeUser) {
    return <UserSelect onSelect={setActiveUser} />;
  }

  return (
    <div className="app">
      {/* Connection indicator */}
      <div className={`sync-dot ${connected ? 'connected' : 'disconnected'}`} title={connected ? 'Synced' : 'Offline'} />

      {/* Main content */}
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
      </div>

      {/* Bottom navigation */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onAdd={() => { setEditingTx(null); setShowAdd(true); }}
        activeUser={activeUser}
      />

      {/* Add / Edit modal */}
      {showAdd && (
        <AddTransaction
          activeUser={activeUser}
          editingTx={editingTx}
          onClose={() => { setShowAdd(false); setEditingTx(null); }}
        />
      )}
    </div>
  );
}

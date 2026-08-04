import React, { useState, useEffect, useRef } from 'react';
import { getInsights, getSummary } from '../api';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import './Dashboard.css';

const COLORS = ['#6366f1', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'];

function formatINR(n) {
  if (n >= 100000) return '₹' + (n / 100000).toFixed(1) + 'L';
  if (n >= 1000) return '₹' + (n / 1000).toFixed(1) + 'k';
  return '₹' + Math.round(n).toLocaleString('en-IN');
}

function formatINRFull(n) {
  return '₹' + Math.abs(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

const SUGGESTION_ICONS = { warning: '⚠️', alert: '🔔', tip: '💡', positive: '✅', info: 'ℹ️' };

export default function Dashboard({ transactions, activeUser, onSwitchUser }) {
  const [insights, setInsights] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('overview'); // overview | breakdown | insights | trend

  const myName = activeUser === 'sailee' ? 'Sailee' : 'Ajinkya';
  const theirName = activeUser === 'sailee' ? 'Ajinkya' : 'Sailee';
  const myColor = activeUser === 'sailee' ? '#ec4899' : '#3b82f6';

  useEffect(() => {
    loadData();
  }, [transactions]);

  async function loadData() {
    try {
      const [ins, sum] = await Promise.all([getInsights(), getSummary()]);
      setInsights(ins);
      setSummary(sum);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  // This month quick stats
  const now = new Date();
  const thisMonth = transactions.filter(t => t.date.startsWith(now.toISOString().slice(0, 7)));
  const myExpenses = thisMonth.filter(t => t.user === activeUser && t.type === 'expense');
  const myIncome = thisMonth.filter(t => t.user === activeUser && t.type === 'income');
  const myTotalExp = myExpenses.reduce((s, t) => s + t.amount, 0);
  const myTotalInc = myIncome.reduce((s, t) => s + t.amount, 0);
  const recentTxs = [...transactions].sort((a, b) => {
    if (b.date !== a.date) return b.date.localeCompare(a.date);
    return b.created_at?.localeCompare(a.created_at);
  }).slice(0, 5);

  const monthName = now.toLocaleString('en-IN', { month: 'long', year: 'numeric' });

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner" />
        <p>Loading your finances...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Header */}
      <div className={`dashboard-header header-${activeUser}`}>
        <div className="header-top">
          <div>
            <p className="header-greeting">Good {getGreeting()}, {myName} 👋</p>
            <p className="header-month">{monthName}</p>
          </div>
          <button className="switch-user-btn" onClick={onSwitchUser} title="Switch user">
            {activeUser === 'sailee' ? '👩' : '👨'}
          </button>
        </div>

        {/* My stats */}
        <div className="header-stats">
          <div className="header-stat">
            <span className="stat-label">My Spending</span>
            <span className="stat-value">{formatINR(myTotalExp)}</span>
          </div>
          <div className="header-stat-divider" />
          <div className="header-stat">
            <span className="stat-label">My Income</span>
            <span className="stat-value income-val">{formatINR(myTotalInc)}</span>
          </div>
          <div className="header-stat-divider" />
          <div className="header-stat">
            <span className="stat-label">Net</span>
            <span className={`stat-value ${myTotalInc - myTotalExp >= 0 ? 'income-val' : 'expense-val'}`}>
              {myTotalInc - myTotalExp >= 0 ? '+' : '-'}{formatINR(Math.abs(myTotalInc - myTotalExp))}
            </span>
          </div>
        </div>
      </div>

      {/* Section tabs */}
      <div className="section-tabs">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'breakdown', label: 'Breakdown' },
          { id: 'insights', label: 'Insights' },
          { id: 'trend', label: 'Trend' },
          { id: 'export', label: '📤 Export' },
        ].map(tab => (
          <button
            key={tab.id}
            className={`section-tab ${activeSection === tab.id ? 'active' : ''}`}
            onClick={() => setActiveSection(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="dashboard-body">
        {activeSection === 'overview' && (
          <OverviewSection
            insights={insights}
            summary={summary}
            transactions={recentTxs}
            activeUser={activeUser}
            myName={myName}
            theirName={theirName}
            myColor={myColor}
          />
        )}
        {activeSection === 'breakdown' && (
          <BreakdownSection summary={summary} activeUser={activeUser} myName={myName} theirName={theirName} />
        )}
        {activeSection === 'insights' && (
          <InsightsSection insights={insights} myName={myName} theirName={theirName} />
        )}
        {activeSection === 'trend' && (
          <TrendSection insights={insights} />
        )}
        {activeSection === 'export' && (
          <ExportSection transactions={transactions} insights={insights} />
        )}
      </div>
    </div>
  );
}

// ── Overview ──────────────────────────────────

function OverviewSection({ insights, summary, transactions, activeUser, myName, theirName, myColor }) {
  if (!insights || !summary) return null;

  const bal = insights.balance;
  const combined = insights.combined;

  return (
    <div className="section-content">
      {/* Balance card */}
      <div className="card balance-card">
        <div className="card-title">⚖️ Balance This Month</div>
        <p className="balance-message">{bal.message}</p>
        <div className="balance-bars">
          <BalanceBar label="Sailee" amount={bal.saleePaid} max={bal.saleePaid + bal.ajinkyaPaid} color="#ec4899" />
          <BalanceBar label="Ajinkya" amount={bal.ajinkyaPaid} max={bal.saleePaid + bal.ajinkyaPaid} color="#3b82f6" />
        </div>
      </div>

      {/* Household combined */}
      <div className="card">
        <div className="card-title">🏠 Household This Month</div>
        <div className="combined-stats">
          <div className="combined-stat">
            <span className="cstat-label">Combined Spent</span>
            <span className="cstat-value expense-val">{formatINRFull(combined.totalExpense)}</span>
          </div>
          <div className="combined-stat">
            <span className="cstat-label">Combined Income</span>
            <span className="cstat-value income-val">{formatINRFull(combined.totalIncome)}</span>
          </div>
        </div>
        {insights.insights.momInsight && (
          <p className="mom-insight">📊 {insights.insights.momInsight}</p>
        )}
      </div>

      {/* Recent transactions */}
      <div className="card">
        <div className="section-header">
          <span className="card-title">🕐 Recent</span>
        </div>
        {transactions.length === 0 ? (
          <p className="muted-text">No transactions yet. Add your first one!</p>
        ) : (
          <div className="recent-list">
            {transactions.map(tx => (
              <div key={tx.id} className="recent-item">
                <div className="recent-left">
                  <span className={`recent-user-dot dot-${tx.user}`} />
                  <div>
                    <div className="recent-desc">{tx.description}</div>
                    <div className="recent-cat">{tx.category} · {tx.user === 'sailee' ? 'Sailee' : 'Ajinkya'}</div>
                  </div>
                </div>
                <span className={tx.type === 'income' ? 'amount-income' : 'amount-expense'}>
                  {tx.type === 'income' ? '+' : '-'}{formatINRFull(tx.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BalanceBar({ label, amount, max, color }) {
  const pct = max > 0 ? (amount / max) * 100 : 50;
  return (
    <div className="balance-bar-row">
      <span className="balance-bar-label">{label}</span>
      <div className="balance-bar-track">
        <div className="balance-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="balance-bar-amount" style={{ color }}>{formatINRFull(amount)}</span>
    </div>
  );
}

// ── Breakdown ─────────────────────────────────

function BreakdownSection({ summary, activeUser, myName, theirName }) {
  const [view, setView] = useState('combined'); // combined | mine | theirs

  if (!summary) return null;

  const data = summary.categoryBreakdown.slice(0, 8);
  const total = summary.totalExpense;

  return (
    <div className="section-content">
      <div className="card">
        <div className="card-title">🗂️ Category Breakdown</div>
        <div className="breakdown-toggle">
          <button className={`breakdown-btn ${view === 'combined' ? 'active' : ''}`} onClick={() => setView('combined')}>Combined</button>
          <button className={`breakdown-btn ${view === 'mine' ? 'active' : ''}`} onClick={() => setView('mine')}>{myName}</button>
          <button className={`breakdown-btn ${view === 'theirs' ? 'active' : ''}`} onClick={() => setView('theirs')}>{theirName}</button>
        </div>

        {data.length > 0 ? (
          <>
            <div className="pie-wrapper">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="amount"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {data.map((entry, i) => (
                      <Cell key={entry.category} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatINRFull(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="category-bars">
              {data.map((item, i) => (
                <div key={item.category} className="cat-bar-row">
                  <div className="cat-bar-header">
                    <span className="cat-bar-dot" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="cat-bar-name">{item.category}</span>
                    <span className="cat-bar-amount">{formatINRFull(item.amount)}</span>
                    <span className="cat-bar-pct">{total > 0 ? Math.round((item.amount / total) * 100) : 0}%</span>
                  </div>
                  <div className="cat-bar-track">
                    <div
                      className="cat-bar-fill"
                      style={{ width: `${total > 0 ? (item.amount / total) * 100 : 0}%`, background: COLORS[i % COLORS.length] }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="empty-state"><div className="empty-icon">📊</div><p>No expenses this month yet</p></div>
        )}
      </div>

      {/* Per-person summary */}
      <div className="card">
        <div className="card-title">👥 Person Summary</div>
        <div className="person-summary">
          <PersonCard name="Sailee" color="#ec4899" data={summary.sailee} />
          <PersonCard name="Ajinkya" color="#3b82f6" data={summary.ajinkya} />
        </div>
      </div>
    </div>
  );
}

function PersonCard({ name, color, data }) {
  const net = data.income - data.expense;
  return (
    <div className="person-card" style={{ borderTop: `3px solid ${color}` }}>
      <div className="person-name" style={{ color }}>{name}</div>
      <div className="person-row">
        <span>Income</span>
        <span className="amount-income">{formatINRFull(data.income)}</span>
      </div>
      <div className="person-row">
        <span>Expense</span>
        <span className="amount-expense">{formatINRFull(data.expense)}</span>
      </div>
      <div className="person-row person-row-net">
        <span>Net</span>
        <span className={net >= 0 ? 'amount-income' : 'amount-expense'}>{net >= 0 ? '+' : ''}{formatINRFull(net)}</span>
      </div>
    </div>
  );
}

// ── Insights ──────────────────────────────────

function InsightsSection({ insights, myName, theirName }) {
  if (!insights) return null;

  return (
    <div className="section-content">
      {/* Suggestions */}
      <div className="card">
        <div className="card-title">💡 Suggestions</div>
        <div className="suggestions-list">
          {insights.suggestions.map((s, i) => (
            <div key={i} className={`suggestion-item suggestion-${s.type}`}>
              <span className="suggestion-icon">{SUGGESTION_ICONS[s.type]}</span>
              <p className="suggestion-text">{s.message}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Top categories */}
      {insights.insights.topHouseholdCategories?.length > 0 && (
        <div className="card">
          <div className="card-title">🏆 Top Spending Categories</div>
          {insights.insights.topHouseholdCategories.map((item, i) => (
            <div key={item.category} className="top-cat-row">
              <span className="top-cat-rank">#{i + 1}</span>
              <span className="top-cat-name">{item.category}</span>
              <span className="top-cat-amount amount-expense">{formatINRFull(item.amount)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Sailee breakdown */}
      <UserInsightCard name="Sailee" color="#ec4899" stats={insights.userStats['sailee']} />
      <UserInsightCard name="Ajinkya" color="#3b82f6" stats={insights.userStats['ajinkya']} />
    </div>
  );
}

function UserInsightCard({ name, color, stats }) {
  return (
    <div className="card">
      <div className="card-title" style={{ color }}>{name}'s Top Categories</div>
      {stats.topCategories.length > 0 ? (
        stats.topCategories.map(cat => (
          <div key={cat.category} className="top-cat-row">
            <span className="top-cat-name">{cat.category}</span>
            <span className="top-cat-amount">{formatINRFull(cat.amount)}</span>
          </div>
        ))
      ) : (
        <p className="muted-text">No expenses recorded</p>
      )}
    </div>
  );
}

// ── Trend ─────────────────────────────────────

function TrendSection({ insights }) {
  if (!insights?.trend) return null;

  const data = insights.trend.map(m => ({
    name: m.month.slice(5), // MM
    Sailee: Math.round(m.sailee),
    Ajinkya: Math.round(m.ajinkya),
    Total: Math.round(m.totalExpense),
    Income: Math.round(m.totalIncome),
  }));

  return (
    <div className="section-content">
      <div className="card">
        <div className="card-title">📈 6-Month Spending Trend</div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={v => formatINR(v)} width={50} />
            <Tooltip formatter={(v, name) => [formatINRFull(v), name]} />
            <Bar dataKey="Sailee" fill="#ec4899" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Ajinkya" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="chart-legend">
          <span><span className="legend-dot" style={{ background: '#ec4899' }} />Sailee</span>
          <span><span className="legend-dot" style={{ background: '#3b82f6' }} />Ajinkya</span>
        </div>
      </div>

      <div className="card">
        <div className="card-title">💰 Income vs Expense</div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={v => formatINR(v)} width={50} />
            <Tooltip formatter={(v, name) => [formatINRFull(v), name]} />
            <Bar dataKey="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Total" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="chart-legend">
          <span><span className="legend-dot" style={{ background: '#10b981' }} />Income</span>
          <span><span className="legend-dot" style={{ background: '#ef4444' }} />Expenses</span>
        </div>
      </div>

      {/* Monthly data table */}
      <div className="card">
        <div className="card-title">📋 Monthly Summary</div>
        <div className="trend-table">
          <div className="trend-row trend-header">
            <span>Month</span>
            <span>Sailee</span>
            <span>Ajinkya</span>
            <span>Total</span>
          </div>
          {insights.trend.slice().reverse().map(m => (
            <div key={m.month} className="trend-row">
              <span>{m.month}</span>
              <span className="amount-expense">{formatINR(m.sailee)}</span>
              <span className="amount-expense">{formatINR(m.ajinkya)}</span>
              <span className="amount-expense">{formatINR(m.totalExpense)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Export ────────────────────────────────────

function ExportSection({ transactions, insights }) {
  const [copied, setCopied] = useState(false);
  const [month, setMonth] = useState('all');
  const textRef = useRef(null);

  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7);

  // Build months list from transactions
  const monthsAvailable = [...new Set(transactions.map(t => t.date.slice(0, 7)))]
    .sort((a, b) => b.localeCompare(a));

  const filtered = month === 'all'
    ? transactions
    : transactions.filter(t => t.date.startsWith(month));

  const exportData = {
    exportedAt: new Date().toISOString(),
    period: month === 'all' ? 'All time' : month,
    summary: {
      totalTransactions: filtered.length,
      totalExpense: filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
      totalIncome: filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
      sailee: {
        expense: filtered.filter(t => t.user === 'sailee' && t.type === 'expense').reduce((s, t) => s + t.amount, 0),
        income: filtered.filter(t => t.user === 'sailee' && t.type === 'income').reduce((s, t) => s + t.amount, 0),
      },
      ajinkya: {
        expense: filtered.filter(t => t.user === 'ajinkya' && t.type === 'expense').reduce((s, t) => s + t.amount, 0),
        income: filtered.filter(t => t.user === 'ajinkya' && t.type === 'income').reduce((s, t) => s + t.amount, 0),
      },
    },
    transactions: filtered.map(t => ({
      date: t.date,
      user: t.user,
      type: t.type,
      amount: t.amount,
      description: t.description,
      category: t.category,
      note: t.note || '',
    })),
    insights: insights ? {
      balance: insights.balance,
      suggestions: insights.suggestions,
      topCategories: insights.insights?.topHouseholdCategories,
      trend: insights.trend,
    } : null,
  };

  const jsonString = JSON.stringify(exportData, null, 2);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Fallback for older browsers
      if (textRef.current) {
        textRef.current.select();
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      }
    }
  }

  return (
    <div className="section-content">
      <div className="card">
        <div className="card-title">📤 Export Data</div>
        <p className="export-desc">
          Copy this and paste it to Kiro (your AI) for a full monthly review, spending analysis, or any financial insights.
        </p>

        {/* Month selector */}
        <div className="form-group" style={{ marginTop: 12 }}>
          <label className="form-label">Period</label>
          <select className="form-input" value={month} onChange={e => setMonth(e.target.value)}>
            <option value="all">All time</option>
            {monthsAvailable.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        {/* Stats preview */}
        <div className="export-stats">
          <div className="export-stat">
            <span>{filtered.length}</span>
            <small>transactions</small>
          </div>
          <div className="export-stat">
            <span>₹{filtered.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0).toLocaleString('en-IN',{maximumFractionDigits:0})}</span>
            <small>total spent</small>
          </div>
          <div className="export-stat">
            <span>₹{filtered.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0).toLocaleString('en-IN',{maximumFractionDigits:0})}</span>
            <small>total income</small>
          </div>
        </div>

        {/* Copy button */}
        <button className={`btn export-copy-btn ${copied ? 'copied' : ''}`} onClick={handleCopy}>
          {copied ? '✅ Copied! Paste it to Kiro' : '📋 Copy to clipboard'}
        </button>

        {/* Text area fallback */}
        <textarea
          ref={textRef}
          className="export-textarea"
          value={jsonString}
          readOnly
          rows={6}
          onFocus={e => e.target.select()}
        />

        <p className="export-hint">
          💡 Tip: tap the text area to select all, then copy manually if the button doesn't work.
        </p>
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

import React, { useState, useEffect } from 'react';
import { getPatterns, getRecap, getInsights } from '../api';
import './IntelligenceScreen.css';

const SEVERITY_COLORS = {
  high: '#ef4444',
  medium: '#f59e0b',
  info: '#6366f1',
  low: '#10b981',
};

const TONE_CONFIG = {
  positive: { bg: '#f0fdf4', border: '#10b981', icon: '😊' },
  negative: { bg: '#fef2f2', border: '#ef4444', icon: '😬' },
  caution: { bg: '#fff7ed', border: '#f59e0b', icon: '🤔' },
  neutral: { bg: '#f8fafc', border: '#6366f1', icon: '📊' },
};

function formatINR(n) {
  return '₹' + Math.abs(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export default function IntelligenceScreen({ activeUser, transactions }) {
  const [patterns, setPatterns] = useState([]);
  const [recap, setRecap] = useState(null);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('recap');

  const myName = activeUser === 'sailee' ? 'Sailee' : 'Ajinkya';

  useEffect(() => {
    loadAll();
  }, [activeUser]);

  async function loadAll() {
    setLoading(true);
    try {
      const [p, r, ins] = await Promise.all([
        getPatterns(activeUser),
        getRecap(activeUser),
        getInsights(),
      ]);
      setPatterns(p);
      setRecap(r);
      setInsights(ins);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  return (
    <div className="intel-page">
      <div className="intel-header">
        <h2>💡 Insights</h2>
        <p className="intel-subtitle">Keeping {myName} honest</p>
      </div>

      <div className="intel-tabs">
        {[
          { id: 'recap', label: '📅 Weekly' },
          { id: 'patterns', label: '🔍 Patterns' },
          { id: 'history', label: '📈 History' },
        ].map(tab => (
          <button
            key={tab.id}
            className={`intel-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="intel-loading">
          <div className="loading-spinner" />
          <p>Analysing your spending...</p>
        </div>
      ) : (
        <div className="intel-body">
          {activeTab === 'recap' && recap && (
            <RecapSection recap={recap} myName={myName} />
          )}
          {activeTab === 'patterns' && (
            <PatternsSection patterns={patterns} myName={myName} />
          )}
          {activeTab === 'history' && insights && (
            <HistorySection insights={insights} activeUser={activeUser} />
          )}
        </div>
      )}
    </div>
  );
}

// ── Weekly Recap ──────────────────────────────

function RecapSection({ recap, myName }) {
  const tone = TONE_CONFIG[recap.tone] || TONE_CONFIG.neutral;

  return (
    <div className="section-content">
      {/* Headline card */}
      <div className="recap-card" style={{ background: tone.bg, borderLeft: `4px solid ${tone.border}` }}>
        <div className="recap-icon">{tone.icon}</div>
        <div>
          <div className="recap-period">{recap.period}</div>
          <div className="recap-headline">{recap.headline}</div>
        </div>
      </div>

      {/* Stats row */}
      <div className="card">
        <div className="recap-stats">
          <div className="recap-stat">
            <span className="rstat-value amount-expense">{formatINR(recap.stats.totalSpent)}</span>
            <span className="rstat-label">Spent</span>
          </div>
          <div className="recap-stat-divider" />
          <div className="recap-stat">
            <span className="rstat-value">{recap.stats.transactionCount}</span>
            <span className="rstat-label">Transactions</span>
          </div>
          <div className="recap-stat-divider" />
          <div className="recap-stat">
            <span className={`rstat-value ${recap.stats.weekChange > 0 ? 'amount-expense' : 'amount-income'}`}>
              {recap.stats.weekChange > 0 ? '+' : ''}{recap.stats.weekChange}%
            </span>
            <span className="rstat-label">vs last week</span>
          </div>
        </div>
      </div>

      {/* Detail lines */}
      {recap.details.length > 0 && (
        <div className="card">
          <div className="card-title">This week in detail</div>
          {recap.details.map((d, i) => (
            <div key={i} className="recap-detail-row">
              <span className="recap-detail-dot">·</span>
              <span className="recap-detail-text">{d}</span>
            </div>
          ))}
        </div>
      )}

      {/* Category breakdown */}
      {recap.categoryBreakdown.length > 0 && (
        <div className="card">
          <div className="card-title">Where it went</div>
          {recap.categoryBreakdown.map((item, i) => {
            const maxAmt = recap.categoryBreakdown[0].amount;
            const pct = (item.amount / maxAmt) * 100;
            return (
              <div key={item.category} className="recap-cat-row">
                <span className="recap-cat-name">{item.category}</span>
                <div className="recap-cat-bar-track">
                  <div className="recap-cat-bar-fill" style={{ width: `${pct}%` }} />
                </div>
                <span className="recap-cat-amount">{formatINR(item.amount)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Patterns ──────────────────────────────────

function PatternsSection({ patterns, myName }) {
  if (patterns.length === 0) {
    return (
      <div className="section-content">
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            <p>Not enough data yet to detect patterns. Keep logging and check back in a few weeks!</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="section-content">
      <p className="intel-intro">Based on {myName}'s transaction history:</p>
      {patterns.map((p, i) => (
        <div key={i} className="pattern-card" style={{ borderLeft: `4px solid ${SEVERITY_COLORS[p.severity] || '#6366f1'}` }}>
          <div className="pattern-top">
            <span className="pattern-icon">{p.icon}</span>
            <div>
              <div className="pattern-title">{p.title}</div>
              <div className={`pattern-severity severity-${p.severity}`}>
                {p.severity === 'high' ? 'High impact' : p.severity === 'medium' ? 'Worth noting' : 'FYI'}
              </div>
            </div>
          </div>
          <p className="pattern-message">{p.message}</p>
        </div>
      ))}
    </div>
  );
}

// ── History Comparison ────────────────────────

function HistorySection({ insights, activeUser }) {
  if (!insights?.trend) return null;

  const trend = insights.trend;
  const myKey = activeUser;
  const maxExp = Math.max(...trend.map(m => m.totalExpense), 1);

  return (
    <div className="section-content">
      <div className="card">
        <div className="card-title">6-Month Spending History</div>
        {trend.map((m, i) => {
          const myAmt = m[myKey] || 0;
          const pct = (myAmt / maxExp) * 100;
          const isCurrentMonth = i === trend.length - 1;
          return (
            <div key={m.month} className={`history-row ${isCurrentMonth ? 'current-month' : ''}`}>
              <span className="history-month">{m.month}</span>
              <div className="history-bar-track">
                <div
                  className="history-bar-fill"
                  style={{
                    width: `${pct}%`,
                    background: isCurrentMonth ? 'var(--primary)' : 'var(--border)',
                  }}
                />
              </div>
              <span className="history-amount">{formatINR(myAmt)}</span>
            </div>
          );
        })}
      </div>

      {/* Month-over-month summary */}
      <div className="card">
        <div className="card-title">Month-over-Month</div>
        {trend.slice(1).map((m, i) => {
          const prev = trend[i][myKey] || 0;
          const curr = m[myKey] || 0;
          const change = prev > 0 ? ((curr - prev) / prev) * 100 : 0;
          const isUp = change > 0;
          return (
            <div key={m.month} className="mom-row">
              <span className="mom-month">{m.month}</span>
              <span className="mom-amount">{formatINR(curr)}</span>
              {prev > 0 && (
                <span className={`mom-change ${isUp ? 'amount-expense' : 'amount-income'}`}>
                  {isUp ? '▲' : '▼'} {Math.abs(Math.round(change))}%
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Suggestions from insights */}
      {insights.suggestions?.length > 0 && (
        <div className="card">
          <div className="card-title">💡 Suggestions</div>
          {insights.suggestions.map((s, i) => (
            <div key={i} className={`suggestion-item suggestion-${s.type}`}>
              <span className="suggestion-icon">
                {{ warning: '⚠️', alert: '🔔', tip: '💡', positive: '✅', info: 'ℹ️' }[s.type]}
              </span>
              <p className="suggestion-text">{s.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

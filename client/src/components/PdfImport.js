import React, { useState, useRef } from 'react';
import './PdfImport.css';

const CATEGORY_ICONS = {
  'Rent & Housing': '🏠', 'Groceries': '🛒', 'Food & Dining': '🍽️',
  'Transport': '🚗', 'Utilities': '⚡', 'Mobile & Recharge': '📱',
  'Shopping': '🛍️', 'Health & Medical': '💊', 'Entertainment': '🎬',
  'Education': '📚', 'Personal Care': '💇', 'Investments & Savings': '📈',
  'EMI & Loans': '🏦', 'Travel & Vacation': '✈️', 'Gifts & Donations': '🎁',
  'Household': '🏡', 'Income': '💰', 'Other': '📌',
};

function formatINR(n) {
  return '₹' + Math.abs(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export default function PdfImport({ activeUser, onImported }) {
  const [step, setStep] = useState('upload'); // upload | preview | done
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [selected, setSelected] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedCount, setSavedCount] = useState(0);
  const fileRef = useRef(null);

  async function handleFile(file) {
    if (!file || file.type !== 'application/pdf') {
      setError('Please upload a PDF file.');
      return;
    }
    setError('');
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('pdf', file);
      formData.append('user', activeUser);

      const res = await fetch('/api/import/pdf', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to process PDF');

      // Auto-select all non-duplicates
      const sel = {};
      data.transactions.forEach((tx, i) => {
        sel[i] = tx.selected !== false;
      });

      setResult(data);
      setSelected(sel);
      setStep('preview');
    } catch (err) {
      setError(err.message);
    }
    setUploading(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function toggleAll(val) {
    const sel = {};
    result.transactions.forEach((_, i) => { sel[i] = val; });
    setSelected(sel);
  }

  async function handleImport() {
    const toImport = result.transactions.filter((_, i) => selected[i]);
    if (toImport.length === 0) {
      setError('Select at least one transaction to import.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/import/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions: toImport, user: activeUser }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSavedCount(data.saved);
      setStep('done');
      onImported?.();
    } catch (err) {
      setError(err.message);
    }
    setSaving(false);
  }

  const selectedCount = Object.values(selected).filter(Boolean).length;

  return (
    <div className="pdf-page">
      <div className="pdf-header">
        <h2>📄 Import Bank Statement</h2>
        <p className="pdf-subtitle">Upload a PDF and we'll extract transactions automatically</p>
      </div>

      <div className="pdf-body">
        {/* STEP: Upload */}
        {step === 'upload' && (
          <div className="pdf-upload-section">
            <div
              className="pdf-dropzone"
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? (
                <div className="pdf-uploading">
                  <div className="loading-spinner" />
                  <p>Reading PDF and extracting transactions...</p>
                  <p className="pdf-hint">This takes 10–20 seconds</p>
                </div>
              ) : (
                <>
                  <div className="pdf-drop-icon">📄</div>
                  <p className="pdf-drop-title">Tap to upload bank statement</p>
                  <p className="pdf-drop-sub">or drag and drop here</p>
                  <p className="pdf-drop-hint">Supports PDF bank statements from any Indian bank</p>
                </>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf"
              style={{ display: 'none' }}
              onChange={e => handleFile(e.target.files[0])}
            />

            {error && <p className="pdf-error">{error}</p>}

            <div className="pdf-tips card">
              <div className="card-title">💡 Tips for best results</div>
              <div className="pdf-tip">✓ Use the PDF downloaded directly from your bank's app or website</div>
              <div className="pdf-tip">✓ Make sure it's a text-based PDF, not a scanned image</div>
              <div className="pdf-tip">✓ Works with HDFC, ICICI, SBI, Axis, Kotak, and most Indian banks</div>
            </div>
          </div>
        )}

        {/* STEP: Preview */}
        {step === 'preview' && result && (
          <div className="pdf-preview-section">
            {/* Summary */}
            <div className="pdf-summary-bar">
              <div className="pdf-stat">
                <span>{result.total}</span>
                <small>found</small>
              </div>
              <div className="pdf-stat green">
                <span>{result.new}</span>
                <small>new</small>
              </div>
              <div className="pdf-stat orange">
                <span>{result.duplicates}</span>
                <small>duplicates</small>
              </div>
              <div className="pdf-stat primary">
                <span>{selectedCount}</span>
                <small>selected</small>
              </div>
            </div>

            {/* Select all / none */}
            <div className="pdf-select-row">
              <button className="pdf-sel-btn" onClick={() => toggleAll(true)}>Select all</button>
              <button className="pdf-sel-btn" onClick={() => toggleAll(false)}>Deselect all</button>
              <button className="pdf-sel-btn" onClick={() => {
                const sel = {};
                result.transactions.forEach((tx, i) => { sel[i] = !tx.isDuplicate; });
                setSelected(sel);
              }}>New only</button>
            </div>

            {/* Transaction list */}
            <div className="pdf-tx-list">
              {result.transactions.map((tx, i) => (
                <div
                  key={i}
                  className={`pdf-tx-item ${tx.isDuplicate ? 'duplicate' : ''} ${selected[i] ? 'selected' : ''}`}
                  onClick={() => setSelected(prev => ({ ...prev, [i]: !prev[i] }))}
                >
                  <div className="pdf-tx-check">
                    <div className={`check-box ${selected[i] ? 'checked' : ''}`}>
                      {selected[i] && '✓'}
                    </div>
                  </div>
                  <div className="pdf-tx-icon">
                    {CATEGORY_ICONS[tx.category] || '📌'}
                  </div>
                  <div className="pdf-tx-details">
                    <div className="pdf-tx-desc">{tx.description}</div>
                    <div className="pdf-tx-meta">
                      <span>{tx.date}</span>
                      {tx.isDuplicate && (
                        <span className="duplicate-badge">⚠️ Possible duplicate</span>
                      )}
                    </div>
                  </div>
                  <div className={`pdf-tx-amount ${tx.type === 'income' ? 'amount-income' : 'amount-expense'}`}>
                    {tx.type === 'income' ? '+' : '-'}{formatINR(tx.amount)}
                  </div>
                </div>
              ))}
            </div>

            {error && <p className="pdf-error">{error}</p>}

            {/* Actions */}
            <div className="pdf-actions">
              <button className="btn btn-ghost" onClick={() => { setStep('upload'); setResult(null); }}>
                ← Back
              </button>
              <button
                className="btn btn-primary"
                onClick={handleImport}
                disabled={saving || selectedCount === 0}
              >
                {saving ? 'Importing...' : `Import ${selectedCount} transactions`}
              </button>
            </div>
          </div>
        )}

        {/* STEP: Done */}
        {step === 'done' && (
          <div className="pdf-done">
            <div className="pdf-done-icon">🎉</div>
            <h3>{savedCount} transactions imported!</h3>
            <p>They're now in your transaction history, categorized automatically.</p>
            <button
              className="btn btn-primary"
              style={{ marginTop: 24, width: '100%' }}
              onClick={() => { setStep('upload'); setResult(null); setSavedCount(0); }}
            >
              Import another statement
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

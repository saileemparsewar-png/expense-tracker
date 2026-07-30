const BASE = '/api';

export async function getTransactions(params = {}) {
  const q = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE}/transactions${q ? '?' + q : ''}`);
  return res.json();
}

export async function addTransaction(data) {
  const res = await fetch(`${BASE}/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateTransaction(id, data) {
  const res = await fetch(`${BASE}/transactions/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteTransaction(id) {
  const res = await fetch(`${BASE}/transactions/${id}`, { method: 'DELETE' });
  return res.json();
}

export async function getInsights() {
  const res = await fetch(`${BASE}/insights`);
  return res.json();
}

export async function getSummary(month) {
  const q = month ? `?month=${month}` : '';
  const res = await fetch(`${BASE}/summary${q}`);
  return res.json();
}

export async function previewCategory(description, type) {
  const res = await fetch(`${BASE}/categorize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description, type }),
  });
  return res.json();
}

export async function getCategories() {
  const res = await fetch(`${BASE}/categories`);
  return res.json();
}

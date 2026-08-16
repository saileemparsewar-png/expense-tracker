const Groq = require('groq-sdk');

let _groq = null;

function getGroq() {
  if (!_groq) {
    _groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return _groq;
}

// ─────────────────────────────────────────────
// CHAT
// ─────────────────────────────────────────────

/**
 * Build a system prompt that includes the user's financial context.
 */
function buildSystemPrompt(context) {
  const { user, summary, goals, patterns, recentTxs, insights } = context;
  const userName = user === 'sailee' ? 'Sailee' : 'Ajinkya';
  const otherName = user === 'sailee' ? 'Ajinkya' : 'Sailee';
  const month = new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' });

  return `You are a smart, friendly, and honest personal finance assistant for ${userName} and ${otherName}, an Indian couple tracking their shared and personal expenses.

Today is ${new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}.
Current month: ${month}.
Currency: Indian Rupees (₹).

## ${userName}'s Financial Snapshot (${month}):
- Total spent: ₹${summary?.sailee_or_user_expense?.toLocaleString('en-IN') || 0}
- Total income: ₹${summary?.sailee_or_user_income?.toLocaleString('en-IN') || 0}
- Net: ₹${((summary?.sailee_or_user_income || 0) - (summary?.sailee_or_user_expense || 0)).toLocaleString('en-IN')}

## Household (${month}):
- Combined spending: ₹${summary?.totalExpense?.toLocaleString('en-IN') || 0}
- Combined income: ₹${summary?.totalIncome?.toLocaleString('en-IN') || 0}
- Balance: ${insights?.balance?.message || 'Even'}

## Top Categories This Month:
${(summary?.categoryBreakdown || []).slice(0, 6).map(c => `- ${c.category}: ₹${c.amount.toLocaleString('en-IN')}`).join('\n')}

## Active Goals:
${goals?.length > 0 ? goals.map(g => `- ${g.label || g.category || g.type}: ₹${g.spent?.toLocaleString('en-IN') || 0} / ₹${g.target_amount?.toLocaleString('en-IN')} (${g.percentage || 0}% — ${g.status})`).join('\n') : '- No goals set yet'}

## Recent Transactions (last 10):
${(recentTxs || []).slice(0, 10).map(t => `- ${t.date} | ${t.user} | ${t.type} | ₹${t.amount} | ${t.description} | ${t.category}`).join('\n')}

## Detected Patterns:
${patterns?.length > 0 ? patterns.map(p => `- ${p.title}: ${p.message}`).join('\n') : '- Not enough data yet'}

## Your Role:
- Answer questions about spending, income, goals, and patterns honestly
- Be direct and conversational — no corporate speak
- Use ₹ for all amounts
- If you don't have enough data to answer, say so
- Give actionable advice when asked
- Keep responses concise — this is a mobile app
- If asked about transactions you don't have context for, acknowledge the limitation
- Never make up numbers — only use what's in the context above`;
}

/**
 * Send a chat message and get a response.
 */
async function chat(messages, context) {
  const groq = getGroq();
  const systemPrompt = buildSystemPrompt(context);

  const response = await groq.chat.completions.create({
    model: 'llama3-8b-8192',
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages,
    ],
    temperature: 0.7,
    max_tokens: 512,
  });

  return response.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
}

// ─────────────────────────────────────────────
// PDF EXTRACTION
// ─────────────────────────────────────────────

/**
 * Extract transactions from raw PDF text using Groq AI.
 */
async function extractTransactionsFromPDF(pdfText, user) {
  const groq = getGroq();

  const prompt = `You are a bank statement parser. Extract ALL transactions from the following bank statement text.

For each transaction, extract:
- date (YYYY-MM-DD format)
- description (merchant/payee name, clean it up)
- amount (positive number, no currency symbol)
- type: "expense" for debits/withdrawals, "income" for credits/deposits

Rules:
- Only extract actual transactions, not headers or summaries
- If the date has no year, assume current year ${new Date().getFullYear()}
- Clean up descriptions — remove codes, reference numbers, keep merchant name
- For UPI transactions, extract the merchant name from the UPI ID if possible
- Ignore opening/closing balance lines
- Return ONLY valid JSON, no explanation

Return this exact JSON format:
{
  "transactions": [
    {
      "date": "2024-07-15",
      "description": "Zomato",
      "amount": 450,
      "type": "expense"
    }
  ]
}

Bank statement text:
---
${pdfText.slice(0, 12000)}
---`;

  const response = await groq.chat.completions.create({
    model: 'llama3-8b-8192',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.1,
    max_tokens: 4096,
  });

  const content = response.choices[0]?.message?.content || '{}';

  // Extract JSON from response
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Could not parse AI response as JSON');

  const parsed = JSON.parse(jsonMatch[0]);
  const transactions = parsed.transactions || [];

  // Validate and clean
  return transactions
    .filter(t => t.date && t.description && t.amount > 0)
    .map(t => ({
      date: t.date,
      description: t.description.trim(),
      amount: parseFloat(t.amount),
      type: t.type === 'income' ? 'income' : 'expense',
      user,
    }));
}

module.exports = { chat, extractTransactionsFromPDF, buildSystemPrompt };

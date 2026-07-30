/**
 * Insights & analytics engine.
 * Generates spending summaries, trends, balance calculations, and suggestions.
 */

/**
 * Get current month string in YYYY-MM format
 */
function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Get previous month string in YYYY-MM format
 */
function previousMonth() {
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Format number as Indian Rupees
 */
function formatINR(amount) {
  return `₹${Math.abs(amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

/**
 * Group transactions by category and sum amounts
 */
function groupByCategory(transactions) {
  const map = {};
  for (const t of transactions) {
    if (!map[t.category]) map[t.category] = 0;
    map[t.category] += t.amount;
  }
  return map;
}

/**
 * Main insights generator — takes all transactions and returns structured insights
 */
function generateInsights(allTransactions) {
  const month = currentMonth();
  const prevMonth = previousMonth();

  const thisMonthAll = allTransactions.filter(t => t.date.startsWith(month));
  const prevMonthAll = allTransactions.filter(t => t.date.startsWith(prevMonth));

  const thisMonthExpenses = thisMonthAll.filter(t => t.type === 'expense');
  const prevMonthExpenses = prevMonthAll.filter(t => t.type === 'expense');
  const thisMonthIncome = thisMonthAll.filter(t => t.type === 'income');

  // Per-user breakdown
  const users = ['sailee', 'ajinkya'];
  const userStats = {};

  for (const user of users) {
    const userExpenses = thisMonthExpenses.filter(t => t.user === user);
    const userIncome = thisMonthIncome.filter(t => t.user === user);
    const totalExpense = userExpenses.reduce((s, t) => s + t.amount, 0);
    const totalIncome = userIncome.reduce((s, t) => s + t.amount, 0);

    userStats[user] = {
      totalExpense,
      totalIncome,
      net: totalIncome - totalExpense,
      topCategories: getTopCategories(userExpenses, 3),
      categoryBreakdown: groupByCategory(userExpenses),
    };
  }

  // Combined household expenses this month
  const combinedExpenses = thisMonthExpenses.reduce((s, t) => s + t.amount, 0);
  const combinedIncome = thisMonthIncome.reduce((s, t) => s + t.amount, 0);

  // Balance: who paid more this month
  const sExpense = userStats['sailee'].totalExpense;
  const aExpense = userStats['ajinkya'].totalExpense;
  const diff = sExpense - aExpense;
  let balanceMessage = '';
  if (Math.abs(diff) < 100) {
    balanceMessage = 'You two are almost perfectly balanced this month!';
  } else if (diff > 0) {
    balanceMessage = `Sailee has spent ${formatINR(diff)} more than Ajinkya this month.`;
  } else {
    balanceMessage = `Ajinkya has spent ${formatINR(Math.abs(diff))} more than Sailee this month.`;
  }

  // Month-over-month comparison
  const prevTotal = prevMonthExpenses.reduce((s, t) => s + t.amount, 0);
  let momInsight = '';
  if (prevTotal > 0) {
    const change = ((combinedExpenses - prevTotal) / prevTotal) * 100;
    if (change > 10) {
      momInsight = `Combined spending is up ${change.toFixed(0)}% compared to last month (${formatINR(prevTotal)} → ${formatINR(combinedExpenses)}).`;
    } else if (change < -10) {
      momInsight = `Great job! Combined spending is down ${Math.abs(change).toFixed(0)}% compared to last month.`;
    } else {
      momInsight = `Spending is on track — roughly the same as last month (${formatINR(prevTotal)}).`;
    }
  }

  // Category spikes — find categories that grew significantly
  const thisCategories = groupByCategory(thisMonthExpenses);
  const prevCategories = groupByCategory(prevMonthExpenses);
  const spikes = [];
  for (const [cat, amount] of Object.entries(thisCategories)) {
    const prev = prevCategories[cat] || 0;
    if (prev > 0 && amount > prev * 1.5 && amount > 500) {
      spikes.push({ category: cat, current: amount, previous: prev });
    }
  }

  // Suggestions
  const suggestions = generateSuggestions(userStats, thisMonthExpenses, spikes, combinedExpenses, combinedIncome);

  // Monthly trend — last 6 months
  const trend = getLast6MonthsTrend(allTransactions);

  return {
    month,
    userStats,
    combined: {
      totalExpense: combinedExpenses,
      totalIncome: combinedIncome,
      net: combinedIncome - combinedExpenses,
    },
    balance: {
      saleePaid: sExpense,
      ajinkyaPaid: aExpense,
      difference: Math.abs(diff),
      whoPayedMore: diff > 100 ? 'sailee' : diff < -100 ? 'ajinkya' : 'equal',
      message: balanceMessage,
    },
    insights: {
      momInsight,
      spikes,
      topHouseholdCategories: getTopCategories(thisMonthExpenses, 5),
    },
    suggestions,
    trend,
  };
}

function getTopCategories(transactions, n = 3) {
  const map = groupByCategory(transactions);
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([category, amount]) => ({ category, amount }));
}

function generateSuggestions(userStats, thisMonthExpenses, spikes, totalExpense, totalIncome) {
  const suggestions = [];

  // Savings rate suggestion
  if (totalIncome > 0) {
    const savingsRate = ((totalIncome - totalExpense) / totalIncome) * 100;
    if (savingsRate < 10) {
      suggestions.push({
        type: 'warning',
        message: `You're saving less than 10% of combined income this month. Try to target at least 20%.`,
      });
    } else if (savingsRate >= 30) {
      suggestions.push({
        type: 'positive',
        message: `Excellent savings rate of ${savingsRate.toFixed(0)}% this month! Keep it up.`,
      });
    }
  }

  // Category spike alerts
  for (const spike of spikes.slice(0, 2)) {
    suggestions.push({
      type: 'alert',
      message: `${spike.category} spending jumped ${(((spike.current - spike.previous) / spike.previous) * 100).toFixed(0)}% compared to last month (${formatINR(spike.current)} vs ${formatINR(spike.previous)}).`,
    });
  }

  // Food spending insight
  const foodCats = ['Food & Dining', 'Groceries'];
  const foodSpend = thisMonthExpenses
    .filter(t => foodCats.includes(t.category))
    .reduce((s, t) => s + t.amount, 0);
  if (foodSpend > 10000) {
    suggestions.push({
      type: 'tip',
      message: `Combined food spending is ${formatINR(foodSpend)} this month. Cooking more at home could help cut costs.`,
    });
  }

  // Entertainment / OTT
  const entSpend = thisMonthExpenses
    .filter(t => t.category === 'Entertainment')
    .reduce((s, t) => s + t.amount, 0);
  if (entSpend > 3000) {
    suggestions.push({
      type: 'tip',
      message: `Entertainment is at ${formatINR(entSpend)} this month — worth reviewing subscriptions you might not use.`,
    });
  }

  // Balance suggestion
  const diff = Math.abs(userStats['sailee'].totalExpense - userStats['ajinkya'].totalExpense);
  if (diff > 5000) {
    suggestions.push({
      type: 'info',
      message: `Household spending is fairly uneven this month. One person has paid ${formatINR(diff)} more than the other.`,
    });
  }

  if (suggestions.length === 0) {
    suggestions.push({
      type: 'positive',
      message: 'Finances look healthy this month! No major concerns.',
    });
  }

  return suggestions;
}

function getLast6MonthsTrend(allTransactions) {
  const months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  return months.map(m => {
    const txs = allTransactions.filter(t => t.date.startsWith(m));
    const expenses = txs.filter(t => t.type === 'expense');
    const income = txs.filter(t => t.type === 'income');
    return {
      month: m,
      totalExpense: expenses.reduce((s, t) => s + t.amount, 0),
      totalIncome: income.reduce((s, t) => s + t.amount, 0),
      sailee: expenses.filter(t => t.user === 'sailee').reduce((s, t) => s + t.amount, 0),
      ajinkya: expenses.filter(t => t.user === 'ajinkya').reduce((s, t) => s + t.amount, 0),
    };
  });
}

module.exports = { generateInsights, currentMonth };

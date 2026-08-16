/**
 * Pattern detection engine.
 * Analyses transaction history to find spending patterns, impulse buys,
 * recurring merchants, and weekend vs weekday behaviour.
 */

function formatINR(n) {
  return '₹' + Math.abs(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function getWeekday(dateStr) {
  return new Date(dateStr + 'T00:00:00').getDay(); // 0=Sun, 6=Sat
}

function isWeekend(dateStr) {
  const d = getWeekday(dateStr);
  return d === 0 || d === 6;
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

/**
 * Main pattern analyser — returns all detected patterns for a user.
 */
function analysePatterns(allTransactions, user) {
  const expenses = allTransactions.filter(t => t.type === 'expense');
  const userExpenses = expenses.filter(t => t.user === user);
  const month = currentMonth();
  const thisMonthExp = expenses.filter(t => t.date.startsWith(month));
  const userThisMonth = userExpenses.filter(t => t.date.startsWith(month));

  const patterns = [];

  // 1. Weekend vs weekday spending
  const weekendSpend = userExpenses.filter(t => isWeekend(t.date)).reduce((s, t) => s + t.amount, 0);
  const weekdaySpend = userExpenses.filter(t => !isWeekend(t.date)).reduce((s, t) => s + t.amount, 0);
  const weekendCount = userExpenses.filter(t => isWeekend(t.date)).length;
  const weekdayCount = userExpenses.filter(t => !isWeekend(t.date)).length;

  if (weekendCount > 2 && weekdayCount > 2) {
    const weekendAvg = weekendSpend / weekendCount;
    const weekdayAvg = weekdaySpend / weekdayCount;
    if (weekendAvg > weekdayAvg * 1.4) {
      patterns.push({
        type: 'weekend_spender',
        severity: weekendAvg > weekdayAvg * 2 ? 'high' : 'medium',
        title: 'Weekend Spender',
        message: `You spend ${Math.round((weekendAvg / weekdayAvg - 1) * 100)}% more per transaction on weekends (avg ${formatINR(weekendAvg)}) vs weekdays (avg ${formatINR(weekdayAvg)}).`,
        icon: '🏖️',
      });
    }
  }

  // 2. Recurring merchants (same description 3+ times)
  const merchantCount = {};
  const merchantTotal = {};
  for (const t of userExpenses) {
    const key = t.description.toLowerCase().trim();
    merchantCount[key] = (merchantCount[key] || 0) + 1;
    merchantTotal[key] = (merchantTotal[key] || 0) + t.amount;
  }
  const recurring = Object.entries(merchantCount)
    .filter(([, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  for (const [merchant, count] of recurring) {
    const avg = merchantTotal[merchant] / count;
    patterns.push({
      type: 'recurring_merchant',
      severity: 'info',
      title: `Recurring: ${merchant}`,
      message: `You've spent at "${merchant}" ${count} times, averaging ${formatINR(avg)} each time. Total: ${formatINR(merchantTotal[merchant])}.`,
      icon: '🔁',
    });
  }

  // 3. Impulse buy detection (Food/Shopping/Entertainment, evening, high amount)
  const impulseCategories = ['Food & Dining', 'Shopping', 'Entertainment', 'Personal Care'];
  const impulses = userExpenses.filter(t => {
    if (!impulseCategories.includes(t.category)) return false;
    if (t.amount < 500) return false;
    const hour = t.created_at ? parseInt(t.created_at.split(' ')[1]?.split(':')[0] || '12') : 12;
    return hour >= 20 || hour <= 2; // after 8pm or past midnight
  });

  if (impulses.length >= 2) {
    const total = impulses.reduce((s, t) => s + t.amount, 0);
    patterns.push({
      type: 'impulse_buyer',
      severity: impulses.length >= 5 ? 'high' : 'medium',
      title: 'Late Night Spending',
      message: `${impulses.length} transactions look like late-night impulse purchases totalling ${formatINR(total)}. These tend to add up quickly.`,
      icon: '🌙',
    });
  }

  // 4. Food delivery frequency
  const foodDelivery = userExpenses.filter(t =>
    ['zomato', 'swiggy'].some(k => t.description.toLowerCase().includes(k))
  );
  if (foodDelivery.length >= 4) {
    const total = foodDelivery.reduce((s, t) => s + t.amount, 0);
    const avg = total / foodDelivery.length;
    patterns.push({
      type: 'food_delivery',
      severity: foodDelivery.length >= 8 ? 'high' : 'medium',
      title: 'Food Delivery Habit',
      message: `${foodDelivery.length} food delivery orders totalling ${formatINR(total)} (avg ${formatINR(avg)} per order). Cooking more could save significantly.`,
      icon: '🛵',
    });
  }

  // 5. Category concentration — if one category is >40% of spending
  const catMap = {};
  for (const t of userThisMonth) {
    catMap[t.category] = (catMap[t.category] || 0) + t.amount;
  }
  const totalThisMonth = userThisMonth.reduce((s, t) => s + t.amount, 0);
  if (totalThisMonth > 0) {
    for (const [cat, amount] of Object.entries(catMap)) {
      const pct = (amount / totalThisMonth) * 100;
      if (pct >= 40 && cat !== 'Rent & Housing' && cat !== 'EMI & Loans') {
        patterns.push({
          type: 'category_concentration',
          severity: pct >= 60 ? 'high' : 'medium',
          title: `Heavy ${cat} Spending`,
          message: `${Math.round(pct)}% of your spending this month is on ${cat} (${formatINR(amount)}). Consider if this aligns with your priorities.`,
          icon: '📊',
        });
      }
    }
  }

  // 6. Spending velocity — are you spending faster than usual this month?
  const dayOfMonth = new Date().getDate();
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const projectedMonthly = totalThisMonth > 0 ? (totalThisMonth / dayOfMonth) * daysInMonth : 0;

  // Get last 3 months average
  const prevMonths = [];
  for (let i = 1; i <= 3; i++) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const m = d.toISOString().slice(0, 7);
    const monthTotal = userExpenses
      .filter(t => t.date.startsWith(m))
      .reduce((s, t) => s + t.amount, 0);
    if (monthTotal > 0) prevMonths.push(monthTotal);
  }

  if (prevMonths.length >= 2 && projectedMonthly > 0) {
    const avgPrev = prevMonths.reduce((s, n) => s + n, 0) / prevMonths.length;
    if (projectedMonthly > avgPrev * 1.3) {
      patterns.push({
        type: 'spending_velocity',
        severity: projectedMonthly > avgPrev * 1.6 ? 'high' : 'medium',
        title: 'Spending Faster Than Usual',
        message: `At your current pace, you'll spend ${formatINR(projectedMonthly)} this month — ${Math.round((projectedMonthly / avgPrev - 1) * 100)}% above your ${formatINR(avgPrev)} monthly average.`,
        icon: '🚀',
      });
    }
  }

  return patterns;
}

/**
 * Check a single new transaction against goals and return nudges.
 */
function checkTransactionAgainstGoals(transaction, allTransactions, goals) {
  if (transaction.type !== 'expense') return [];

  const nudges = [];
  const month = transaction.date.slice(0, 7);

  for (const goal of goals) {
    if (goal.type !== 'category_limit') continue;
    if (goal.category !== transaction.category) continue;

    // Check if this goal applies to this user
    const applies = goal.scope === 'household' ||
      goal.owner === transaction.user;
    if (!applies) continue;

    // Calculate spent so far this month in this category
    const spent = allTransactions
      .filter(t =>
        t.type === 'expense' &&
        t.category === transaction.category &&
        t.date.startsWith(month) &&
        (goal.scope === 'household' || t.user === transaction.user)
      )
      .reduce((s, t) => s + t.amount, 0);

    const pct = (spent / goal.target_amount) * 100;
    const label = goal.label || goal.category;

    if (pct >= 100) {
      nudges.push({
        severity: 'danger',
        message: `🚨 You've exceeded your ${label} budget! Spent ${formatINR(spent)} of ${formatINR(goal.target_amount)}.`,
      });
    } else if (pct >= 80) {
      nudges.push({
        severity: 'warning',
        message: `⚠️ ${Math.round(pct)}% of your ${label} budget used — ${formatINR(goal.target_amount - spent)} remaining.`,
      });
    }
  }

  return nudges;
}

module.exports = { analysePatterns, checkTransactionAgainstGoals };

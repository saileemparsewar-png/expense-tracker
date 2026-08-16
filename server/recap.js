/**
 * Weekly recap generator.
 * Produces a plain-English honest summary of the past 7 days.
 */

function formatINR(n) {
  return '₹' + Math.abs(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function getLast7Days() {
  const dates = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

function groupByCategory(transactions) {
  const map = {};
  for (const t of transactions) {
    map[t.category] = (map[t.category] || 0) + t.amount;
  }
  return Object.entries(map).sort((a, b) => b[1] - a[1]);
}

function generateWeeklyRecap(allTransactions, user) {
  const last7 = getLast7Days();
  const startDate = last7[0];
  const endDate = last7[last7.length - 1];

  const weekTxs = allTransactions.filter(t =>
    t.date >= startDate && t.date <= endDate
  );
  const userWeekTxs = weekTxs.filter(t => t.user === user && t.type === 'expense');
  const userWeekIncome = weekTxs.filter(t => t.user === user && t.type === 'income');
  const householdWeekExp = weekTxs.filter(t => t.type === 'expense');

  const totalSpent = userWeekTxs.reduce((s, t) => s + t.amount, 0);
  const totalIncome = userWeekIncome.reduce((s, t) => s + t.amount, 0);
  const householdTotal = householdWeekExp.reduce((s, t) => s + t.amount, 0);

  // Previous week for comparison
  const prev7Start = new Date();
  prev7Start.setDate(prev7Start.getDate() - 13);
  const prev7End = new Date();
  prev7End.setDate(prev7End.getDate() - 7);
  const prev7StartStr = prev7Start.toISOString().split('T')[0];
  const prev7EndStr = prev7End.toISOString().split('T')[0];

  const prevWeekTxs = allTransactions.filter(t =>
    t.user === user &&
    t.type === 'expense' &&
    t.date >= prev7StartStr &&
    t.date <= prev7EndStr
  );
  const prevTotal = prevWeekTxs.reduce((s, t) => s + t.amount, 0);

  // Top categories
  const catBreakdown = groupByCategory(userWeekTxs);
  const topCats = catBreakdown.slice(0, 3);

  // Build honest tone
  let tone = 'neutral';
  let headline = '';
  let weekChange = 0;

  if (prevTotal > 0) {
    weekChange = ((totalSpent - prevTotal) / prevTotal) * 100;
  }

  if (totalSpent === 0) {
    tone = 'positive';
    headline = 'Quiet week — barely any spending recorded.';
  } else if (weekChange > 30) {
    tone = 'negative';
    headline = `Expensive week — you spent ${Math.round(weekChange)}% more than last week.`;
  } else if (weekChange < -20) {
    tone = 'positive';
    headline = `Good discipline this week — ${Math.round(Math.abs(weekChange))}% less than last week.`;
  } else if (totalSpent > 10000) {
    tone = 'caution';
    headline = `Heavy week with ${formatINR(totalSpent)} spent across ${userWeekTxs.length} transactions.`;
  } else {
    tone = 'neutral';
    headline = `Moderate week — ${formatINR(totalSpent)} across ${userWeekTxs.length} transactions.`;
  }

  // Build detail lines
  const details = [];

  if (topCats.length > 0) {
    const topCatStr = topCats.map(([cat, amt]) => `${cat} (${formatINR(amt)})`).join(', ');
    details.push(`Most spending went to: ${topCatStr}.`);
  }

  if (prevTotal > 0 && weekChange !== 0) {
    details.push(`Compared to last week (${formatINR(prevTotal)}), you spent ${Math.abs(Math.round(weekChange))}% ${weekChange > 0 ? 'more' : 'less'}.`);
  }

  // Food delivery check
  const foodDelivery = userWeekTxs.filter(t =>
    ['zomato', 'swiggy'].some(k => t.description.toLowerCase().includes(k))
  );
  if (foodDelivery.length >= 3) {
    details.push(`${foodDelivery.length} food delivery orders this week — worth cooking more at home?`);
  }

  // Highest single transaction
  if (userWeekTxs.length > 0) {
    const biggest = [...userWeekTxs].sort((a, b) => b.amount - a.amount)[0];
    details.push(`Biggest spend: "${biggest.description}" — ${formatINR(biggest.amount)}.`);
  }

  // Household note
  const otherUser = user === 'sailee' ? 'Ajinkya' : 'Sailee';
  const otherTotal = householdWeekExp
    .filter(t => t.user !== user)
    .reduce((s, t) => s + t.amount, 0);
  if (otherTotal > 0) {
    details.push(`${otherUser} spent ${formatINR(otherTotal)} this week. Combined household: ${formatINR(householdTotal)}.`);
  }

  return {
    period: `${startDate} to ${endDate}`,
    tone,
    headline,
    details,
    stats: {
      totalSpent,
      totalIncome,
      transactionCount: userWeekTxs.length,
      topCategory: topCats[0]?.[0] || null,
      topCategoryAmount: topCats[0]?.[1] || 0,
      weekChange: Math.round(weekChange),
      prevTotal,
    },
    categoryBreakdown: catBreakdown.map(([category, amount]) => ({ category, amount })),
  };
}

module.exports = { generateWeeklyRecap };

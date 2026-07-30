/**
 * Auto-categorization engine using keyword matching.
 * Matches description text to categories — works fully offline, no API needed.
 */

const CATEGORY_RULES = [
  {
    category: 'Rent & Housing',
    keywords: ['rent', 'housing', 'flat', 'apartment', 'maintenance', 'society', 'pg', 'hostel', 'lease', 'landlord'],
  },
  {
    category: 'Groceries',
    keywords: ['grocery', 'groceries', 'kirana', 'vegetable', 'sabzi', 'fruits', 'milk', 'dmart', 'big bazaar', 'reliance fresh', 'nature basket', 'more supermarket', 'zepto', 'blinkit', 'swiggy instamart', 'dunzo', 'bigbasket', 'fresh', 'ration'],
  },
  {
    category: 'Food & Dining',
    keywords: ['restaurant', 'cafe', 'coffee', 'lunch', 'dinner', 'breakfast', 'brunch', 'zomato', 'swiggy', 'food', 'pizza', 'burger', 'biryani', 'dosa', 'thali', 'snack', 'tea', 'chai', 'hotel', 'dhaba', 'canteen', 'mess', 'eat', 'dining', 'meal'],
  },
  {
    category: 'Transport',
    keywords: ['uber', 'ola', 'rapido', 'auto', 'rickshaw', 'cab', 'taxi', 'bus', 'metro', 'train', 'local', 'petrol', 'diesel', 'fuel', 'cng', 'parking', 'toll', 'fastag', 'irctc', 'flight', 'airline', 'indigo', 'spicejet', 'air india', 'travel', 'commute', 'transport'],
  },
  {
    category: 'Utilities',
    keywords: ['electricity', 'electric', 'light bill', 'power', 'water bill', 'gas', 'lpg', 'cylinder', 'pipe gas', 'wifi', 'internet', 'broadband', 'jio fiber', 'airtel', 'bsnl', 'act fibernet', 'utility'],
  },
  {
    category: 'Mobile & Recharge',
    keywords: ['recharge', 'mobile', 'phone bill', 'sim', 'postpaid', 'prepaid', 'jio', 'vi', 'vodafone', 'idea', 'airtel mobile', 'data plan', 'talktime'],
  },
  {
    category: 'Shopping',
    keywords: ['amazon', 'flipkart', 'myntra', 'ajio', 'nykaa', 'meesho', 'clothes', 'clothing', 'shoes', 'shirt', 'jeans', 'dress', 'fashion', 'apparel', 'bag', 'accessories', 'shopping', 'mall', 'store', 'purchase'],
  },
  {
    category: 'Health & Medical',
    keywords: ['doctor', 'hospital', 'clinic', 'pharmacy', 'medicine', 'medical', 'health', 'apollo', 'fortis', 'max hospital', 'chemist', 'diagnostic', 'lab test', 'blood test', 'xray', 'dental', 'gym', 'fitness', 'yoga', 'physiotherapy', 'insurance', 'health insurance', 'medplus', 'netmeds', 'pharmeasy', '1mg'],
  },
  {
    category: 'Entertainment',
    keywords: ['netflix', 'prime', 'hotstar', 'disney', 'jiocinema', 'zee5', 'sonyliv', 'spotify', 'youtube premium', 'movie', 'cinema', 'pvr', 'inox', 'concert', 'event', 'game', 'gaming', 'playstation', 'xbox', 'steam', 'entertainment', 'subscription', 'ott'],
  },
  {
    category: 'Education',
    keywords: ['course', 'udemy', 'coursera', 'unacademy', 'byju', 'book', 'stationery', 'school', 'college', 'fees', 'tuition', 'coaching', 'education', 'learning', 'exam', 'certification', 'training'],
  },
  {
    category: 'Personal Care',
    keywords: ['salon', 'haircut', 'parlour', 'spa', 'beauty', 'cosmetics', 'makeup', 'skincare', 'loreal', 'mamaearth', 'personal care', 'grooming', 'waxing', 'facial', 'massage'],
  },
  {
    category: 'Investments & Savings',
    keywords: ['mutual fund', 'sip', 'stock', 'share', 'zerodha', 'groww', 'upstox', 'fd', 'fixed deposit', 'rd', 'recurring deposit', 'ppf', 'nps', 'investment', 'saving', 'lic', 'insurance premium'],
  },
  {
    category: 'EMI & Loans',
    keywords: ['emi', 'loan', 'credit card', 'credit', 'repayment', 'home loan', 'car loan', 'personal loan', 'bajaj', 'hdfc loan', 'icici loan'],
  },
  {
    category: 'Travel & Vacation',
    keywords: ['trip', 'vacation', 'holiday', 'tour', 'hotel stay', 'resort', 'airbnb', 'oyo', 'goibibo', 'makemytrip', 'booking.com', 'sightseeing', 'tourism', 'trek', 'beach', 'goa', 'himachal', 'manali', 'travel'],
  },
  {
    category: 'Gifts & Donations',
    keywords: ['gift', 'present', 'donation', 'charity', 'temple', 'pooja', 'mandir', 'mosque', 'church', 'daan', 'offering', 'birthday gift', 'wedding gift'],
  },
  {
    category: 'Household',
    keywords: ['furniture', 'appliance', 'repair', 'plumber', 'electrician', 'cleaning', 'maid', 'housekeeping', 'cook', 'washing machine', 'ac', 'fridge', 'tv', 'sofa', 'bed', 'mattress', 'household', 'home decor', 'curtain', 'painting'],
  },
  {
    category: 'Income',
    keywords: ['salary', 'income', 'freelance', 'bonus', 'stipend', 'dividend', 'interest', 'rent received', 'commission', 'payout', 'transfer received', 'received', 'credited', 'earned'],
  },
];

/**
 * Returns best-matching category for a given description.
 * Falls back to 'Other' if no match found.
 */
function categorize(description, type = 'expense') {
  if (!description) return type === 'income' ? 'Income' : 'Other';

  const lower = description.toLowerCase();

  // For income type, default to Income category unless something else matches more specifically
  if (type === 'income') {
    return 'Income';
  }

  let bestMatch = null;
  let bestScore = 0;

  for (const rule of CATEGORY_RULES) {
    if (rule.category === 'Income') continue; // skip income rules for expenses
    for (const keyword of rule.keywords) {
      if (lower.includes(keyword)) {
        // Longer keyword = more specific = higher score
        const score = keyword.length;
        if (score > bestScore) {
          bestScore = score;
          bestMatch = rule.category;
        }
      }
    }
  }

  return bestMatch || 'Other';
}

/**
 * Returns all available categories.
 */
function getCategories() {
  return CATEGORY_RULES.map(r => r.category);
}

module.exports = { categorize, getCategories };

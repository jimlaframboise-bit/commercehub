// ---------------------------------------------------------------------------
// CommerceHub mock data layer
// A self-contained, deterministic dataset that emulates the kind of entities a
// retail-media platform (Pacvue-style) manages for an Amazon Sponsored Ads /
// DSP / Commerce account. All data is fictional.
// ---------------------------------------------------------------------------

// Seeded pseudo-random generator so the dataset is stable across reloads.
let _seed = 1337
function rnd() {
  _seed = (_seed * 1664525 + 1013904223) % 4294967296
  return _seed / 4294967296
}
const pick = (arr) => arr[Math.floor(rnd() * arr.length)]
const range = (min, max) => min + rnd() * (max - min)
const irange = (min, max) => Math.floor(range(min, max + 1))

// ---------------------------------------------------------------------------
// Profiles (accounts / marketplaces)
// ---------------------------------------------------------------------------
export const profiles = [
  { id: 'us', name: 'Brightleaf — Amazon.com', market: 'Amazon USA', cc: 'US', currency: '$', type: '1P' },
  { id: 'ca', name: 'Brightleaf — Amazon.ca', market: 'Amazon Canada', cc: 'CA', currency: 'C$', type: '1P' },
  { id: 'uk', name: 'Brightleaf — Amazon.co.uk', market: 'Amazon UK', cc: 'UK', currency: '£', type: '3P' },
]
export const profileById = Object.fromEntries(profiles.map((p) => [p.id, p]))

// ---------------------------------------------------------------------------
// Product catalog (used by Commerce / Digital Shelf + ad targeting)
// ---------------------------------------------------------------------------
const PRODUCTS = [
  ['B0CFREEZE1', 'Brightleaf Freeze-Dried Salmon Treats — 12.5oz', 'Brightleaf', 'Pet Treats'],
  ['B0CFREEZE2', 'Brightleaf Freeze-Dried Beef Bites — 4.7oz', 'Brightleaf', 'Pet Treats'],
  ['B0CSTICK01', 'Brightleaf Protein Sticks Variety Pack — 12ct', 'Brightleaf', 'Snacks'],
  ['B0CSWEET01', 'Brightleaf Sweet Potato Chews — 28oz', 'Brightleaf', 'Pet Treats'],
  ['B0CGRAIN01', 'Brightleaf Grain-Free Kibble — 24lb', 'Brightleaf', 'Pet Food'],
  ['B0COMEGA01', 'Brightleaf Omega-3 Fish Oil — 16oz', 'Brightleaf', 'Supplements'],
  ['B0CDENT001', 'Brightleaf Dental Chews — 36ct', 'Brightleaf', 'Pet Treats'],
  ['B0CPUMP001', 'Brightleaf Pumpkin Digestive Aid — 15oz', 'Brightleaf', 'Supplements'],
  ['B0CCALM001', 'Brightleaf Calming Soft Chews — 90ct', 'Brightleaf', 'Supplements'],
  ['B0CJERKY01', 'Brightleaf Chicken Jerky Strips — 16oz', 'Brightleaf', 'Pet Treats'],
  ['B0CPUPPY01', 'Brightleaf Puppy Starter Kibble — 12lb', 'Brightleaf', 'Pet Food'],
  ['B0CSALMON1', 'Brightleaf Wild Salmon Recipe — 24lb', 'Brightleaf', 'Pet Food'],
]

// ---------------------------------------------------------------------------
// Campaigns
// ---------------------------------------------------------------------------
const CAMP_TYPES = ['SP-Auto', 'SP-Manual', 'SB', 'SBV', 'SD-Product', 'SD-Audience']
const TARGETING = {
  'SP-Auto': 'Auto',
  'SP-Manual': 'Manual',
  SB: 'Keyword',
  SBV: 'Keyword',
  'SD-Product': 'Product',
  'SD-Audience': 'Audience',
}
const STATES = ['Enabled', 'Paused']
function deriveStatus(state, spend, budget) {
  if (state === 'Paused') return 'Paused'
  if (spend > budget * 0.92) return 'Out of Budget'
  return 'Enabled'
}

function metricBlock(scale) {
  const impr = irange(8000, 950000) * scale
  const ctr = range(0.08, 2.6)
  const clk = Math.max(20, Math.round((impr * ctr) / 100))
  const cpc = range(2.2, 5.8)
  const spend = clk * cpc
  const cvr = range(28, 70)
  const orders = Math.max(1, Math.round((clk * cvr) / 100))
  const asp = range(11, 24)
  const aov = asp * range(1.0, 1.5)
  const sales = orders * aov
  const units = Math.round(orders * range(1.0, 1.4))
  const ntb = Math.round(orders * range(0, 0.35))
  const atc = Math.round(clk * range(0.02, 0.12))
  return {
    impr: Math.round(impr), clk, ctr, cpc, spend, cvr, orders, asp, aov,
    sales, units, ntb, atc,
    acos: (spend / sales) * 100,
    roas: sales / spend,
    cpa: spend / orders,
  }
}

const MATCH = ['Broad', 'Phrase', 'Exact']
const TGROUP = ['KW-Brand', 'KW-Category', 'KW-Competitor', 'PAT-Product', 'PAT-Category']

export const campaigns = []
let cid = 1
for (const p of profiles) {
  const nCamp = p.id === 'uk' ? 8 : 16
  for (let i = 0; i < nCamp; i++) {
    const prod = pick(PRODUCTS)
    const type = pick(CAMP_TYPES)
    const scale = p.id === 'uk' ? 0.4 : 1
    const m = metricBlock(scale)
    const state = rnd() > 0.42 ? 'Enabled' : 'Paused'
    const dailyBudget = Math.round(range(5, 180) * 10) / 10
    const status = deriveStatus(state, m.spend / 30, dailyBudget)
    let suffix = TARGETING[type]
    if (type === 'SP-Manual') suffix = `Manual-${pick(TGROUP)}-${pick(MATCH)}`
    if (type === 'SP-Auto') suffix = 'Auto'
    const name = `${prod[1].split('—')[0].trim()}-${prod[0]}-${type}-${suffix}`
    campaigns.push({
      id: 'C' + String(cid++).padStart(4, '0'),
      name,
      asin: prod[0],
      product: prod[1],
      profileId: p.id,
      state,
      status,
      campaignType: type,
      targetingType: TARGETING[type],
      adGroups: { active: irange(1, 3), total: irange(1, 4) },
      dailyBudget,
      actlBid: Math.round(range(6, 18) * 10) / 10,
      avlBid: Math.round(range(20, 25) * 10) / 10,
      portfolio: pick(['Always-On', 'New Launch', 'Brand Defense', 'Competitor Conquest', 'Seasonal']),
      bidStrategy: pick(['Dynamic - down only', 'Dynamic - up & down', 'Fixed bids']),
      ...m,
    })
  }
}

// ---------------------------------------------------------------------------
// Keywords / Targets
// ---------------------------------------------------------------------------
const SEED_KW = [
  'freeze dried dog treats', 'salmon dog treats', 'grain free dog food', 'puppy food',
  'dental chews for dogs', 'omega 3 for dogs', 'calming chews', 'pumpkin for dogs',
  'protein sticks', 'healthy dog snacks', 'training treats', 'natural dog treats',
  'beef dog treats', 'sweet potato dog chews', 'fish oil for dogs', 'jerky dog treats',
  'large breed dog food', 'sensitive stomach dog food', 'high protein dog food', 'limited ingredient treats',
]
export const keywords = []
let kid = 1
for (const c of campaigns.filter((c) => c.targetingType !== 'Auto').slice(0, 26)) {
  const n = irange(4, 9)
  for (let i = 0; i < n; i++) {
    const m = metricBlock(0.08)
    keywords.push({
      id: 'K' + String(kid++).padStart(4, '0'),
      keyword: pick(SEED_KW),
      campaignId: c.id,
      campaign: c.name,
      profileId: c.profileId,
      matchType: pick(MATCH),
      state: rnd() > 0.2 ? 'Enabled' : 'Paused',
      bid: Math.round(range(0.45, 2.4) * 100) / 100,
      sugBid: Math.round(range(0.6, 2.8) * 100) / 100,
      topOfSearchIS: range(6, 64),
      ...m,
    })
  }
}

// ---------------------------------------------------------------------------
// Search-term report (with harvesting candidates)
// ---------------------------------------------------------------------------
export const searchTerms = []
let stid = 1
for (let i = 0; i < 40; i++) {
  const m = metricBlock(0.05)
  const c = pick(campaigns.filter((x) => x.campaignType.startsWith('SP')))
  searchTerms.push({
    id: 'S' + String(stid++).padStart(4, '0'),
    term: pick(SEED_KW) + pick(['', ' organic', ' bulk', ' best', ' for puppies', ' subscription', '']),
    campaign: c.name,
    profileId: c.profileId,
    matchedTarget: c.targetingType === 'Auto' ? 'close-match' : pick(SEED_KW),
    ...m,
    harvested: false,
    recommend: m.acos < 30 && m.orders > 6 ? 'harvest' : m.acos > 80 ? 'negate' : 'monitor',
  })
}

// ---------------------------------------------------------------------------
// Share of Voice
// ---------------------------------------------------------------------------
const COMPETITORS = ['Pawthentic', 'NorthernPack', 'TrueNature', 'AlphaPet', 'WildHarvest']
export const shareOfVoice = SEED_KW.slice(0, 14).map((kw, i) => {
  const paid = range(4, 38)
  const organic = range(2, 30)
  return {
    id: 'SOV' + i,
    keyword: kw,
    searchVolume: irange(1800, 64000),
    paidShare: paid,
    organicShare: organic,
    totalShare: paid + organic,
    yourRank: irange(1, 18),
    topCompetitor: pick(COMPETITORS),
    competitorShare: range(8, 42),
    trend: range(-6, 9),
  }
})

// ---------------------------------------------------------------------------
// Dayparting — 7 days x 24 hours bid multipliers
// ---------------------------------------------------------------------------
export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
export const dayparting = DAYS.map((d, di) =>
  Array.from({ length: 24 }, (_, h) => {
    // realistic curve: low overnight, peak midday + evening, weekend bump
    let base = 0.6
    if (h >= 8 && h <= 11) base = 1.05
    if (h >= 12 && h <= 14) base = 1.2
    if (h >= 18 && h <= 22) base = 1.35
    if (h >= 0 && h <= 5) base = 0.4
    if (di >= 5) base *= 1.08
    return Math.round((base + range(-0.08, 0.08)) * 100) / 100
  }),
)

// ---------------------------------------------------------------------------
// Automation rules
// ---------------------------------------------------------------------------
export const rules = [
  { id: 'R1', name: 'Defend Target ACoS ≤ 28%', type: 'Bid', scope: 'All SP campaigns', status: 'Active', trigger: 'ACoS > 28% over 14d', action: 'Decrease bid by 12%', runs: 'Every 6 hours', lastRun: '2h ago', affected: 142,
    _f: { name: 'Defend Target ACoS ≤ 28%', type: 'Bid', scope: 'All SP campaigns', mode: 'Automated Actions', conditions: [{ id: 'c1', metric: 'ACoS', op: 'gt', value: '28', value2: '' }], join: 'AND', lookback: '14', action: 'dec_bid', actionValue: '12', frequency: 'Every 6 hours' } },
  { id: 'R2', name: 'Scale Winners (ROAS ≥ 4)', type: 'Bid', scope: 'Always-On portfolio', status: 'Active', trigger: 'ROAS ≥ 4 and Orders ≥ 10 (7d)', action: 'Increase bid by 8% (max $2.40)', runs: 'Every 6 hours', lastRun: '2h ago', affected: 58,
    _f: { name: 'Scale Winners (ROAS ≥ 4)', type: 'Bid', scope: 'Selected campaigns', mode: 'Automated Actions', conditions: [{ id: 'c1', metric: 'ROAS', op: 'gte', value: '4', value2: '' }, { id: 'c2', metric: 'Orders', op: 'gte', value: '10', value2: '' }], join: 'AND', lookback: '7', action: 'inc_bid', actionValue: '8', cap: '2.40', frequency: 'Every 6 hours' } },
  { id: 'R3', name: 'Keyword Harvesting — Auto → Manual', type: 'Harvest', scope: 'All SP-Auto', status: 'Active', trigger: 'Search term: Orders ≥ 6, ACoS ≤ 30%', action: 'Add as Exact to manual campaign', runs: 'Daily 2:00 AM', lastRun: '9h ago', affected: 23,
    _f: { name: 'Keyword Harvesting — Auto → Manual', type: 'Harvest', scope: 'All SP campaigns', mode: 'Automated Actions', conditions: [{ id: 'c1', metric: 'Orders', op: 'gte', value: '6', value2: '' }, { id: 'c2', metric: 'ACoS', op: 'lte', value: '30', value2: '' }], join: 'AND', lookback: '30', action: 'harvest', actionValue: '', frequency: 'Daily' } },
  { id: 'R4', name: 'Negate Wasted Spend', type: 'Negative', scope: 'All SP campaigns', status: 'Active', trigger: 'Clicks ≥ 15, Orders = 0 (30d)', action: 'Add as Negative Exact', runs: 'Daily 3:00 AM', lastRun: '8h ago', affected: 31,
    _f: { name: 'Negate Wasted Spend', type: 'Negative', scope: 'All SP campaigns', mode: 'Automated Actions', conditions: [{ id: 'c1', metric: 'Clicks', op: 'gte', value: '15', value2: '' }, { id: 'c2', metric: 'Orders', op: 'lte', value: '0', value2: '' }], join: 'AND', lookback: '30', action: 'negative', actionValue: '', frequency: 'Daily' } },
  { id: 'R5', name: 'Out-of-Stock Auto-Pause', type: 'Retail', scope: 'All campaigns', status: 'Active', trigger: 'ASIN out of stock or Buy Box < 50%', action: 'Pause ads for ASIN', runs: 'Every 1 hour', lastRun: '24m ago', affected: 4,
    _f: { name: 'Out-of-Stock Auto-Pause', type: 'Retail', scope: 'All profiles', mode: 'Automated Actions', conditions: [{ id: 'c1', metric: 'Weeks of Cover', op: 'lt', value: '1', value2: '' }], join: 'AND', lookback: '7', action: 'pause', actionValue: '', frequency: 'Hourly' } },
  { id: 'R6', name: 'Prime Day Dayparting Boost', type: 'Dayparting', scope: 'Seasonal portfolio', status: 'Paused', trigger: 'Event window active', action: 'Apply +35% multiplier 12pm–11pm', runs: 'Hourly', lastRun: '—', affected: 0,
    _f: { name: 'Prime Day Dayparting Boost', type: 'Dayparting', scope: 'Selected campaigns', mode: 'Automated Actions', conditions: [{ id: 'c1', metric: 'Impressions', op: 'gt', value: '0', value2: '' }], join: 'AND', lookback: '7', action: 'placement', actionValue: '35', frequency: 'Hourly' } },
  { id: 'R7', name: 'Budget Pacing Guard', type: 'Budget', scope: 'All profiles', status: 'Active', trigger: 'Daily pace > 115% of target', action: 'Throttle bids 10% until midnight', runs: 'Every 2 hours', lastRun: '1h ago', affected: 76,
    _f: { name: 'Budget Pacing Guard', type: 'Budget', scope: 'All profiles', mode: 'Automated Actions', conditions: [{ id: 'c1', metric: 'Spend', op: 'gt', value: '115', value2: '' }], join: 'AND', lookback: '7', action: 'adj_budget', actionValue: '-10', frequency: 'Every 6 hours' } },
]

// ---------------------------------------------------------------------------
// Budgets
// ---------------------------------------------------------------------------
export const budgets = profiles.map((p, i) => {
  const monthly = [185000, 92000, 38000][i]
  const spent = monthly * range(0.46, 0.82)
  const dayOfMonth = new Date().getDate()
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
  const targetPace = monthly * (dayOfMonth / daysInMonth)
  return {
    profileId: p.id,
    profile: p.market,
    currency: p.currency,
    monthlyCap: monthly,
    spent,
    forecast: spent * (daysInMonth / dayOfMonth),
    targetPace,
    pacePct: (spent / targetPace) * 100,
    remaining: monthly - spent,
    status: spent > targetPace * 1.05 ? 'Over pace' : spent < targetPace * 0.9 ? 'Under pace' : 'On pace',
  }
})

// ---------------------------------------------------------------------------
// Alerts / notifications
// ---------------------------------------------------------------------------
export const alerts = [
  { id: 'A1', sev: 'high', cat: 'stock', icon: 'box', title: 'ASIN out of stock', body: 'B0CGRAIN01 Grain-Free Kibble (US) is out of stock — Rule R5 paused 3 campaigns.', time: '24m ago', read: false },
  { id: 'A2', sev: 'high', cat: 'buybox', icon: 'trend-down', title: 'Buy Box lost', body: 'B0CSWEET01 Buy Box dropped to 41% on Amazon.com. Ad efficiency at risk.', time: '1h ago', read: false },
  { id: 'A3', sev: 'med', cat: 'budget', icon: 'budget', title: 'Budget pacing alert', body: 'Amazon USA is 112% of target pace. Pacing guard (R7) throttled 76 campaigns.', time: '1h ago', read: false },
  { id: 'A4', sev: 'med', cat: 'acos', icon: 'spark', title: 'Harvest opportunity', body: '23 search terms qualify for harvesting (Orders ≥ 6, ACoS ≤ 30%).', time: '3h ago', read: true },
  { id: 'A5', sev: 'low', cat: 'anomaly', icon: 'star', title: 'Rating drop', body: 'B0COMEGA01 average rating fell to 4.1★ after 6 new reviews.', time: '6h ago', read: true },
  { id: 'A6', sev: 'low', icon: 'doc', title: 'Scheduled report sent', body: '"Weekly Exec Summary" delivered to 4 recipients.', time: '9h ago', read: true },
]

// ---------------------------------------------------------------------------
// Reports (saved + scheduled)
// ---------------------------------------------------------------------------
export const reports = [
  { id: 'RP1', name: 'Weekly Exec Summary', type: 'Dashboard', cadence: 'Weekly · Mon 7:00 AM', recipients: 4, format: 'PDF + XLSX', owner: 'You', updated: '2d ago' },
  { id: 'RP2', name: 'Campaign Performance — All Profiles', type: 'Campaign', cadence: 'Daily · 6:00 AM', recipients: 2, format: 'XLSX', owner: 'You', updated: '5h ago' },
  { id: 'RP3', name: 'Search Term Harvest Candidates', type: 'Search Term', cadence: 'Daily · 8:00 AM', recipients: 1, format: 'CSV', owner: 'A. Rivera', updated: '1d ago' },
  { id: 'RP4', name: 'Share of Voice — Priority Keywords', type: 'Share of Voice', cadence: 'Weekly · Fri 9:00 AM', recipients: 3, format: 'PDF', owner: 'You', updated: '3d ago' },
  { id: 'RP5', name: 'Digital Shelf Health', type: 'Commerce', cadence: 'Weekly · Mon 7:30 AM', recipients: 5, format: 'PDF', owner: 'M. Chen', updated: '4d ago' },
  { id: 'RP6', name: 'DSP Full-Funnel Attribution', type: 'DSP', cadence: 'Monthly · 1st 8:00 AM', recipients: 3, format: 'XLSX', owner: 'You', updated: '1w ago' },
]
export const reportTemplates = [
  'Campaign', 'Ad Group', 'Keyword', 'Search Term', 'Product (ASIN)', 'Placement',
  'Share of Voice', 'Hourly / Dayparting', 'Budget', 'DSP Line Item', 'Digital Shelf', 'Custom widget',
]

// ---------------------------------------------------------------------------
// Commerce / Digital Shelf — per ASIN
// ---------------------------------------------------------------------------
export const digitalShelf = PRODUCTS.flatMap((prod, idx) =>
  profiles.slice(0, 2).map((p) => {
    const inStock = rnd() > 0.12
    const buyBox = inStock ? range(46, 99) : range(0, 40)
    const listingScore = irange(58, 99)
    return {
      id: `${prod[0]}-${p.id}`,
      asin: prod[0],
      title: prod[1],
      brand: prod[2],
      category: prod[3],
      profileId: p.id,
      profile: p.market,
      currency: p.currency,
      price: Math.round(range(11, 49) * 100) / 100,
      mapViolation: rnd() > 0.85,
      inStock,
      buyBox,
      listingScore,
      contentIssues: listingScore < 75 ? irange(1, 4) : 0,
      rating: Math.round(range(3.8, 4.9) * 10) / 10,
      reviews: irange(40, 5200),
      glanceViews: irange(2000, 220000),
      conversion: range(3, 22),
      orderedRevenue: range(8000, 240000),
      repOos: inStock ? 0 : irange(1, 9),
      images: irange(4, 9),
      aplus: rnd() > 0.35,
      video: rnd() > 0.55,
    }
  }),
)

// ---------------------------------------------------------------------------
// DSP — orders & line items
// ---------------------------------------------------------------------------
export const dspOrders = [
  { id: 'D1', name: 'Brightleaf — Always-On Retargeting', tactic: 'Remarketing', status: 'Active', profileId: 'us', budget: 42000, spend: 28640, impr: 14200000, clicks: 38400, dpvr: 2.4, purchases: 4120, sales: 198400, roas: 6.9, ntbPct: 38 },
  { id: 'D2', name: 'Brightleaf — Category Conquest', tactic: 'In-market audiences', status: 'Active', profileId: 'us', budget: 36000, spend: 24180, impr: 19800000, clicks: 41200, dpvr: 1.8, purchases: 2860, sales: 121300, roas: 5.0, ntbPct: 61 },
  { id: 'D3', name: 'Brightleaf — New-to-Brand Prospecting', tactic: 'Lifestyle audiences', status: 'Active', profileId: 'us', budget: 30000, spend: 21750, impr: 26400000, clicks: 33100, dpvr: 1.1, purchases: 1740, sales: 73800, roas: 3.4, ntbPct: 82 },
  { id: 'D4', name: 'Brightleaf — Performance+ Auto', tactic: 'Amazon Performance+', status: 'Active', profileId: 'us', budget: 28000, spend: 19980, impr: 17600000, clicks: 29800, dpvr: 2.0, purchases: 2980, sales: 134200, roas: 6.7, ntbPct: 44 },
  { id: 'D5', name: 'Brightleaf — Brand+ Awareness', tactic: 'Amazon Brand+', status: 'Paused', profileId: 'us', budget: 22000, spend: 8400, impr: 31200000, clicks: 18200, dpvr: 0.7, purchases: 640, sales: 27600, roas: 3.3, ntbPct: 88 },
  { id: 'D6', name: 'Brightleaf — Cart Abandoners 30d', tactic: 'Remarketing', status: 'Active', profileId: 'us', budget: 16000, spend: 11240, impr: 5400000, clicks: 22600, dpvr: 3.6, purchases: 3180, sales: 142900, roas: 12.7, ntbPct: 12 },
]
// Generate additional DSP line items across profiles/tactics for grid depth.
const DSP_GEN_TACTICS = ['Remarketing', 'In-market audiences', 'Lifestyle audiences', 'Amazon Performance+', 'Amazon Brand+', 'Competitor conquest', 'High-LTV lookalike']
const DSP_NAMES = ['Lapsed Buyers Winback', 'Subscribe & Save Push', 'Holiday Prospecting', 'Competitor ASIN Conquest', 'Lookalike Expansion', 'Video Awareness', 'Detail Page Retarget', 'Cross-Sell Treats', 'Premium Lifestyle', 'Repeat Purchase Replenish', 'Prime Day Surge', 'Audience Overlap Test', 'Streaming TV Awareness', 'Deal Seekers Retarget']
let _did = 7
for (const p of profiles) {
  const nOrd = p.id === 'uk' ? 4 : 8
  for (let i = 0; i < nOrd; i++) {
    const tactic = pick(DSP_GEN_TACTICS)
    const status = rnd() > 0.25 ? 'Active' : 'Paused'
    const scale = p.id === 'uk' ? 0.4 : p.id === 'ca' ? 0.7 : 1
    const impr = Math.round(irange(3000000, 32000000) * scale)
    const clicks = Math.round((impr * range(0.08, 0.32)) / 100)
    const spend = Math.round((impr / 1000) * range(3.5, 9))
    const purchases = Math.max(100, Math.round(clicks * range(0.04, 0.18)))
    const sales = Math.round(purchases * range(38, 58))
    const budget = Math.round((spend * range(1.15, 1.8)) / 1000) * 1000
    dspOrders.push({
      id: 'D' + _did++, name: `Brightleaf — ${pick(DSP_NAMES)}`, tactic, status, profileId: p.id,
      budget, spend, impr, clicks, dpvr: +range(0.6, 3.8).toFixed(1), purchases, sales,
      roas: +(sales / spend).toFixed(1), ntbPct: irange(10, 90),
    })
  }
}

export const audiences = [
  { id: 'AU1', name: 'Viewed product, no purchase (30d)', type: 'Remarketing', source: 'Pixel / ASIN', size: 412000, status: 'Active', usedIn: 3 },
  { id: 'AU2', name: 'Repeat purchasers — replenishment', type: 'Remarketing', source: 'Purchase history', size: 86400, status: 'Active', usedIn: 2 },
  { id: 'AU3', name: 'In-market: Pet Supplies', type: 'In-market', source: 'Amazon audiences', size: 2840000, status: 'Active', usedIn: 4 },
  { id: 'AU4', name: 'Competitor ASIN viewers (Deep Intelligence)', type: 'Conquest', source: 'AMC + ASIN seeds', size: 654000, status: 'Active', usedIn: 2 },
  { id: 'AU5', name: 'Lifestyle: Health & Wellness', type: 'Lifestyle', source: 'Amazon audiences', size: 5100000, status: 'Draft', usedIn: 0 },
  { id: 'AU6', name: 'High-LTV lookalike (AMC modeled)', type: 'Modeled', source: 'AMC', size: 1280000, status: 'Active', usedIn: 1 },
  { id: 'AU7', name: 'Cart abandoners 7d', type: 'Remarketing', source: 'Pixel', size: 38200, status: 'Active', usedIn: 1 },
]

export const amcAudiences = audiences.filter((a) => /AMC/.test(a.source))
export const amcQueries = [
  { id: 'Q1', name: 'Path to conversion — ad-exposed vs organic', template: 'Customer Journey', schedule: 'Weekly', lastRun: '1d ago', rows: 18420, status: 'Ready' },
  { id: 'Q2', name: 'New-to-brand by media mix', template: 'NTB Analysis', schedule: 'Monthly', lastRun: '6d ago', rows: 9240, status: 'Ready' },
  { id: 'Q3', name: 'Overlap: SP + DSP exposed audiences', template: 'Audience Overlap', schedule: 'Ad hoc', lastRun: '2d ago', rows: 5120, status: 'Ready' },
  { id: 'Q4', name: 'Optimal frequency for conversion lift', template: 'Frequency Analysis', schedule: 'Weekly', lastRun: '1d ago', rows: 7610, status: 'Running' },
  { id: 'Q5', name: 'Time-to-conversion / dayparting signal', template: 'Custom SQL', schedule: 'Daily', lastRun: '4h ago', rows: 24180, status: 'Ready' },
]

// ---------------------------------------------------------------------------
// Time-series for charts (last 30 days)
// ---------------------------------------------------------------------------
export const timeseries = (() => {
  const out = []
  const today = new Date('2026-06-19')
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dow = d.getDay()
    const weekend = dow === 0 || dow === 6 ? 1.18 : 1
    const base = 120000 + Math.sin(i / 3) * 22000 + (29 - i) * 2400
    const impr = Math.round(base * weekend * (1 + range(-0.08, 0.08)))
    const clicks = Math.round(impr * range(0.0026, 0.0038))
    const spend = Math.round(clicks * range(3.1, 4.2))
    const orders = Math.round(clicks * range(0.42, 0.6))
    const sales = Math.round(orders * range(15, 22))
    out.push({
      date: `${d.getMonth() + 1}/${d.getDate()}`,
      impr, clicks, spend, orders, sales,
      acos: +((spend / sales) * 100).toFixed(1),
      roas: +(sales / spend).toFixed(2),
    })
  }
  return out
})()

// ---------------------------------------------------------------------------
// Aggregations / KPI helpers
// ---------------------------------------------------------------------------
export function aggregate(rows) {
  const sum = (k) => rows.reduce((a, b) => a + (b[k] || 0), 0)
  const impr = sum('impr'), clk = sum('clk'), spend = sum('spend'),
    sales = sum('sales'), orders = sum('orders'), units = sum('units')
  return {
    impr, clk, spend, sales, orders, units,
    ctr: impr ? (clk / impr) * 100 : 0,
    cpc: clk ? spend / clk : 0,
    acos: sales ? (spend / sales) * 100 : 0,
    roas: spend ? sales / spend : 0,
    cvr: clk ? (orders / clk) * 100 : 0,
    cpa: orders ? spend / orders : 0,
    aov: orders ? sales / orders : 0,
  }
}

export function campaignsFor(profileId) {
  return profileId === 'all' ? campaigns : campaigns.filter((c) => c.profileId === profileId)
}

// ---------------------------------------------------------------------------
// Tagging (E1 — spec §12). Custom tags + sub-tags per entity type. Membership
// is DERIVED at render time by matching each tag's matchRule (name contains /
// does not contain, case-insensitive) against the entity text, plus any
// explicit `members` ids (manual assignments). Brightleaf names only — all
// data fictional. matchRule terms are chosen to hit the Brightleaf campaign /
// keyword / product names generated above.
// ---------------------------------------------------------------------------
export const campaignTags = [
  { id: 'CT1', name: 'Calming', owner: 'jim@brightleaf.co', sub: ['Soft Chews'], matchRule: { contains: ['Calming'], notContains: [] }, members: [] },
  { id: 'CT2', name: 'Salmon Recipe', owner: 'a.rivera@brightleaf.co', sub: ['Freeze-Dried Salmon', 'Wild Salmon'], matchRule: { contains: ['Salmon'], notContains: [] }, members: [] },
  { id: 'CT3', name: 'Pumpkin Digestive', owner: 'a.rivera@brightleaf.co', sub: [], matchRule: { contains: ['Pumpkin'], notContains: [] }, members: [] },
  { id: 'CT4', name: 'Sweet Potato', owner: 'm.chen@brightleaf.co', sub: [], matchRule: { contains: ['Sweet Potato'], notContains: [] }, members: [] },
  { id: 'CT5', name: 'Grain-Free', owner: 'jim@brightleaf.co', sub: ['Kibble', 'Puppy'], matchRule: { contains: ['Grain-Free', 'Puppy'], notContains: [] }, members: [] },
  { id: 'CT6', name: 'Catch All', owner: 'jim@brightleaf.co', sub: [], matchRule: { contains: [], notContains: ['Calming', 'Salmon', 'Pumpkin', 'Sweet Potato', 'Grain-Free', 'Puppy'] }, members: [] },
]
export const keywordTags = [
  { id: 'KT1', name: 'Calming', owner: 'jim@brightleaf.co', desc: 'Calming & anxiety terms', sub: [], matchRule: { contains: ['calming'], notContains: [] }, members: [] },
  { id: 'KT2', name: 'Salmon Recipe', owner: 'a.rivera@brightleaf.co', desc: 'Salmon & fish oil terms', sub: [], matchRule: { contains: ['salmon', 'fish oil'], notContains: [] }, members: [] },
  { id: 'KT3', name: 'Pumpkin Digestive', owner: 'a.rivera@brightleaf.co', desc: 'Digestive health terms', sub: [], matchRule: { contains: ['pumpkin', 'sensitive stomach'], notContains: [] }, members: [] },
  { id: 'KT4', name: 'Sweet Potato', owner: 'm.chen@brightleaf.co', desc: 'Sweet potato chew terms', sub: [], matchRule: { contains: ['sweet potato'], notContains: [] }, members: [] },
  { id: 'KT5', name: 'Grain-Free', owner: 'jim@brightleaf.co', desc: 'Grain-free & puppy food terms', sub: [], matchRule: { contains: ['grain free', 'puppy'], notContains: [] }, members: [] },
  { id: 'KT6', name: 'Catch All', owner: 'jim@brightleaf.co', desc: 'Everything not covered by a product tag', sub: [], matchRule: { contains: [], notContains: ['calming', 'salmon', 'fish oil', 'pumpkin', 'sweet potato', 'grain free', 'puppy'] }, members: [] },
]
export const asinTags = [
  { id: 'AT1', name: 'Calming', owner: 'jim@brightleaf.co', sub: ['Soft Chews'], matchRule: { contains: ['Calming'], notContains: [] }, members: [] },
  { id: 'AT2', name: 'Salmon Recipe', owner: 'a.rivera@brightleaf.co', sub: ['Freeze-Dried', 'Wild'], matchRule: { contains: ['Salmon'], notContains: [] }, members: [] },
  { id: 'AT3', name: 'Sweet Potato', owner: 'm.chen@brightleaf.co', sub: [], matchRule: { contains: ['Sweet Potato'], notContains: [] }, members: [] },
  { id: 'AT4', name: 'Grain-Free', owner: 'jim@brightleaf.co', sub: ['Kibble', 'Puppy'], matchRule: { contains: ['Grain-Free', 'Puppy'], notContains: [] }, members: [] },
  { id: 'AT5', name: 'Catch All', owner: 'jim@brightleaf.co', sub: [], matchRule: { contains: [], notContains: ['Calming', 'Salmon', 'Sweet Potato', 'Grain-Free', 'Puppy'] }, members: [] },
]

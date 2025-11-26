// lib/finance-apis.ts

// Helper: safe JSON fetch with basic error handling
async function fetchJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...options,
    // Ensure server-side fetch works for sites like NSE
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; FinanceBot/1.0)',
      'Accept': 'application/json, text/plain, */*',
      ...(options.headers || {}),
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} for ${url}: ${text}`);
  }
  return res.json() as Promise<T>;
}

/* ===========================
   A. MUTUAL FUNDS (MFAPI)
   =========================== */

export interface MutualFundNav {
  name: string;
  latestNav: number;
  date: string;
  schemeCode: string;
}

export async function getMutualFundNav(schemeCode: string): Promise<MutualFundNav> {
  const url = `https://api.mfapi.in/mf/${encodeURIComponent(schemeCode)}`;
  const data = await fetchJson<any>(url);

  if (!data?.meta || !Array.isArray(data.data) || data.data.length === 0) {
    throw new Error(`No MF data found for schemeCode=${schemeCode}`);
  }

  const latest = data.data[0];
  return {
    name: data.meta.scheme_name,
    latestNav: parseFloat(latest.nav),
    date: latest.date,
    schemeCode,
  };
}

/* ===================================
   B. INDIAN STOCKS (NSE JSON)
   =================================== */

export interface StockQuote {
  symbol: string;
  lastPrice: number;
  change: number;
  pChange: number;
  open?: number;
  high?: number;
  low?: number;
  previousClose?: number;
}

export async function getNseStockQuote(symbol: string): Promise<StockQuote> {
  // symbol example: "RELIANCE", "HDFCBANK"
  const url = `https://www.nseindia.com/api/quote-equity?symbol=${encodeURIComponent(symbol.toUpperCase())}`;

  const data = await fetchJson<any>(url);

  const d = data?.priceInfo;
  if (!d) {
    throw new Error(`No NSE priceInfo for symbol=${symbol}`);
  }

  return {
    symbol: data.info?.symbol || symbol.toUpperCase(),
    lastPrice: d.lastPrice,
    change: d.change,
    pChange: d.pChange,
    open: d.open,
    high: d.intraDayHighLow?.max,
    low: d.intraDayHighLow?.min,
    previousClose: d.previousClose,
  };
}

/* ===================================
   C. INDICES (NIFTY / SENSEX via NSE)
   =================================== */

export interface IndexQuote {
  index: string;
  last: number;
  change: number;
  pChange: number;
}

export async function getNseIndexQuote(indexName: string): Promise<IndexQuote> {
  // indexName example: "NIFTY 50", "NIFTY BANK"
  const url = 'https://www.nseindia.com/api/allIndices';
  const data = await fetchJson<any>(url);

  const match = (data?.data || []).find(
    (idx: any) => (idx?.index || '').toUpperCase() === indexName.toUpperCase()
  );

  if (!match) {
    throw new Error(`Index ${indexName} not found on NSE`);
  }

  return {
    index: match.index,
    last: match.last,
    change: match.change,
    pChange: match.pChange,
  };
}

/* ===========================
   D. GOLD PRICE (GoldAPI)
   =========================== */

export interface GoldPrice {
  metal: string;
  currency: string;
  pricePerOunce: number;
  pricePerGram: number;
}

export async function getGoldPriceInInr(): Promise<GoldPrice> {
  const apiKey = process.env.GOLDAPI_API_KEY;
  if (!apiKey) {
    throw new Error('GOLDAPI_API_KEY not set in environment');
  }

  const url = 'https://www.goldapi.io/api/XAU/INR';

  const res = await fetch(url, {
    headers: {
      'x-access-token': apiKey,
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (compatible; FinanceBot/1.0)',
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`GoldAPI error: HTTP ${res.status} ${txt}`);
  }

  const data = (await res.json()) as any;

  return {
    metal: data.metal || 'XAU',
    currency: data.currency || 'INR',
    pricePerOunce: data.price || data.price_gram_24k * 31.1035,
    pricePerGram: data.price_gram_24k,
  };
}

/* ======================================
   E. CURRENCY FX (ExchangeRate.host)
   ====================================== */

export interface FxRate {
  base: string;
  target: string;
  rate: number;
}

export async function getFxRateInrTo(target: string): Promise<FxRate> {
  const url = `https://api.exchangerate.host/latest?base=INR&symbols=${encodeURIComponent(
    target.toUpperCase()
  )}`;

  const data = await fetchJson<any>(url);
  const rate = data?.rates?.[target.toUpperCase()];
  if (!rate) {
    throw new Error(`No FX rate for INR -> ${target}`);
  }

  return {
    base: 'INR',
    target: target.toUpperCase(),
    rate,
  };
}

/* ===========================
   F. CRYPTO (CoinGecko)
   =========================== */

export interface CryptoPrice {
  id: string;
  symbol: string;
  priceInInr: number;
}

export async function getCryptoPriceInInr(coinId: string): Promise<CryptoPrice> {
  // coinId examples: "bitcoin", "ethereum", "solana"
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(
    coinId
  )}&vs_currencies=inr`;

  const data = await fetchJson<any>(url);
  const entry = data?.[coinId]?.inr;
  if (entry == null) {
    throw new Error(`No INR price for crypto=${coinId}`);
  }

  return {
    id: coinId,
    symbol: coinId.toUpperCase(),
    priceInInr: entry,
  };
}

/* ===================================
   G. GLOBAL STOCK (FMP - Optional)
   =================================== */

export interface GlobalQuote {
  symbol: string;
  price: number;
  timestamp?: string;
}

export async function getGlobalQuote(symbol: string): Promise<GlobalQuote> {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) {
    throw new Error('FMP_API_KEY not set in environment');
  }

  const url = `https://financialmodelingprep.com/api/v3/quote/${encodeURIComponent(
    symbol
  )}?apikey=${apiKey}`;

  const data = await fetchJson<any[]>(url);
  if (!data || data.length === 0) {
    throw new Error(`No FMP quote for symbol=${symbol}`);
  }

  return {
    symbol: data[0].symbol,
    price: data[0].price,
    timestamp: data[0].timestamp || data[0].lastUpdateUtc,
  };
}

/* ===================================
   H. GROWW MF METADATA (Optional)
   =================================== */

export interface MfMeta {
  schemeCode: string;
  name: string;
  category?: string;
  subCategory?: string;
  risk?: string;
}

export async function getGrowwMfMeta(schemeCode: string): Promise<MfMeta> {
  // unofficial, but useful MF metadata
  const url = `https://api-cdn.groww.in/mf/v1/meta/scheme/${encodeURIComponent(
    schemeCode
  )}`;
  const data = await fetchJson<any>(url);

  return {
    schemeCode,
    name: data.schemeName || data.scheme_name || '',
    category: data.category,
    subCategory: data.sub_category || data.subCategory,
    risk: data.risk,
  };
}

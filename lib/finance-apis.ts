
// lib/lib/finance-apis.ts

// NOTE: This file is designed to run on the server (Next.js / Node runtime).
// All calls use `fetch` with `cache: "no-store"` to ensure fresh data.
// Do NOT import this into any client-side component.

const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

type HeadersInitLike = HeadersInit | Record<string, string>;

// -------------------------------
// Helpers
// -------------------------------

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} not set in environment variables`);
  }
  return value;
}

async function fetchJson<T>(
  url: string,
  options: RequestInit = {},
  extraHeaders: HeadersInitLike = {}
): Promise<T> {
  const res = await fetch(url, {
    ...options,
    cache: "no-store",
    headers: {
      "User-Agent": DEFAULT_USER_AGENT,
      Accept: "application/json, text/plain, */*",
      ...(options.headers || {}),
      ...extraHeaders,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `HTTP ${res.status} ${res.statusText} for ${url} - ${text.slice(0, 500)}`
    );
  }

  return (await res.json()) as T;
}

// -------------------------------
// 1) Mutual Fund NAV (MFAPI)
// -------------------------------

export interface MutualFundNav {
  name: string;
  latestNav: number;
  date: string;
  schemeCode: string;
}

/**
 * Get latest NAV for an Indian mutual fund by AMFI/MFAPI scheme code.
 * API: https://api.mfapi.in/mf/{schemeCode}
 */
export async function getMutualFundNav(
  schemeCode: string
): Promise<MutualFundNav> {
  const url = `https://api.mfapi.in/mf/${encodeURIComponent(schemeCode)}`;
  const data = await fetchJson<any>(url);

  if (!data?.meta || !Array.isArray(data.data) || data.data.length === 0) {
    throw new Error(`No mutual fund data found for schemeCode=${schemeCode}`);
  }

  const latest = data.data[0];
  const nav = Number(latest.nav);

  if (!Number.isFinite(nav)) {
    throw new Error(
      `Invalid NAV value for schemeCode=${schemeCode}: ${latest.nav}`
    );
  }

  return {
    name: data.meta.scheme_name,
    latestNav: nav,
    date: latest.date,
    schemeCode,
  };
}

// -------------------------------
// 2) Indian Index Quote (NIFTY 50, BANK NIFTY, etc.)
// Uses NSE’s unofficial but stable JSON endpoint
// -------------------------------

export interface IndexQuote {
  index: string;
  last: number;
  change: number;
  pChange: number;
}

export async function getNseIndexQuote(
  indexName: string
): Promise<IndexQuote> {
  const url = "https://www.nseindia.com/api/allIndices";

  const data = await fetchJson<any>(
    url,
    {},
    {
      Referer: "https://www.nseindia.com/market-data/live-market-indices",
      "Accept-Language": "en-US,en;q=0.9",
    }
  );

  const list: any[] = Array.isArray(data?.data) ? data.data : [];

  const match = list.find(
    (idx) =>
      String(idx?.index || "").toUpperCase() ===
      indexName.toUpperCase()
  );

  if (!match) {
    throw new Error(`Index "${indexName}" not found on NSE`);
  }

  const last = Number(match.last);
  const change = Number(
    match.change ?? match.variation ?? match.pointsChange
  );
  const pChange = Number(
    match.pChange ??
      match.percentChange ??
      match.percentageChange
  );

  if (!Number.isFinite(last)) {
    throw new Error(
      `Invalid index last value for "${indexName}": ${match.last}`
    );
  }

  return {
    index: String(match.index),
    last,
    change: Number.isFinite(change) ? change : 0,
    pChange: Number.isFinite(pChange) ? pChange : 0,
  };
}



// -------------------------------
// 3) Gold Price in INR (GoldAPI)
// -------------------------------

export interface GoldPrice {
  metal: string;
  currency: string;
  pricePerOunce: number;
  pricePerGram: number;
}

/**
 * Real-time gold price in INR.
 * Endpoint: https://www.goldapi.io/api/XAU/INR
 * Requires: GOLDAPI_API_KEY
 */
export async function getGoldPriceInInr(): Promise<GoldPrice> {
  const apiKey = requireEnv("GOLDAPI_API_KEY");
  const url = "https://www.goldapi.io/api/XAU/INR";

  const res = await fetch(url, {
    cache: "no-store",
    headers: {
      "x-access-token": apiKey,
      "Content-Type": "application/json",
      "User-Agent": DEFAULT_USER_AGENT,
    },
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(
      `GoldAPI error: HTTP ${res.status} ${res.statusText} - ${txt.slice(
        0,
        300
      )}`
    );
  }

  const data = (await res.json()) as any;

  const pricePerGram = Number(data.price_gram_24k);
  const pricePerOunce =
    Number(data.price) ||
    (Number.isFinite(pricePerGram)
      ? pricePerGram * 31.1035
      : NaN);

  if (!Number.isFinite(pricePerGram)) {
    throw new Error(
      `Invalid gold price_gram_24k value from GoldAPI: ${data.price_gram_24k}`
    );
  }

  return {
    metal: data.metal || "XAU",
    currency: data.currency || "INR",
    pricePerOunce,
    pricePerGram,
  };
}

// -------------------------------
// 4) FX Rate INR -> Currency (exchangerate.host)
// -------------------------------

export interface FxRate {
  base: string;
  target: string;
  rate: number;
}

export async function getFxRateInrTo(target: string): Promise<FxRate> {
  const to = target.toUpperCase();
  const url = `https://api.exchangerate.host/latest?base=INR&symbols=${encodeURIComponent(
    to
  )}`;

  const data = await fetchJson<any>(url);
  const rateRaw = data?.rates?.[to];

  const rate = Number(rateRaw);
  if (!Number.isFinite(rate)) {
    throw new Error(`No valid FX rate for INR -> ${to}`);
  }

  return {
    base: "INR",
    target: to,
    rate,
  };
}

// -------------------------------
// 5) Crypto Prices in INR (CoinGecko)
// -------------------------------

export interface CryptoPrice {
  id: string;
  symbol: string;
  priceInInr: number;
}

export async function getCryptoPriceInInr(
  coinId: string
): Promise<CryptoPrice> {
  const id = coinId.toLowerCase().trim();
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(
    id
  )}&vs_currencies=inr`;

  const data = await fetchJson<any>(url);
  const entry = data?.[id]?.inr;

  const price = Number(entry);
  if (!Number.isFinite(price)) {
    throw new Error(`No INR price for crypto=${id}`);
  }

  return {
    id,
    symbol: id.toUpperCase(),
    priceInInr: price,
  };
}

// -------------------------------
// 6) Global Stock Quotes (FMP)
// -------------------------------

export interface GlobalQuote {
  symbol: string;
  price: number;
  timestamp?: string;
}

export async function getGlobalQuote(
  symbol: string
): Promise<GlobalQuote> {
  const apiKey = requireEnv("FMP_API_KEY");
  const url = `https://financialmodelingprep.com/api/v3/quote/${encodeURIComponent(
    symbol
  )}?apikey=${encodeURIComponent(apiKey)}`;

  const data = await fetchJson<any[]>(url);

  if (!Array.isArray(data) || data.length === 0) {
    throw new Error(`No FMP quote found for symbol=${symbol}`);
  }

  const q = data[0];
  const price = Number(q.price);

  if (!Number.isFinite(price)) {
    throw new Error(
      `Invalid FMP price value for symbol=${symbol}: ${q.price}`
    );
  }

  return {
    symbol: String(q.symbol || symbol).toUpperCase(),
    price,
    timestamp:
      q.timestamp || q.lastUpdateUtc || q.lastUpdated || undefined,
  };
}

// -------------------------------
// 7) Mutual Fund Metadata (Groww)
// -------------------------------

export interface MfMeta {
  schemeCode: string;
  name: string;
  category?: string;
  subCategory?: string;
  risk?: string;
}

export async function getGrowwMfMeta(
  schemeCode: string
): Promise<MfMeta> {
  const url = `https://api-cdn.groww.in/mf/v1/meta/scheme/${encodeURIComponent(
    schemeCode
  )}`;

  const data = await fetchJson<any>(url);

  return {
    schemeCode,
    name: data.schemeName || data.scheme_name || "",
    category: data.category || data.assetClass || undefined,
    subCategory: data.sub_category || data.subCategory || undefined,
    risk: data.risk || data.riskLevel || undefined,
  };
}

// -------------------------------
// 8) Yahoo Finance Quote via RapidAPI (Official)
// -------------------------------

export interface YahooQuote {
  symbol: string;
  longName?: string;
  shortName?: string;
  currency?: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap?: number;
}

export async function getYahooFinanceQuote(symbol: string): Promise<YahooQuote> {
  const apiKey = requireEnv("RAPIDAPI_KEY");
  const host = "yh-finance.p.rapidapi.com";

  const url = `https://${host}/market/v2/get-quotes?symbols=${encodeURIComponent(
    symbol
  )}`;

  const data = await fetchJson<any>(url, {
    method: "GET",
    headers: {
      "X-RapidAPI-Key": apiKey,
      "X-RapidAPI-Host": host,
    },
  });

  const quote = data?.quoteResponse?.result?.[0];
  if (!quote) throw new Error(`Yahoo Finance: No quote found for ${symbol}`);

  return {
    symbol: quote.symbol,
    longName: quote.longName,
    shortName: quote.shortName,
    currency: quote.currency,
    price: quote.regularMarketPrice,
    change: quote.regularMarketChange,
    changePercent: quote.regularMarketChangePercent,
    marketCap: quote.marketCap,
  };
}

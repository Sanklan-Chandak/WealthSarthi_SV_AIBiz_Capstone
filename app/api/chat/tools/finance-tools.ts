// app/api/chat/tools/finance-tools.ts
import { tool } from "ai";
import { z } from "zod";
import {
  getMutualFundNav,
  getNseIndexQuote,
  getGoldPriceInInr,
  getFxRateInrTo,
  getCryptoPriceInInr,
  getGlobalQuote,
  getGrowwMfMeta,
  getYahooFinanceQuote,
} from "@/lib/finance-apis";

// 1) Mutual Fund NAV (India)
export const mutualFundNav = tool({
  description:
    "Get the latest NAV for an Indian mutual fund using its AMFI scheme code.",
  inputSchema: z.object({
    schemeCode: z
      .string()
      .min(1)
      .describe("AMFI/MFAPI scheme code, e.g. 118834."),
  }),
  execute: async ({ schemeCode }) => {
    const nav = await getMutualFundNav(schemeCode);
    return nav;
  },
});

// 2) NSE index quote (NIFTY 50, NIFTY BANK, etc.)
export const nseIndexQuote = tool({
  description:
    'Get the latest value and daily change for an Indian index like "NIFTY 50" or "NIFTY BANK".',
  inputSchema: z.object({
    indexName: z
      .string()
      .min(1)
      .describe('Index name, e.g. "NIFTY 50", "NIFTY BANK".'),
  }),
  execute: async ({ indexName }) => {
    const quote = await getNseIndexQuote(indexName);
    return quote;
  },
});

// 3) Gold price in INR
export const goldPriceInInr = tool({
  description:
    "Get the latest gold price in INR (per gram and per ounce) using GoldAPI.",
  inputSchema: z.object({}),
  execute: async () => {
    const price = await getGoldPriceInInr();
    return price;
  },
});

// 4) FX rate: INR -> target currency (USD, EUR, etc.)
export const fxRateInrTo = tool({
  description:
    "Get the latest FX rate from INR to a target currency like USD, EUR, GBP.",
  inputSchema: z.object({
    target: z
      .string()
      .min(3)
      .describe('Target currency code, e.g. "USD", "EUR", "GBP".'),
  }),
  execute: async ({ target }) => {
    const rate = await getFxRateInrTo(target);
    return rate;
  },
});

// 5) Crypto price in INR (CoinGecko)
export const cryptoPriceInInr = tool({
  description:
    'Get the latest INR price for a cryptocurrency using its CoinGecko id, e.g. "bitcoin", "ethereum".',
  inputSchema: z.object({
    coinId: z
      .string()
      .min(1)
      .describe('CoinGecko coin id, e.g. "bitcoin", "ethereum".'),
  }),
  execute: async ({ coinId }) => {
    const price = await getCryptoPriceInInr(coinId);
    return price;
  },
});

// 6) Global stock quote via FMP (US/global symbols)
export const globalStockQuote = tool({
  description:
    "Get the latest global stock quote (e.g., AAPL, MSFT) via Financial Modeling Prep.",
  inputSchema: z.object({
    symbol: z
      .string()
      .min(1)
      .describe('Global stock symbol, e.g. "AAPL", "MSFT".'),
  }),
  execute: async ({ symbol }) => {
    const quote = await getGlobalQuote(symbol);
    return quote;
  },
});

// 7) Mutual fund metadata via Groww
export const mutualFundMeta = tool({
  description:
    "Get basic metadata for an Indian mutual fund (name, category, risk) by scheme code via Groww.",
  inputSchema: z.object({
    schemeCode: z
      .string()
      .min(1)
      .describe("Mutual fund scheme code used on Groww/MFAPI."),
  }),
  execute: async ({ schemeCode }) => {
    const meta = await getGrowwMfMeta(schemeCode);
    return meta;
  },
});

// 8) Yahoo Finance quote via RapidAPI
export const yahooFinanceQuote = tool({
  description:
    "Get market data for any symbol from Yahoo Finance via RapidAPI (works for NSE, BSE, US stocks, indices, ETFs, etc.).",
  inputSchema: z.object({
    symbol: z
      .string()
      .min(1)
      .describe(
        'Yahoo Finance symbol, e.g. "RELIANCE.NS", "AAPL", "^NSEI", "BTC-USD".'
      ),
  }),
  execute: async ({ symbol }) => {
    const quote = await getYahooFinanceQuote(symbol);
    return quote;
  },
});


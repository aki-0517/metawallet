export type ChainType = "ethereum" | "solana";
export type CurrencyType = "USDC" | "USDT";

export interface StoredTx {
  id: string;
  type: "sent" | "received";
  counterparty: string;
  amount: number;
  currency: CurrencyType;
  chain: ChainType;
  status: "completed" | "pending" | "failed";
  timestamp: number; // epoch ms
  hash: string; // EVM tx hash / Solana signature
}

const STORAGE_KEY = "metawallet_tx_history";

export function addTransaction(tx: StoredTx) {
  const list = getTransactions();
  list.unshift(tx);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function getTransactions(): StoredTx[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: StoredTx[] = JSON.parse(raw);
    return parsed.sort((a, b) => b.timestamp - a.timestamp);
  } catch {
    return [];
  }
}

export function clearTransactions() {
  localStorage.removeItem(STORAGE_KEY);
}


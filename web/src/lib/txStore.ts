export type ChainType = "ethereum" | "solana";
export type CurrencyType = "USDC";

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
  userAddress?: string; // The user's address that initiated/received this transaction
}

const STORAGE_KEY_PREFIX = "metawallet_tx_history";

// Get storage key for specific user address
function getUserStorageKey(userAddress: string): string {
  return `${STORAGE_KEY_PREFIX}_${userAddress.toLowerCase()}`;
}

export function addTransaction(tx: StoredTx) {
  // If userAddress is provided, use user-specific storage
  if (tx.userAddress) {
    const userKey = getUserStorageKey(tx.userAddress);
    const list = getUserTransactions(tx.userAddress);
    list.unshift(tx);
    localStorage.setItem(userKey, JSON.stringify(list));
  } else {
    // Fallback to global storage for backward compatibility
    const list = getTransactions();
    list.unshift(tx);
    localStorage.setItem(STORAGE_KEY_PREFIX, JSON.stringify(list));
  }
}

export function getUserTransactions(userAddress: string): StoredTx[] {
  try {
    const userKey = getUserStorageKey(userAddress);
    const raw = localStorage.getItem(userKey);
    if (!raw) return [];
    const parsed: StoredTx[] = JSON.parse(raw);
    return parsed.sort((a, b) => b.timestamp - a.timestamp);
  } catch {
    return [];
  }
}

export function getTransactions(): StoredTx[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX);
    if (!raw) return [];
    const parsed: StoredTx[] = JSON.parse(raw);
    return parsed.sort((a, b) => b.timestamp - a.timestamp);
  } catch {
    return [];
  }
}

// Get transactions for all user addresses (for the current user)
export function getUserAllTransactions(userAddresses: string[]): StoredTx[] {
  const allTransactions: StoredTx[] = [];
  
  for (const address of userAddresses) {
    if (address) {
      const userTxs = getUserTransactions(address);
      allTransactions.push(...userTxs);
    }
  }
  
  // Remove duplicates by hash and sort by timestamp
  const uniqueTransactions = allTransactions.reduce((acc, tx) => {
    const existing = acc.find(t => t.hash === tx.hash);
    if (!existing) {
      acc.push(tx);
    }
    return acc;
  }, [] as StoredTx[]);
  
  return uniqueTransactions.sort((a, b) => b.timestamp - a.timestamp);
}

export function clearTransactions() {
  localStorage.removeItem(STORAGE_KEY_PREFIX);
}

export function clearUserTransactions(userAddress: string) {
  const userKey = getUserStorageKey(userAddress);
  localStorage.removeItem(userKey);
}


// Format balance to remove unnecessary trailing zeros
export function formatBalance(amount: number): string {
  if (amount === 0) return '0';
  
  // Convert to string with 6 decimal places
  const formatted = amount.toFixed(6);
  
  // Remove trailing zeros and decimal point if not needed
  return formatted.replace(/\.?0+$/, '');
}

// Format balance with currency symbol
export function formatBalanceWithSymbol(amount: number, symbol: string = '$'): string {
  return `${symbol}${formatBalance(amount)}`;
}
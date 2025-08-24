import { createPublicClient, http, formatEther } from 'viem';
import { sepolia } from 'viem/chains';
import { Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getSolanaKeypair, getSolanaConnection } from './solanaRPC';
import { getEvmBalances } from './evm';
import { getSolanaBalances } from './solana';
import type { Address } from 'viem';

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(),
});

export async function getEvmBalance(address: string): Promise<string> {
  try {
    const balance = await publicClient.getBalance({
      address: address as `0x${string}`,
    });
    return formatEther(balance);
  } catch (error) {
    console.error('Error getting EVM balance:', error);
    return '0';
  }
}

export async function getSolanaBalance(web3authProvider: any): Promise<string> {
  try {
    const keypair = await getSolanaKeypair(web3authProvider);
    const connection = getSolanaConnection();
    const balance = await connection.getBalance(keypair.publicKey);
    return (balance / LAMPORTS_PER_SOL).toString();
  } catch (error) {
    console.error('Error getting Solana balance:', error);
    return '0';
  }
}

export async function hasMinimumBalances(
  evmAddress: string,
  web3authProvider: any,
  minEthBalance: string = '0.01',
  minSolBalance: string = '0.1'
): Promise<{ eth: boolean; sol: boolean; ethBalance: string; solBalance: string }> {
  const [ethBalance, solBalance] = await Promise.all([
    getEvmBalance(evmAddress),
    getSolanaBalance(web3authProvider),
  ]);

  return {
    eth: parseFloat(ethBalance) >= parseFloat(minEthBalance),
    sol: parseFloat(solBalance) >= parseFloat(minSolBalance),
    ethBalance,
    solBalance,
  };
}

// CCTP統合用の合計USDC残高取得機能
export async function getTotalUsdcBalance(params: {
  evmAddress: string;
  solanaAddress: string;
  usdcEvmAddress: string;
  usdcSolanaMint: string;
}): Promise<{
  evmBalance: number;
  solanaBalance: number;
  totalBalance: number;
}> {
  const { evmAddress, solanaAddress, usdcEvmAddress, usdcSolanaMint } = params;
  
  console.log('getTotalUsdcBalance called with:', {
    evmAddress,
    solanaAddress,
    usdcEvmAddress,
    usdcSolanaMint,
  });
  
  const [evmBalances, solanaBalances] = await Promise.all([
    getEvmBalances({
      walletAddress: evmAddress as Address,
      usdcAddress: usdcEvmAddress as Address,
    }),
    getSolanaBalances({
      owner: solanaAddress,
      usdcMint: usdcSolanaMint,
    }),
  ]);
  
  const totalBalance = evmBalances.usdc + solanaBalances.usdc;
  
  console.log('Total USDC balance result:', {
    evmBalance: evmBalances.usdc,
    solanaBalance: solanaBalances.usdc,
    totalBalance,
  });
  
  return {
    evmBalance: evmBalances.usdc,
    solanaBalance: solanaBalances.usdc,
    totalBalance,
  };
}

// ブリッジが必要かどうかを判定
export function shouldUseBridge(params: {
  requiredAmount: number;
  evmBalance: number;
  solanaBalance: number;
}): boolean {
  const { requiredAmount, evmBalance, solanaBalance } = params;
  
  // EVM残高が不足しているが、Solana残高で補えるかどうか
  const evmInsufficient = evmBalance < requiredAmount;
  const totalSufficient = (evmBalance + solanaBalance) >= requiredAmount;
  const solanaHasSufficient = solanaBalance >= requiredAmount;
  
  return evmInsufficient && totalSufficient && solanaHasSufficient;
}
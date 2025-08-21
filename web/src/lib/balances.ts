import { createPublicClient, http, formatEther } from 'viem';
import { sepolia } from 'viem/chains';
import { Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getSolanaKeypair, getSolanaConnection } from './solanaRPC';

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
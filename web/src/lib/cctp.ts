import axios from 'axios';
import { PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import { getBytes } from 'ethers';
import { encodeFunctionData } from 'viem';
import { getSolanaKeypair } from './solanaRPC';
import { getConnection } from './solana';
import { BN } from '@coral-xyz/anchor';
import {
  createDepositForBurnInstruction,
  getNextAvailableNonce,
  createMessageSentEventDataAccount,
  evmAddressToBuffer,
  deriveMessageTransmitterEventAuthority,
  USDC_MINT_PUBKEY,
} from './solana-cctp';

// CCTP設定
export const CCTP_CONFIG = {
  // Solana Devnet
  SOLANA_DOMAIN: 5,
  SOLANA_MESSAGE_TRANSMITTER: "CCTPV2Sm4AdWt5296sk4P66VBZ7bEhcARwFaaS9YPbeC",
  SOLANA_TOKEN_MESSENGER: "CCTPV2vPZJS2u2BBsUoscuikbYjnpFmbFsvVuJdgUMQe",
  
  // Ethereum Sepolia  
  ETHEREUM_DOMAIN: 0,
  ETHEREUM_TOKEN_MESSENGER: "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA",
  ETHEREUM_MESSAGE_TRANSMITTER: "0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275",
  
  // API
  ATTESTATION_API: "https://iris-api-sandbox.circle.com/v2/messages",
  
  // 手数料設定
  MAX_FEE: 500n, // 0.0005 USDC
  MIN_FINALITY_THRESHOLD: 1000, // Fast Transfer
};

// CCTPメッセージ形式
export interface CCTPMessage {
  message: string;
  attestation: string;
  status: string;
}

// CCTPエラークラス
export class CCTPError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'CCTPError';
  }
}

// アドレス変換ユーティリティ
export function evmAddressToBytes32(address: string): string {
  return `0x000000000000000000000000${address.replace("0x", "")}`;
}

export function evmAddressToBase58PublicKey(addressHex: string): PublicKey {
  return new PublicKey(getBytes(evmAddressToBytes32(addressHex)));
}

// アテステーション取得
export async function retrieveAttestation(transactionHash: string): Promise<CCTPMessage> {
  const url = `${CCTP_CONFIG.ATTESTATION_API}/${CCTP_CONFIG.SOLANA_DOMAIN}?transactionHash=${transactionHash}`;
  
  let attempts = 0;
  const maxAttempts = 60; // 5分間待機（5秒間隔）
  
  while (attempts < maxAttempts) {
    try {
      const response = await axios.get(url);
      if (response.data?.messages?.[0]?.status === "complete") {
        console.log("Attestation retrieved successfully!");
        return response.data.messages[0];
      }
      console.log(`Waiting for attestation... (${attempts + 1}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, 5000));
      attempts++;
    } catch (error) {
      console.error("Error fetching attestation:", error);
      if (attempts >= maxAttempts - 1) {
        throw new CCTPError(
          'Failed to retrieve attestation after maximum attempts',
          'ATTESTATION_TIMEOUT'
        );
      }
      await new Promise(resolve => setTimeout(resolve, 5000));
      attempts++;
    }
  }
  
  throw new CCTPError(
    'Attestation retrieval timed out',
    'ATTESTATION_TIMEOUT'
  );
}

// SolanaでのUSDC burn（完全実装）
async function burnUsdcOnSolana(params: {
  solanaProvider: any;
  amount: number;
  destinationEvmAddress: string;
  solanaAddress: string;
}): Promise<string> {
  const { solanaProvider, amount, destinationEvmAddress, solanaAddress } = params;
  
  try {
    console.log('Starting USDC burn on Solana:', { amount, destinationEvmAddress, solanaAddress });
    
    // Solana接続とkeypairの取得
    const connection = getConnection();
    const keypair = await getSolanaKeypair(solanaProvider);
    
    console.log('Keypair public key:', keypair.publicKey.toBase58());
    
    // 送金額をlamports単位に変換（USDC = 6 decimals）
    const amountBN = new BN(Math.floor(amount * 1000000));
    console.log('Amount in lamports:', amountBN.toString());
    
    // EVM宛先アドレスを32バイトバッファに変換
    const mintRecipient = evmAddressToBuffer(destinationEvmAddress);
    console.log('Mint recipient (hex):', mintRecipient.toString('hex'));
    
    // destinationCallerを空にして任意のアドレスからの呼び出しを許可
    const destinationCaller = Buffer.alloc(32);
    
    // 次のnonceを取得
    const nonce = await getNextAvailableNonce(connection);
    console.log('Using nonce:', nonce.toString());
    
    // Message Transmitter Event Authorityを取得
    const [messageTransmitterEventAuthority] = deriveMessageTransmitterEventAuthority();
    
    // トランザクションを構築
    const transaction = new Transaction();
    
    // Message sent event data accountを作成
    const createEventAccountIx = await createMessageSentEventDataAccount(
      connection,
      nonce,
      keypair.publicKey
    );
    transaction.add(createEventAccountIx);
    
    // DepositForBurn instructionを作成
    const { instruction: depositForBurnIx } = await createDepositForBurnInstruction({
      amount: amountBN,
      destinationDomain: CCTP_CONFIG.ETHEREUM_DOMAIN,
      mintRecipient,
      destinationCaller,
      maxFee: CCTP_CONFIG.MAX_FEE,
      minFinalityThreshold: CCTP_CONFIG.MIN_FINALITY_THRESHOLD,
      burnTokenOwner: keypair.publicKey,
      eventRentPayer: keypair.publicKey,
      messageTransmitterEventAuthority,
      nonce,
    });
    
    transaction.add(depositForBurnIx);
    
    // Recent blockhashを取得
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = keypair.publicKey;
    
    console.log('Transaction constructed, signing and sending...');
    
    // トランザクションに署名
    transaction.sign(keypair);
    
    // トランザクションを送信
    const signature = await connection.sendRawTransaction(transaction.serialize(), {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    });
    
    console.log('Transaction sent:', signature);
    
    // トランザクションの確認を待つ
    const confirmation = await connection.confirmTransaction({
      signature,
      blockhash,
      lastValidBlockHeight: (await connection.getLatestBlockhash()).lastValidBlockHeight
    }, 'confirmed');
    
    if (confirmation.value.err) {
      throw new CCTPError(
        `Transaction failed: ${JSON.stringify(confirmation.value.err)}`,
        'TRANSACTION_FAILED'
      );
    }
    
    console.log('USDC burn completed successfully on Solana:', signature);
    return signature;
    
  } catch (error) {
    console.error('Error burning USDC on Solana:', error);
    if (error instanceof CCTPError) {
      throw error;
    }
    throw new CCTPError(
      `Failed to burn USDC on Solana: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'BURN_FAILED'
    );
  }
}

// EVMでのUSDC mint
async function mintUsdcOnEvm(params: {
  attestation: CCTPMessage;
  destinationEvmAddress: string;
  evmProvider: any;
}): Promise<string> {
  const { attestation, destinationEvmAddress, evmProvider } = params;
  
  try {
    console.log('Starting USDC mint on EVM:', { destinationEvmAddress });
    console.log('Attestation received:', {
      message: attestation.message,
      attestation: attestation.attestation,
      status: attestation.status
    });

    // receiveMessage関数のABI定義
    const receiveMessageAbi = [
      {
        type: "function",
        name: "receiveMessage",
        stateMutability: "nonpayable",
        inputs: [
          { name: "message", type: "bytes" },
          { name: "attestation", type: "bytes" },
        ],
        outputs: [{ name: "success", type: "bool" }],
      },
    ];

    // receiveMessage関数を呼び出すためのdata
    const data = encodeFunctionData({
      abi: receiveMessageAbi,
      functionName: "receiveMessage",
      args: [attestation.message as `0x${string}`, attestation.attestation as `0x${string}`],
    });

    console.log('Encoded function data:', data);

    // EVMプロバイダーを使用してトランザクションを送信
    const txParams = {
      from: destinationEvmAddress,
      to: CCTP_CONFIG.ETHEREUM_MESSAGE_TRANSMITTER,
      data: data,
      value: "0x0",
    };

    console.log('Transaction parameters:', txParams);

    // トランザクションを送信
    const hash = await evmProvider.request({
      method: "eth_sendTransaction",
      params: [txParams],
    });

    console.log('USDC mint transaction sent:', hash);

    // トランザクションの確認を待つ（オプション）
    let receipt = null;
    let attempts = 0;
    const maxAttempts = 30; // 約5分間待機

    while (!receipt && attempts < maxAttempts) {
      try {
        receipt = await evmProvider.request({
          method: "eth_getTransactionReceipt",
          params: [hash],
        });
        
        if (!receipt) {
          await new Promise(resolve => setTimeout(resolve, 10000)); // 10秒待機
          attempts++;
        }
      } catch (error) {
        console.log('Waiting for transaction confirmation...', attempts + 1);
        await new Promise(resolve => setTimeout(resolve, 10000));
        attempts++;
      }
    }

    if (receipt) {
      console.log('Transaction confirmed:', receipt);
      if (receipt.status === '0x0') {
        throw new CCTPError(
          'Transaction failed during execution',
          'TRANSACTION_REVERTED'
        );
      }
    } else {
      console.warn('Transaction confirmation timeout, but hash was returned:', hash);
    }

    console.log('USDC mint completed successfully on EVM:', hash);
    return hash;
  } catch (error) {
    console.error('Error minting USDC on EVM:', error);
    if (error instanceof CCTPError) {
      throw error;
    }
    throw new CCTPError(
      `Failed to mint USDC on EVM: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'MINT_FAILED'
    );
  }
}

// SolanaからEVMへのCCTPブリッジ送金
export async function bridgeFromSolanaToEvm(params: {
  solanaProvider: any;
  amount: number;
  destinationEvmAddress: string;
  solanaAddress: string;
  evmProvider: any;
}): Promise<{
  burnTx: string;
  mintTx: string;
}> {
  const { solanaProvider, amount, destinationEvmAddress, solanaAddress, evmProvider } = params;
  
  try {
    console.log('Starting CCTP bridge from Solana to EVM...');
    
    // 1. SolanaでUSDCをburn
    const burnTx = await burnUsdcOnSolana({
      solanaProvider,
      amount,
      destinationEvmAddress,
      solanaAddress,
    });
    
    console.log('USDC burned on Solana, retrieving attestation...');
    
    // 2. アテステーションを取得
    const attestation = await retrieveAttestation(burnTx);
    
    console.log('Attestation retrieved, minting USDC on EVM...');
    
    // 3. EVMでUSDCをmint
    const mintTx = await mintUsdcOnEvm({
      attestation,
      destinationEvmAddress,
      evmProvider,
    });
    
    console.log('CCTP bridge completed successfully!');
    
    return { burnTx, mintTx };
  } catch (error) {
    console.error('CCTP bridge failed:', error);
    if (error instanceof CCTPError) {
      throw error;
    }
    throw new CCTPError(
      'Bridge transaction failed',
      'BRIDGE_FAILED'
    );
  }
}

// ブリッジ手数料を計算
export function calculateBridgeFee(amount: number): number {
  const feeInUsdc = Number(CCTP_CONFIG.MAX_FEE) / 1000000; // wei to USDC
  return Math.min(feeInUsdc, amount * 0.001); // 最大0.1%の手数料
}

// ブリッジが利用可能かチェック
export function isBridgeAvailable(): boolean {
  // Solana CCTP統合が完成したためtrueに変更
  return true;
}

// デモ・開発用：ブリッジ機能を強制的に有効化（警告付き）
export function isBridgeAvailableForDemo(): boolean {
  console.warn('⚠️ Bridge is in DEMO mode - actual CCTP integration is not complete');
  return true; // デモ用のみ
}
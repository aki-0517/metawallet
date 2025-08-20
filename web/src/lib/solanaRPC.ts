import { Keypair, Connection } from "@solana/web3.js";

// Type definition for Web3Auth provider
interface Web3AuthProvider {
  request: (args: { method: string; params?: any[] }) => Promise<any>;
}

const SOLANA_RPC = import.meta.env.VITE_SOLANA_RPC_URL || "https://api.devnet.solana.com";

// Helper function to derive ED25519 key from secp256k1 private key using Web Crypto API
async function getED25519KeyFromSecp256k1(privateKeyHex: string): Promise<Uint8Array> {
  // Remove 0x prefix if present
  const cleanKey = privateKeyHex.startsWith('0x') ? privateKeyHex.slice(2) : privateKeyHex;
  
  // Convert hex to bytes
  const privateKeyBytes = new Uint8Array(
    cleanKey.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []
  );
  
  // Use Web Crypto API to derive a 32-byte seed for ED25519
  const hashBuffer = await crypto.subtle.digest('SHA-256', privateKeyBytes);
  const seed = new Uint8Array(hashBuffer);
  return seed;
}

export async function getSolanaAccount(ethProvider: Web3AuthProvider): Promise<string> {
  try {
    const ethPrivateKey = await ethProvider.request({
      method: "private_key",
    });
    
    const seed = await getED25519KeyFromSecp256k1(ethPrivateKey as string);
    const keypair = Keypair.fromSeed(seed);
    return keypair.publicKey.toBase58();
  } catch (error) {
    console.error("Error getting Solana account:", error);
    throw error;
  }
}

export async function getSolanaBalance(ethProvider: Web3AuthProvider): Promise<string> {
  try {
    const ethPrivateKey = await ethProvider.request({
      method: "private_key",
    });
    
    const seed = await getED25519KeyFromSecp256k1(ethPrivateKey as string);
    const keypair = Keypair.fromSeed(seed);
    const connection = new Connection(SOLANA_RPC);
    const balance = await connection.getBalance(keypair.publicKey);
    return balance.toString();
  } catch (error) {
    console.error("Error getting Solana balance:", error);
    throw error;
  }
}

export async function getSolanaKeypair(ethProvider: Web3AuthProvider): Promise<Keypair> {
  const ethPrivateKey = await ethProvider.request({
    method: "private_key",
  });
  
  const seed = await getED25519KeyFromSecp256k1(ethPrivateKey as string);
  return Keypair.fromSeed(seed);
}

export function getSolanaConnection(): Connection {
  return new Connection(SOLANA_RPC);
}
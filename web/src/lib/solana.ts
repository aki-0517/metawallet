import type { SolanaPrivateKeyProvider } from "@web3auth/solana-provider";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import {
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAccount,
  getAssociatedTokenAddress,
  getMint,
} from "@solana/spl-token";

const SOLANA_RPC: string = (import.meta as any).env?.VITE_SOLANA_RPC_URL || "https://api.devnet.solana.com";

export function getConnection(): Connection {
  return new Connection(SOLANA_RPC);
}

export async function getSplBalance(params: {
  connection: Connection;
  mint: string;
  owner: string;
}): Promise<{ amount: number; decimals: number }>
{
  const { connection, mint, owner } = params;
  const mintKey = new PublicKey(mint);
  const ownerKey = new PublicKey(owner);
  const ata = await getAssociatedTokenAddress(mintKey, ownerKey);

  try {
    const [account, mintInfo] = await Promise.all([
      getAccount(connection, ata),
      getMint(connection, mintKey),
    ]);
    const amount = Number(account.amount) / Math.pow(10, mintInfo.decimals);
    return { amount, decimals: mintInfo.decimals };
  } catch {
    const mintInfo = await getMint(connection, mintKey);
    return { amount: 0, decimals: mintInfo.decimals };
  }
}

export async function getSolanaBalances(params: {
  owner: string;
  usdcMint?: string;
  usdtMint?: string;
}): Promise<{ usdc: number; usdt: number }>
{
  const { owner, usdcMint, usdtMint } = params;
  const connection = getConnection();
  let usdc = 0;
  let usdt = 0;
  if (usdcMint) {
    try {
      const { amount } = await getSplBalance({ connection, mint: usdcMint, owner });
      usdc = amount;
    } catch (e) {
      console.warn("Failed to load Solana USDC balance:", e);
    }
  }
  if (usdtMint) {
    try {
      const { amount } = await getSplBalance({ connection, mint: usdtMint, owner });
      usdt = amount;
    } catch (e) {
      console.warn("Failed to load Solana USDT balance:", e);
    }
  }
  return { usdc, usdt };
}

async function ensureRecipientAta(params: {
  connection: Connection;
  mint: PublicKey;
  recipient: PublicKey;
  payer: PublicKey;
  transaction: Transaction;
}) {
  const { connection, mint, recipient, payer, transaction } = params;
  const recipientAta = await getAssociatedTokenAddress(mint, recipient);
  try {
    await getAccount(connection, recipientAta);
  } catch {
    transaction.add(
      createAssociatedTokenAccountInstruction(
        payer,
        recipientAta,
        recipient,
        mint
      )
    );
  }
  return recipientAta;
}

export async function sendSplToken(params: {
  provider: SolanaPrivateKeyProvider;
  mint: string;
  fromPubkey: string;
  toPubkey: string;
  amountTokens: string;
}): Promise<string> {
  const { provider, mint, fromPubkey, toPubkey, amountTokens } = params;
  const connection = getConnection();
  const mintKey = new PublicKey(mint);
  const fromKey = new PublicKey(fromPubkey);
  const toKey = new PublicKey(toPubkey);

  const { decimals } = await getMint(connection, mintKey);
  const [intPart, fracPartRaw = ""] = amountTokens.split(".");
  const fracPart = (fracPartRaw + "0".repeat(decimals)).slice(0, decimals);
  const integerStr = `${intPart}${fracPart}`.replace(/^0+/, "");
  const rawAmount = BigInt(integerStr || "0");

  const fromAta = await getAssociatedTokenAddress(mintKey, fromKey);
  const tx = new Transaction();
  tx.feePayer = fromKey;

  const recipientAta = await ensureRecipientAta({
    connection,
    mint: mintKey,
    recipient: toKey,
    payer: fromKey,
    transaction: tx,
  });

  tx.add(
    createTransferInstruction(
      fromAta,
      recipientAta,
      fromKey,
      rawAmount
    )
  );

  const { blockhash } = await connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash;

  const serializedMessage = tx.serializeMessage();
  const messageBase64 = Buffer.from(serializedMessage).toString("base64");

  try {
    const sig = await (provider.request as any)({
      method: "solana_signAndSendTransaction",
      params: { message: messageBase64 },
    });
    return sig as string;
  } catch (e1) {
    try {
      const sig = await (provider.request as any)({
        method: "solana_signAndSendTransaction",
        params: [messageBase64],
      });
      return sig as string;
    } catch (e2) {
      const signed = await (provider.request as any)({
        method: "solana_signTransaction",
        params: { message: messageBase64 },
      });
      const signedTx = Transaction.from(Buffer.from(signed as string, "base64"));
      const sig = await connection.sendRawTransaction(signedTx.serialize());
      return sig;
    }
  }
}


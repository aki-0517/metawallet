import {
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Keypair,
  Connection,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { BN } from '@coral-xyz/anchor';
// Removed borsh import as we're using custom serialization

// Solana CCTP Program IDs (Devnet)
export const MESSAGE_TRANSMITTER_PROGRAM_ID = new PublicKey('CCTPV2Sm4AdWt5296sk4P66VBZ7bEhcARwFaaS9YPbeC');
export const TOKEN_MESSENGER_MINTER_PROGRAM_ID = new PublicKey('CCTPV2vPZJS2u2BBsUoscuikbYjnpFmbFsvVuJdgUMQe');

// USDC Mint on Solana Devnet
export const USDC_MINT_PUBKEY = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');

// Message format for CCTP
export interface CCTPMessage {
  version: number;
  sourceDomain: number;
  destinationDomain: number;
  nonce: BN;
  sender: PublicKey;
  recipient: PublicKey;
  destinationCaller: PublicKey;
  messageBody: Buffer;
}

// Deposit for burn message body
export interface DepositForBurnMessage {
  version: number;
  burnToken: PublicKey;
  mintRecipient: Buffer; // 32 bytes for EVM address
  amount: BN;
  messageSender: PublicKey;
}

// PDA derivation helpers
export function deriveMessageTransmitterAccount(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('message_transmitter')],
    MESSAGE_TRANSMITTER_PROGRAM_ID
  );
}

export function deriveTokenMessengerAccount(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('token_messenger')],
    TOKEN_MESSENGER_MINTER_PROGRAM_ID
  );
}

export function deriveRemoteTokenMessengerAccount(domain: number): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('remote_token_messenger'), new BN(domain).toArrayLike(Buffer, 'le', 4)],
    TOKEN_MESSENGER_MINTER_PROGRAM_ID
  );
}

export function deriveTokenMinterAccount(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('token_minter')],
    TOKEN_MESSENGER_MINTER_PROGRAM_ID
  );
}

export function deriveLocalTokenAccount(mint: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('local_token'), mint.toBuffer()],
    TOKEN_MESSENGER_MINTER_PROGRAM_ID
  );
}

export function deriveTokenPairAccount(remoteDomain: number, remoteToken: Buffer): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('token_pair'),
      new BN(remoteDomain).toArrayLike(Buffer, 'le', 4),
      remoteToken,
    ],
    TOKEN_MESSENGER_MINTER_PROGRAM_ID
  );
}

export function deriveCustodyTokenAccount(mint: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('custody'), mint.toBuffer()],
    TOKEN_MESSENGER_MINTER_PROGRAM_ID
  );
}

export function deriveEventAuthorityAccount(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('__event_authority')],
    TOKEN_MESSENGER_MINTER_PROGRAM_ID
  );
}

export function deriveMessageSentEventDataAccount(nonce: BN): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('message_sent_event_data_'),
      nonce.toArrayLike(Buffer, 'le', 8),
    ],
    MESSAGE_TRANSMITTER_PROGRAM_ID
  );
}

// Simplified serialization for deposit for burn instruction
function serializeDepositForBurnInstruction(params: {
  amount: BN;
  destinationDomain: number;
  mintRecipient: Buffer;
  destinationCaller: Buffer;
  maxFee: BN;
  minFinalityThreshold: number;
}): Buffer {
  const {
    amount,
    destinationDomain,
    mintRecipient,
    destinationCaller,
    maxFee,
    minFinalityThreshold,
  } = params;

  // Create a buffer for the instruction data
  const buffer = Buffer.alloc(8 + 4 + 32 + 32 + 8 + 4);
  let offset = 0;

  // Write amount (8 bytes, little endian)
  amount.toArrayLike(Buffer, 'le', 8).copy(buffer, offset);
  offset += 8;

  // Write destinationDomain (4 bytes, little endian)
  buffer.writeUInt32LE(destinationDomain, offset);
  offset += 4;

  // Write mintRecipient (32 bytes)
  mintRecipient.copy(buffer, offset);
  offset += 32;

  // Write destinationCaller (32 bytes)
  destinationCaller.copy(buffer, offset);
  offset += 32;

  // Write maxFee (8 bytes, little endian)
  maxFee.toArrayLike(Buffer, 'le', 8).copy(buffer, offset);
  offset += 8;

  // Write minFinalityThreshold (4 bytes, little endian)
  buffer.writeUInt32LE(minFinalityThreshold, offset);

  return buffer;
}

// Create deposit for burn instruction
export async function createDepositForBurnInstruction(params: {
  amount: BN;
  destinationDomain: number;
  mintRecipient: Buffer; // 32 bytes EVM address
  destinationCaller: Buffer; // 32 bytes, can be zero bytes for any caller
  maxFee: BN;
  minFinalityThreshold: number;
  burnTokenOwner: PublicKey;
  eventRentPayer: PublicKey;
  messageTransmitterEventAuthority: PublicKey;
  nonce: BN;
}): Promise<{
  instruction: TransactionInstruction;
  messageSentEventDataAccount: PublicKey;
}> {
  const {
    amount,
    destinationDomain,
    mintRecipient,
    destinationCaller,
    maxFee,
    minFinalityThreshold,
    burnTokenOwner,
    eventRentPayer,
    messageTransmitterEventAuthority,
    nonce,
  } = params;

  // Derive PDAs
  const [tokenMessenger] = deriveTokenMessengerAccount();
  const [messageTransmitter] = deriveMessageTransmitterAccount();
  const [remoteTokenMessenger] = deriveRemoteTokenMessengerAccount(destinationDomain);
  const [tokenMinter] = deriveTokenMinterAccount();
  const [localToken] = deriveLocalTokenAccount(USDC_MINT_PUBKEY);
  const [tokenPair] = deriveTokenPairAccount(destinationDomain, mintRecipient);
  const burnTokenAccount = await getAssociatedTokenAddress(USDC_MINT_PUBKEY, burnTokenOwner);
  const [custodyToken] = deriveCustodyTokenAccount(USDC_MINT_PUBKEY);
  const [eventAuthority] = deriveEventAuthorityAccount();
  const [messageSentEventDataAccount] = deriveMessageSentEventDataAccount(nonce);

  // Serialize instruction data using our custom serializer
  const instructionData = serializeDepositForBurnInstruction({
    amount,
    destinationDomain,
    mintRecipient,
    destinationCaller,
    maxFee,
    minFinalityThreshold,
  });

  // Add instruction discriminator (first 8 bytes)
  const discriminator = Buffer.from([174, 71, 188, 215, 250, 164, 80, 96]); // depositForBurn discriminator
  const finalData = Buffer.concat([discriminator, instructionData]);

  const instruction = new TransactionInstruction({
    programId: TOKEN_MESSENGER_MINTER_PROGRAM_ID,
    keys: [
      { pubkey: burnTokenOwner, isSigner: true, isWritable: false },
      { pubkey: burnTokenAccount, isSigner: false, isWritable: true },
      { pubkey: USDC_MINT_PUBKEY, isSigner: false, isWritable: true },
      { pubkey: localToken, isSigner: false, isWritable: true },
      { pubkey: tokenPair, isSigner: false, isWritable: false },
      { pubkey: tokenMessenger, isSigner: false, isWritable: false },
      { pubkey: remoteTokenMessenger, isSigner: false, isWritable: false },
      { pubkey: tokenMinter, isSigner: false, isWritable: true },
      { pubkey: custodyToken, isSigner: false, isWritable: true },
      { pubkey: eventAuthority, isSigner: false, isWritable: false },
      { pubkey: messageTransmitter, isSigner: false, isWritable: false },
      { pubkey: messageSentEventDataAccount, isSigner: false, isWritable: true },
      { pubkey: eventRentPayer, isSigner: true, isWritable: true },
      { pubkey: messageTransmitterEventAuthority, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
      { pubkey: MESSAGE_TRANSMITTER_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data: finalData,
  });

  return {
    instruction,
    messageSentEventDataAccount,
  };
}

// Get next available nonce
export async function getNextAvailableNonce(
  connection: Connection,
  sourceDomain: number = 5 // Solana domain
): Promise<BN> {
  const [messageTransmitter] = deriveMessageTransmitterAccount();
  
  try {
    const accountInfo = await connection.getAccountInfo(messageTransmitter);
    if (!accountInfo) {
      throw new Error('Message transmitter account not found');
    }

    // Parse the account data to get the next nonce
    // This is a simplified version - actual implementation would parse the account state
    const nonce = new BN(Math.floor(Math.random() * 1000000)); // Random nonce for demo
    return nonce;
  } catch (error) {
    console.error('Error getting next nonce:', error);
    // Return a random nonce as fallback
    return new BN(Math.floor(Math.random() * 1000000));
  }
}

// Create message sent event data account
export async function createMessageSentEventDataAccount(
  connection: Connection,
  nonce: BN,
  payer: PublicKey
): Promise<TransactionInstruction> {
  const [messageSentEventDataAccount] = deriveMessageSentEventDataAccount(nonce);
  
  // Calculate space needed for the account
  const space = 1000; // Enough space for message data
  const lamports = await connection.getMinimumBalanceForRentExemption(space);

  return SystemProgram.createAccount({
    fromPubkey: payer,
    newAccountPubkey: messageSentEventDataAccount,
    lamports,
    space,
    programId: MESSAGE_TRANSMITTER_PROGRAM_ID,
  });
}

// Helper to convert EVM address to 32-byte buffer
export function evmAddressToBuffer(evmAddress: string): Buffer {
  // Remove 0x prefix if present
  const cleanAddress = evmAddress.replace('0x', '');
  
  // Pad to 32 bytes (64 hex characters)
  const paddedAddress = '000000000000000000000000' + cleanAddress;
  
  return Buffer.from(paddedAddress, 'hex');
}

// Helper to generate message transmitter event authority
export function deriveMessageTransmitterEventAuthority(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('__event_authority')],
    MESSAGE_TRANSMITTER_PROGRAM_ID
  );
}
import { Connection, PublicKey, Transaction, SystemProgram, Keypair } from '@solana/web3.js';
import { getDomainKey, NameRegistryState, reverseLookup, createNameRegistry } from '@bonfida/spl-name-service';
import { getSolanaKeypair, getSolanaConnection } from './solanaRPC';

const connection = new Connection(
  import.meta.env.VITE_SOLANA_RPC_URL || "https://api.devnet.solana.com"
);

export async function checkSnsAvailability(domainName: string): Promise<boolean> {
  try {
    // Remove .sol suffix if present, as getDomainKey expects just the name
    const cleanDomainName = domainName.endsWith('.sol') 
      ? domainName.slice(0, -4) 
      : domainName;
      
    const { pubkey } = await getDomainKey(cleanDomainName);
    await NameRegistryState.retrieve(connection, pubkey);
    
    console.log(`Domain '${domainName}' is already taken.`);
    return false;
  } catch (error) {
    if (error instanceof Error && 
        (error.message.includes("Account does not exist") || 
         error.message.includes("Invalid name account"))) {
      console.log(`Domain '${domainName}' is available.`);
      return true;
    } else {
      console.error(`Error checking availability for '${domainName}':`, error);
      return false;
    }
  }
}

export async function resolveSnsAddress(domainName: string): Promise<string | null> {
  try {
    const cleanDomainName = domainName.endsWith('.sol') 
      ? domainName.slice(0, -4) 
      : domainName;
      
    const { pubkey } = await getDomainKey(cleanDomainName);
    const registry = await NameRegistryState.retrieve(connection, pubkey);
    return registry.owner.toBase58();
  } catch (error) {
    console.error(`Could not resolve SNS name '${domainName}':`, error);
    return null;
  }
}

export async function resolveSnsName(address: string): Promise<string | null> {
  try {
    const publicKey = new PublicKey(address);
    const domainName = await reverseLookup(connection, publicKey);
    return domainName;
  } catch (error) {
    console.error(`Could not reverse lookup address '${address}':`, error);
    return null;
  }
}

export async function registerSnsName(
  domainName: string,
  ownerAddress: string,
  web3authProvider: any
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  
  // ===========================================
  // MOCK IMPLEMENTATION FOR DEMO PURPOSES
  // ===========================================
  // This is a mock implementation that simulates realistic transaction timing
  // for demonstration purposes. Replace with the real implementation below when ready.
  
  try {
    const cleanDomainName = domainName.endsWith('.sol') 
      ? domainName.slice(0, -4) 
      : domainName;

    console.log(`🔄 Starting SNS registration for ${domainName}...`);
    console.log(`📍 SNS registration address: ${ownerAddress}`);

    // Simulate realistic transaction steps with delays
    console.log('💰 Checking account balance...');
    await new Promise(resolve => setTimeout(resolve, 800));

    console.log('🔍 Verifying domain availability...');
    await new Promise(resolve => setTimeout(resolve, 1500));

    console.log('📝 Creating domain registry instruction...');
    await new Promise(resolve => setTimeout(resolve, 1200));

    console.log('📤 Sending SNS registration transaction...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Generate a realistic mock transaction signature (base58 format for Solana)
    const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    const mockSignature = Array(88).fill(0).map(() => chars[Math.floor(Math.random() * chars.length)]).join('');
    console.log(`📋 SNS transaction submitted: ${mockSignature}`);

    console.log('⏳ Waiting for transaction confirmation...');
    await new Promise(resolve => setTimeout(resolve, 2800));

    console.log(`✅ SNS domain ${domainName} registered successfully!`);

    return {
      success: true,
      txHash: mockSignature,
    };
  } catch (error) {
    console.error(`❌ Error registering SNS name ${domainName}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }

  // ===========================================
  // REAL IMPLEMENTATION (CURRENTLY COMMENTED OUT)
  // ===========================================
  // Uncomment and use this when ready for actual blockchain interaction
  
  /*
  try {
    const cleanDomainName = domainName.endsWith('.sol') 
      ? domainName.slice(0, -4) 
      : domainName;

    // Get Solana keypair from Web3Auth provider using our utility function
    const keypair = await getSolanaKeypair(web3authProvider);
    const connection = getSolanaConnection();
    
    // Get the domain key for the name
    const { pubkey: nameAccountKey } = await getDomainKey(cleanDomainName);
    
    // Create the name registry instruction
    const space = 1000; // Allocate 1KB for the name registry
    const lamports = await connection.getMinimumBalanceForRentExemption(space);
    
    // Create instruction to register the domain
    const instruction = await createNameRegistry(
      connection,
      cleanDomainName,
      space,
      keypair.publicKey,
      keypair.publicKey // payerKey - same as owner for simplicity
    );

    // Create transaction
    const transaction = new Transaction().add(instruction);
    
    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = keypair.publicKey;

    // Sign transaction with the derived keypair
    transaction.sign(keypair);
    
    // Send the signed transaction
    const signature = await connection.sendRawTransaction(transaction.serialize());
    
    // Confirm transaction
    const confirmation = await connection.confirmTransaction(signature);

    return {
      success: !confirmation.value.err,
      txHash: signature,
    };
  } catch (error) {
    console.error(`Error registering SNS name ${domainName}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
  */
}
import { Connection, PublicKey } from '@solana/web3.js';
import { getDomainKey, NameRegistryState, reverseLookup } from '@bonfida/spl-name-service';

const connection = new Connection(
  import.meta.env.VITE_SOLANA_RPC_URL || "https://api.devnet.solana.com"
);

export async function checkSnsAvailability(domainName: string): Promise<boolean> {
  try {
    const { pubkey } = await getDomainKey(domainName);
    await NameRegistryState.retrieve(connection, pubkey);
    
    console.log(`Domain '${domainName}' is already taken.`);
    return false;
  } catch (error) {
    if (error instanceof Error && error.message.includes("Account does not exist")) {
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
    const { pubkey } = await getDomainKey(domainName);
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
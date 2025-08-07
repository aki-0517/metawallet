import { createPublicClient, http } from 'viem';
import { sepolia } from 'viem/chains';
import { normalize, namehash } from 'viem/ens';

export const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(),
});

export async function checkEnsAvailability(name: string): Promise<boolean> {
  try {
    // Use readContract to directly call ENS Registry
    const owner = await publicClient.readContract({
      address: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e', // ENS Registry address
      abi: [
        {
          inputs: [{ name: 'node', type: 'bytes32' }],
          name: 'owner',
          outputs: [{ name: '', type: 'address' }],
          stateMutability: 'view',
          type: 'function',
        },
      ],
      functionName: 'owner',
      args: [namehash(normalize(name))],
    });
    
    return owner === '0x0000000000000000000000000000000000000000';
  } catch (error) {
    console.error(`Error checking availability for ${name}:`, error);
    return true;
  }
}

export async function resolveEnsAddress(name: string): Promise<string | null> {
  try {
    const address = await publicClient.getEnsAddress({
      name: normalize(name),
    });
    return address;
  } catch (error) {
    console.error(`Could not resolve ENS name ${name}:`, error);
    return null;
  }
}

export async function resolveEnsName(address: `0x${string}`): Promise<string | null> {
  try {
    const name = await publicClient.getEnsName({
      address,
    });
    return name;
  } catch (error) {
    console.error(`Could not resolve address ${address}:`, error);
    return null;
  }
}
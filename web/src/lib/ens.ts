import { createPublicClient, createWalletClient, http, custom } from 'viem';
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

export async function registerEnsName(
  name: string,
  provider: any,
  duration: number = 31536000 // 1 year in seconds
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const normalizedName = normalize(name);
    
    // Get the account address from the EVM provider
    const accounts = await provider.request({
      method: "eth_accounts",
    });
    
    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts available');
    }
    
    const address = accounts[0];

    // Create wallet client from the provider with account
    const walletClient = createWalletClient({
      account: address,
      chain: sepolia,
      transport: custom(provider),
    });

    // ENS Registry Registrar Controller address on Sepolia
    const registrarControllerAddress = '0xFED6a969AaA60E4961FCD3EBF1A2e8913ac65B72';

    // Get the registration price (simplified - in real implementation you'd call the price oracle)
    const price = BigInt('1000000000000000'); // 0.001 ETH in wei

    // Register the name (simplified implementation)
    // In a real implementation, you would:
    // 1. Make a commitment
    // 2. Wait for the commitment period
    // 3. Register with proof
    
    const hash = await walletClient.writeContract({
      address: registrarControllerAddress,
      abi: [
        {
          inputs: [
            { name: 'name', type: 'string' },
            { name: 'owner', type: 'address' },
            { name: 'duration', type: 'uint256' },
            { name: 'resolver', type: 'address' },
            { name: 'addr', type: 'address' }
          ],
          name: 'registerWithConfig',
          outputs: [],
          stateMutability: 'payable',
          type: 'function',
        },
      ],
      functionName: 'registerWithConfig',
      args: [
        normalizedName.replace('.eth', ''),
        address,
        BigInt(duration),
        '0x231b0Ee14048e9dCcD1d247744d114a4EB5E8E63', // Public resolver on Sepolia
        address
      ],
      value: price,
    });

    // Wait for transaction confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    return {
      success: receipt.status === 'success',
      txHash: hash,
    };
  } catch (error) {
    console.error(`Error registering ENS name ${name}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
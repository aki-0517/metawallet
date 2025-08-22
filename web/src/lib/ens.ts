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
  
  // ===========================================
  // MOCK IMPLEMENTATION FOR DEMO PURPOSES
  // ===========================================
  // This is a mock implementation that simulates realistic transaction timing
  // for demonstration purposes. Replace with the real implementation below when ready.
  
  try {
    console.log(`🔄 Starting ENS registration for ${name}...`);
    
    // Get the account address from the EVM provider
    const accounts = await provider.request({
      method: "eth_accounts",
    });
    
    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts available');
    }
    
    const address = accounts[0];
    console.log(`📍 ENS registration address: ${address}`);

    // Simulate realistic transaction steps with delays
    console.log('⛽ Estimating gas for ENS registration...');
    await new Promise(resolve => setTimeout(resolve, 1200));

    console.log('🔒 Creating commitment for ENS registration...');
    await new Promise(resolve => setTimeout(resolve, 2500));

    console.log('📤 Sending ENS registration transaction...');
    await new Promise(resolve => setTimeout(resolve, 1800));

    // Generate a realistic mock transaction hash
    const mockTxHash = '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');
    console.log(`📋 ENS transaction submitted: ${mockTxHash}`);

    console.log('⏳ Waiting for transaction confirmation...');
    await new Promise(resolve => setTimeout(resolve, 3500));

    console.log(`✅ ENS domain ${name} registered successfully!`);

    return {
      success: true,
      txHash: mockTxHash,
    };
  } catch (error) {
    console.error(`❌ Error registering ENS name ${name}:`, error);
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
    const registrarControllerAddress = '0xfb3cE5D01e0f33f41DbB39035dB9745962F1f968';

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
        '0xE99638b40E4Fff0129D56f03b55b6bbC4BBE49b5', // Public resolver on Sepolia
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
  */
}
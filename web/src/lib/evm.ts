import type { Address, Hex } from "viem";
import { createPublicClient, encodeFunctionData, formatUnits, http, encodePacked } from "viem";
import { sepolia } from "viem/chains";
import { signPermit } from "./permit";

const sepoliaRpc: string | undefined = (import.meta as any).env?.VITE_SEPOLIA_RPC_URL || undefined;

const ERC20_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "balance", type: "uint256" }],
  },
  {
    name: "decimals",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "decimals", type: "uint8" }],
  },
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "success", type: "bool" }],
  },
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "success", type: "bool" }],
  },
];

const publicClient = createPublicClient({
  chain: sepolia,
  transport: sepoliaRpc ? http(sepoliaRpc) : http(),
});

export async function getErc20Balance(params: {
  tokenAddress: Address;
  walletAddress: Address;
}): Promise<{ amount: number; decimals: number }>
{
  const { tokenAddress, walletAddress } = params;

  const [rawBalance, decimals] = await Promise.all([
    publicClient.readContract({
      address: tokenAddress,
      abi: ERC20_ABI as any,
      functionName: "balanceOf",
      args: [walletAddress],
    }) as Promise<bigint>,
    publicClient.readContract({
      address: tokenAddress,
      abi: ERC20_ABI as any,
      functionName: "decimals",
      args: [],
    }) as Promise<number>,
  ]);

  const amount = Number(formatUnits(rawBalance, decimals));
  return { amount, decimals };
}

export async function getEvmBalances(params: {
  walletAddress: Address;
  usdcAddress?: Address;
}): Promise<{ usdc: number }>
{
  const { walletAddress, usdcAddress } = params;
  console.log('getEvmBalances called with:', { walletAddress, usdcAddress });
  
  let usdc = 0;

  if (usdcAddress) {
    try {
      console.log('Fetching ERC20 balance for USDC...');
      const { amount } = await getErc20Balance({ tokenAddress: usdcAddress, walletAddress });
      console.log('ERC20 balance result:', { amount });
      usdc = amount;
    } catch (e) {
      console.error("Failed to load USDC balance:", e);
    }
  } else {
    console.warn('No USDC address provided');
  }
  
  console.log('Final EVM balances:', { usdc });
  return { usdc };
}

export async function sendErc20(params: {
  provider: any; // Can be EthereumPrivateKeyProvider or Smart Account provider
  tokenAddress: Address;
  from: Address;
  to: Address;
  amountTokens: string; // decimal string (e.g., "12.34")
}): Promise<string> {
  const { provider, tokenAddress, from, to, amountTokens } = params;

  const decimals = await publicClient.readContract({
    address: tokenAddress,
    abi: ERC20_ABI as any,
    functionName: "decimals",
    args: [],
  }) as number;

  const [intPart, fracPartRaw = ""] = amountTokens.split(".");
  const fracPart = (fracPartRaw + "0".repeat(decimals)).slice(0, decimals);
  const integerStr = `${intPart}${fracPart}`.replace(/^0+/, "");
  const amountWei = BigInt(integerStr || "0");

  const data: Hex = encodeFunctionData({
    abi: ERC20_ABI as any,
    functionName: "transfer",
    args: [to, amountWei],
  });

  const txParams = {
    from,
    to: tokenAddress,
    data,
    value: "0x0", // Add explicit value for smart accounts
  } as any;

  const hash = await provider.request({
    method: "eth_sendTransaction",
    params: [txParams],
  }) as string;

  return hash;
}

// New function for smart account batch transactions
export async function sendErc20Batch(params: {
  smartAccount: any;
  bundlerClient: any;
  transactions: Array<{
    tokenAddress: Address;
    to: Address;
    amountTokens: string;
  }>;
}): Promise<string> {
  const { smartAccount, bundlerClient, transactions } = params;

  // Prepare all transaction calls
  const calls = await Promise.all(
    transactions.map(async (tx) => {
      const decimals = await publicClient.readContract({
        address: tx.tokenAddress,
        abi: ERC20_ABI as any,
        functionName: "decimals",
        args: [],
      }) as number;

      const [intPart, fracPartRaw = ""] = tx.amountTokens.split(".");
      const fracPart = (fracPartRaw + "0".repeat(decimals)).slice(0, decimals);
      const integerStr = `${intPart}${fracPart}`.replace(/^0+/, "");
      const amountWei = BigInt(integerStr || "0");

      const data: Hex = encodeFunctionData({
        abi: ERC20_ABI as any,
        functionName: "transfer",
        args: [tx.to, amountWei],
      });

      return {
        to: tx.tokenAddress,
        value: 0n,
        data,
      };
    })
  );

  // Send batch transaction using bundler client
  const userOpHash = await bundlerClient.sendUserOperation({
    account: smartAccount,
    calls,
  });

  // Wait for the user operation receipt to get the transaction hash
  const receipt = await bundlerClient.waitForUserOperationReceipt({
    hash: userOpHash,
  });

  return receipt.receipt.transactionHash;
}

// New function for USDC gas payment using Circle Paymaster
export async function sendErc20WithUsdcGas(params: {
  smartAccount: any;
  bundlerClient: any;
  tokenAddress: Address;
  to: Address;
  amountTokens: string;
}): Promise<string> {
  const { smartAccount, bundlerClient, tokenAddress, to, amountTokens } = params;

  const decimals = await publicClient.readContract({
    address: tokenAddress,
    abi: ERC20_ABI as any,
    functionName: "decimals",
    args: [],
  }) as number;

  const [intPart, fracPartRaw = ""] = amountTokens.split(".");
  const fracPart = (fracPartRaw + "0".repeat(decimals)).slice(0, decimals);
  const integerStr = `${intPart}${fracPart}`.replace(/^0+/, "");
  const amountWei = BigInt(integerStr || "0");

  // Circle Paymaster configuration (Sepolia testnet addresses from docs)
  const paymasterAddress = "0x3BA9A96eE3eFf3A69E2B18886AcF52027EFF8966"; // Circle Paymaster v0.8 on Sepolia
  const usdcAddress = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"; // USDC on Sepolia
  
  // Create the transfer call
  const transferCall = {
    to: tokenAddress,
    value: 0n,
    abi: ERC20_ABI,
    functionName: "transfer",
    args: [to, amountWei],
  };

  // Create permit for USDC allowance to paymaster
  const permitAmount = 10000000n; // 10 USDC allowance for gas fees
  
  try {
    const permitSignature = await signPermit({
      tokenAddress: usdcAddress,
      client: publicClient,
      account: smartAccount,
      spenderAddress: paymasterAddress,
      permitAmount: permitAmount,
    });

    const paymasterData = encodePacked(
      ["uint8", "address", "uint256", "bytes"],
      [0, usdcAddress as Address, permitAmount, permitSignature],
    );

    // Create approval call for paymaster to spend USDC for gas
    const approvalCall = {
      to: usdcAddress,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [paymasterAddress, permitAmount],
    };

    // Send batch transaction: approve USDC for gas + transfer
    const userOpHash = await bundlerClient.sendUserOperation({
      account: smartAccount,
      calls: [approvalCall, transferCall],
      paymaster: paymasterAddress,
      paymasterData,
      paymasterVerificationGasLimit: 200000n,
      paymasterPostOpGasLimit: 15000n,
    });

    // Wait for the user operation receipt to get the transaction hash
    const receipt = await bundlerClient.waitForUserOperationReceipt({
      hash: userOpHash,
    });

    return receipt.receipt.transactionHash;
  } catch (error) {
    console.error("Failed to send transaction with USDC gas:", error);
    throw error;
  }
}


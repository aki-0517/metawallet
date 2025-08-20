import type { EthereumPrivateKeyProvider } from "@web3auth/ethereum-provider";
import type { Address, Hex } from "viem";
import { createPublicClient, encodeFunctionData, formatUnits, http } from "viem";
import { sepolia } from "viem/chains";

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
  let usdc = 0;

  if (usdcAddress) {
    try {
      const { amount } = await getErc20Balance({ tokenAddress: usdcAddress, walletAddress });
      usdc = amount;
    } catch (e) {
      console.warn("Failed to load USDC balance:", e);
    }
  }
  return { usdc };
}

export async function sendErc20(params: {
  provider: EthereumPrivateKeyProvider;
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
  } as any;

  const hash = await provider.request({
    method: "eth_sendTransaction",
    params: [txParams],
  }) as string;

  return hash;
}


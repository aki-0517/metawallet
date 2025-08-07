import { Web3Auth } from "@web3auth/modal";
import { CHAIN_NAMESPACES, WEB3AUTH_NETWORK } from "@web3auth/base";
import { EthereumPrivateKeyProvider } from "@web3auth/ethereum-provider";
import { SolanaPrivateKeyProvider } from "@web3auth/solana-provider";

const clientId = import.meta.env.VITE_WEB3AUTH_CLIENT_ID || "YOUR_WEB3AUTH_CLIENT_ID_HERE";

export const web3auth = new Web3Auth({
  clientId,
  web3AuthNetwork: WEB3AUTH_NETWORK.SAPPHIRE_DEVNET,
  chainConfig: {
    chainNamespace: CHAIN_NAMESPACES.EIP155,
    chainId: "0xaa36a7", // Sepolia Testnet
    rpcTarget: import.meta.env.VITE_SEPOLIA_RPC_URL || "https://rpc.sepolia.org",
    displayName: "Sepolia Testnet",
    blockExplorerUrl: "https://sepolia.etherscan.io",
    ticker: "ETH",
    tickerName: "Ethereum",
  },
  uiConfig: {
    appName: import.meta.env.VITE_APP_NAME || "Metawallet",
    appLogo: import.meta.env.VITE_APP_LOGO || "https://web3auth.io/images/w3a-L-Favicon-1.svg",
    theme: "dark",
    primaryButtonProvider: "google",
  },
});

export async function initializeWeb3Auth() {
  try {
    await web3auth.initModal();
    console.log("Web3Auth initialized successfully");
  } catch (error) {
    console.error("Error initializing Web3Auth:", error);
    throw error;
  }
}

export async function login(): Promise<{
  providers: {
    evmProvider?: EthereumPrivateKeyProvider;
    solanaProvider?: SolanaPrivateKeyProvider;
  };
  user: any;
} | null> {
  try {
    const web3authProvider = await web3auth.connect();
    if (!web3authProvider) {
      console.error("Web3Auth provider not available.");
      return null;
    }

    console.log("Logged in successfully!");

    // Setup EVM provider
    const evmProvider = new EthereumPrivateKeyProvider({
      config: {
        chainConfig: {
          chainNamespace: CHAIN_NAMESPACES.EIP155,
          chainId: "0xaa36a7", // Sepolia Testnet
          rpcTarget: import.meta.env.VITE_SEPOLIA_RPC_URL || "https://rpc.sepolia.org",
        },
      },
    });
    await evmProvider.setupProvider(web3authProvider);

    // Setup Solana provider
    const solanaProvider = new SolanaPrivateKeyProvider({
      config: {
        chainConfig: {
          chainNamespace: CHAIN_NAMESPACES.SOLANA,
          chainId: "0x2", // Solana Devnet
          rpcTarget: import.meta.env.VITE_SOLANA_RPC_URL || "https://api.devnet.solana.com",
        },
      },
    });
    await solanaProvider.setupProvider(web3authProvider);

    // Get user info
    const user = await web3auth.getUserInfo();

    return {
      providers: { evmProvider, solanaProvider },
      user,
    };
  } catch (error) {
    console.error("Error logging in:", error);
    return null;
  }
}

export async function logout() {
  try {
    await web3auth.logout();
    console.log("Logged out successfully!");
  } catch (error) {
    console.error("Error logging out:", error);
  }
}
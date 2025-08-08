import { Web3Auth } from "@web3auth/modal";
import { CHAIN_NAMESPACES, WEB3AUTH_NETWORK } from "@web3auth/base";
import { EthereumPrivateKeyProvider } from "@web3auth/ethereum-provider";
import { SolanaPrivateKeyProvider } from "@web3auth/solana-provider";

const clientId = import.meta.env.VITE_WEB3AUTH_CLIENT_ID || "YOUR_WEB3AUTH_CLIENT_ID_HERE";

console.log("Web3Auth Client ID:", clientId);
console.log("Web3Auth constructor:", Web3Auth);

// Track initialization state
let isInitializing = false;
let initializationPromise: Promise<void> | null = null;

// Create the Ethereum private key provider
const privateKeyProvider = new EthereumPrivateKeyProvider({
  config: {
    chainConfig: {
      chainNamespace: CHAIN_NAMESPACES.EIP155,
      chainId: "0xaa36a7", // Sepolia Testnet
      rpcTarget: import.meta.env.VITE_SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com",
      displayName: "Sepolia Testnet",
      blockExplorerUrl: "https://sepolia.etherscan.io",
      ticker: "ETH",
      tickerName: "Ethereum",
    },
  },
});

export const web3auth = new Web3Auth({
  clientId,
  web3AuthNetwork: WEB3AUTH_NETWORK.SAPPHIRE_DEVNET,
  privateKeyProvider,
  uiConfig: {
    appName: import.meta.env.VITE_APP_NAME || "Metawallet",
    theme: {
      primary: "#768729"
    },
  },
});

export async function initializeWeb3Auth() {
  // If already initializing, wait for it to complete
  if (isInitializing && initializationPromise) {
    console.log("Web3Auth initialization already in progress, waiting...");
    return initializationPromise;
  }
  
  // If already ready, no need to initialize again
  if (web3auth.status === 'ready') {
    console.log("Web3Auth already initialized");
    return Promise.resolve();
  }
  
  isInitializing = true;
  
  initializationPromise = (async () => {
    try {
      console.log("web3auth instance:", web3auth);
      console.log("Available methods:", Object.getOwnPropertyNames(Object.getPrototypeOf(web3auth)));
      
      // Detect and handle wallet conflicts
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        const ethereum = (window as any).ethereum;
        console.warn("⚠️  Multiple wallet providers detected. This may cause conflicts.");
        console.warn("💡 If you experience issues, try disabling other wallet extensions temporarily.");
        
        // Check if MetaMask is specifically detected
        if (ethereum.isMetaMask) {
          console.warn("🦊 MetaMask detected. Web3Auth will work alongside it.");
        }
        
        // Handle provider injection conflicts more gracefully
        try {
          // Store original ethereum provider before Web3Auth modifies it
          if (!(window as any)._originalEthereum) {
            (window as any)._originalEthereum = ethereum;
          }
        } catch (providerError) {
          console.warn("Provider conflict detected, continuing with Web3Auth initialization");
        }
      }
      
      await web3auth.initModal();
      console.log("✅ Web3Auth initialized successfully");
    } catch (error) {
      console.error("❌ Error initializing Web3Auth:", error);
      
      // Provide specific guidance for common errors
      if (error instanceof Error) {
        if (error.message.includes('Failed to connect')) {
          console.error("💡 Try refreshing the page or disabling conflicting wallet extensions");
        } else if (error.message.includes('CLIENT_ID')) {
          console.error("💡 Check that VITE_WEB3AUTH_CLIENT_ID is set in your environment variables");
        }
      }
      
      throw error;
    } finally {
      isInitializing = false;
      initializationPromise = null;
    }
  })();
  
  return initializationPromise;
}

export async function login(): Promise<{
  providers: {
    evmProvider?: EthereumPrivateKeyProvider;
    solanaProvider?: SolanaPrivateKeyProvider;
    rawProvider?: any;
  };
  user: any;
} | null> {
  try {
    // Clear any existing session to force fresh authentication
    if (web3auth.connected) {
      await web3auth.logout();
    }
    
    const web3authProvider = await web3auth.connect();
    if (!web3authProvider) {
      console.error("Web3Auth provider not available.");
      return null;
    }

    console.log("Logged in successfully!");

    // Get Ethereum private key from Web3Auth
    const ethPrivateKey = await web3authProvider.request({
      method: "eth_private_key",
    }) as string;

    // Setup EVM provider
    const evmProvider = new EthereumPrivateKeyProvider({
      config: {
        chainConfig: {
          chainNamespace: CHAIN_NAMESPACES.EIP155,
          chainId: "0xaa36a7", // Sepolia Testnet
          rpcTarget: import.meta.env.VITE_SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com",
        },
      },
    });
    await evmProvider.setupProvider(ethPrivateKey);

    // Get Solana private key from Web3Auth
    let solanaProvider: SolanaPrivateKeyProvider | undefined;
    
    try {
      // Convert Ethereum private key to Solana private key format
      const solanaPrivateKey = ethPrivateKey; // Use same key for Solana
      
      solanaProvider = new SolanaPrivateKeyProvider({
        config: {
          chainConfig: {
            chainNamespace: CHAIN_NAMESPACES.SOLANA,
            chainId: "0x2", // Solana Devnet
            rpcTarget: import.meta.env.VITE_SOLANA_RPC_URL || "https://api.devnet.solana.com",
          },
        },
      });
      
      await solanaProvider.setupProvider(solanaPrivateKey);
    } catch (solanaError) {
      console.warn("Failed to setup Solana provider:", solanaError);
      solanaProvider = undefined;
    }

    // Get user info
    const user = await web3auth.getUserInfo();

    return {
      providers: { 
        evmProvider, 
        solanaProvider: solanaProvider, // may be undefined
        rawProvider: web3authProvider,
      },
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
import { Web3Auth } from "@web3auth/modal";
import { CHAIN_NAMESPACES, WEB3AUTH_NETWORK } from "@web3auth/base";
import { EthereumPrivateKeyProvider } from "@web3auth/ethereum-provider";
import { getSolanaAccount } from "./solanaRPC";

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

const pimlicoApiKey = import.meta.env.VITE_PIMLICO_API_KEY;

export const web3auth = new Web3Auth({
  clientId,
  web3AuthNetwork: WEB3AUTH_NETWORK.SAPPHIRE_DEVNET,
  privateKeyProvider,
  accountAbstractionConfig: {
    smartAccountType: "metamask",
    chains: [
      {
        chainId: "0xaa36a7", // Sepolia Testnet
        bundlerConfig: {
          url: `https://api.pimlico.io/v2/sepolia/rpc?apikey=${pimlicoApiKey}`,
        },
      },
    ],
  },
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

// Check if user is already connected and restore session
export async function checkExistingSession(): Promise<{
  providers: {
    evmProvider?: any;
    rawProvider?: any;
    smartAccountProvider?: any;
  };
  user: any;
  solanaAddress?: string;
  smartAccountAddress?: string;
  eoaAddress?: string;
} | null> {
  try {
    if (web3auth.connected) {
      console.log("Found existing session, restoring...");
      
      const web3authProvider = web3auth.provider;
      if (!web3authProvider) {
        console.error("Web3Auth provider not available in existing session.");
        return null;
      }

      // Get smart account provider from Web3Auth
      const smartAccountProvider = web3auth.provider;
      
      // Get account abstraction provider for smart account features
      const accountAbstractionProvider = web3auth.accountAbstractionProvider;

      // Get addresses - first is smart account, second is EOA
      let smartAccountAddress: string | undefined;
      let eoaAddress: string | undefined;

      if (smartAccountProvider) {
        try {
          // Request addresses from smart account provider
          const addresses = await smartAccountProvider.request({
            method: "eth_accounts"
          }) as string[];
          
          if (addresses && addresses.length > 0) {
            smartAccountAddress = addresses[0]; // Smart account address
            eoaAddress = addresses[1]; // EOA address (if available)
          }
          
          console.log("Restored Smart Account Address:", smartAccountAddress);
          console.log("Restored EOA Address:", eoaAddress);
        } catch (addressError) {
          console.error("Failed to get smart account addresses during restore:", addressError);
        }
      }

      // Get Solana address using proper key derivation
      let solanaAddress: string | undefined;
      
      try {
        // Use the research-based approach for Solana key derivation
        solanaAddress = await getSolanaAccount(web3authProvider);
        console.log("Restored Solana address:", solanaAddress);
      } catch (solanaError) {
        console.warn("Failed to restore Solana address:", solanaError);
        solanaAddress = undefined;
      }

      // Get user info
      const user = await web3auth.getUserInfo();

      return {
        providers: { 
          evmProvider: smartAccountProvider, // Use smart account provider as EVM provider
          rawProvider: web3authProvider,
          smartAccountProvider: accountAbstractionProvider,
        },
        user,
        solanaAddress,
        smartAccountAddress,
        eoaAddress,
      };
    }
    return null;
  } catch (error) {
    console.error("Error checking existing session:", error);
    return null;
  }
}

export async function login(): Promise<{
  providers: {
    evmProvider?: any;
    rawProvider?: any;
    smartAccountProvider?: any;
  };
  user: any;
  solanaAddress?: string;
  smartAccountAddress?: string;
  eoaAddress?: string;
} | null> {
  try {
    // Check if user is already connected first
    const existingSession = await checkExistingSession();
    if (existingSession) {
      console.log("Using existing session");
      return existingSession;
    }
    
    // If not connected, start fresh authentication
    const web3authProvider = await web3auth.connect();
    if (!web3authProvider) {
      console.error("Web3Auth provider not available.");
      return null;
    }

    console.log("Logged in successfully!");

    // Get smart account provider from Web3Auth
    const smartAccountProvider = web3auth.provider;
    
    // Get account abstraction provider for smart account features
    const accountAbstractionProvider = web3auth.accountAbstractionProvider;

    // Get addresses - first is smart account, second is EOA
    let smartAccountAddress: string | undefined;
    let eoaAddress: string | undefined;

    if (smartAccountProvider) {
      try {
        // Request addresses from smart account provider
        const addresses = await smartAccountProvider.request({
          method: "eth_accounts"
        }) as string[];
        
        if (addresses && addresses.length > 0) {
          smartAccountAddress = addresses[0]; // Smart account address
          eoaAddress = addresses[1]; // EOA address (if available)
        }
        
        console.log("Smart Account Address:", smartAccountAddress);
        console.log("EOA Address:", eoaAddress);
      } catch (addressError) {
        console.error("Failed to get smart account addresses:", addressError);
      }
    }

    // Get Solana address using proper key derivation
    let solanaAddress: string | undefined;
    
    try {
      // Use the research-based approach for Solana key derivation
      solanaAddress = await getSolanaAccount(web3authProvider);
      console.log("Solana address generated:", solanaAddress);
    } catch (solanaError) {
      console.warn("Failed to get Solana address:", solanaError);
      solanaAddress = undefined;
    }

    // Get user info
    const user = await web3auth.getUserInfo();

    return {
      providers: { 
        evmProvider: smartAccountProvider, // Use smart account provider as EVM provider
        rawProvider: web3authProvider,
        smartAccountProvider: accountAbstractionProvider,
      },
      user,
      solanaAddress,
      smartAccountAddress,
      eoaAddress,
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
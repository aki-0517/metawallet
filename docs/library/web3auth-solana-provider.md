Solana Private Key Provider for SFA JS SDK
@web3auth/solana-provider
The Solana Blockchain Provider is basically a wrapper around the Solana JSON RPC API making it easier to interact with the Solana Blockchain.

In this section we'll explore more about how you can use this provider with our SDKs.

Installation
@web3auth/solana-provider
npm install --save @web3auth/solana-provider


Initialisation
Import the SolanaPrivateKeyProvider class from @web3auth/solana-provider.

import { SolanaPrivateKeyProvider } from "@web3auth/solana-provider";


Assign the SolanaPrivateKeyProvider class to a variable
After creating your Web3Auth instance, you need to initialize the Torus Wallet UI Plugin and add it to a class for further usage.

const privateKeyProvider = new SolanaPrivateKeyProvider({ config: SolanaPrivKeyProviderConfig });


This constructor takes an object with a config of SolanaPrivKeyProviderConfig as input.

Arguments
SolanaPrivKeyProviderConfig

export interface SolanaPrivKeyProviderConfig extends BaseProviderConfig {
  chainConfig: Omit<CustomChainConfig, "chainNamespace">;
}
export type CustomChainConfig = {
  chainNamespace: ChainNamespaceType;
  /**
   * The chain id of the chain
   */
  chainId: string;
  /**
   * RPC target Url for the chain
   */
  rpcTarget: string;
  /**
   * web socket target Url for the chain
   */
  wsTarget?: string;
  /**
   * Display Name for the chain
   */
  displayName: string;
  /**
   * Url of the block explorer
   */
  blockExplorer: string;
  /**
   * Default currency ticker of the network (e.g: ETH)
   */
  ticker: string;
  /**
   * Name for currency ticker (e.g: `Ethereum`)
   */
  tickerName: string;
  /**
   * Number of decimals for the currency ticker (e.g: 18)
   */
  decimals?: number;
};
export interface BaseProviderConfig extends BaseConfig {
  chainConfig: Partial<CustomChainConfig>;
  networks?: Record<string, CustomChainConfig>;
  skipLookupNetwork?: boolean;
}
export interface BaseConfig {
  /**
   *  Determines if this controller is enabled
   */
  disabled?: boolean;
}


Getting the chainConfig
Mainnet
Testnet
Chain Namespace: SOLANA
Chain ID: 0x1 (Use 0x1 for Mainnet, 0x2 for Testnet, 0x3 for Devnet)
Public RPC URL: https://api.mainnet-beta.solana.com (Avoid using public rpcTarget in production, use services like Infura)
Display Name: Solana Mainnet
Block Explorer Link: https://explorer.solana.com
Ticker: SOL
Ticker Name: Solana
Logo: https://images.toruswallet.io/solana.svg
Initializing and instantiating the Web3Auth SDK
Post V10 release, Web3Auth PnP Web SDK does not need any additional setup on the code side for Solana. All is handled on the Dashboard.

import { Web3Auth, WEB3AUTH_NETWORK } from "@web3auth/modal";

const web3AuthOptions: Web3AuthOptions = {
  clientId,
  web3AuthNetwork: WEB3AUTH_NETWORK.SAPPHIRE_MAINNET,
};


Using the provider
On connection, you can use web3auth.provider as a solana provider with @web3auth/solana-provider along with @solana/web3.js library.

import { SolanaWallet } from "@web3auth/solana-provider";

const solanaWallet = new SolanaWallet(provider);


Once you have setup the provider, you can use the standard functions in the solana/web3.js library to get user's account, perform transaction, sign a message etc. Here we have listed a few examples to help you get started there:

info
All the RPC methods which are available by default on Solana Blockchain are also available on the Solana Provider. Although, for the case of phantom adapter they are not available.

You can refer to standard RPC calls for Solana here

tip
Please refer to our Solana Connect Blockchain Reference for more information.


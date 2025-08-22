In this guide, we'll explore how to integrate Web3Auth's embedded wallets with Solana Pay to create a seamless payment experience for your users. By combining Web3Auth's familiar Web2-like social logins with Solana Pay's QR code functionality, you can enable users to make payments directly from their Web3Auth-powered embedded wallet.

As an overview, this integration allows users to:

Log in using familiar Web2 social providers (Google, Apple, etc.)
Generate Solana Pay QR codes for transactions
Make payments using their Web3Auth embedded wallet
For those who want to skip straight to the code, you can find the complete implementation examples in our GitHub repository.

This guide follows the implementation demonstrated in our livestream:


How to set up Web3Auth Dashboard
If you haven't already, sign up on the Web3Auth platform. It is free and gives you access to the Web3Auth's base plan. After the basic setup, explore other features and functionalities offered by the Web3Auth Dashboard. It includes custom verifiers, whitelabeling, analytics, and more. Head to Web3Auth's documentation page for detailed instructions on setting up the Web3Auth Dashboard.

Prerequisites and Setup
Before diving into the code, ensure you have the necessary libraries installed and your Web3Auth project configured.

Installation
You'll need the following libraries in your project:

@solana/pay: The core Solana Pay protocol library.
bignumber.js: For accurate handling of large numbers, especially when dealing with token amounts.
@solana/web3.js: For interacting with the Solana blockchain, such as fetching balances or constructing transactions.
npm
Yarn
pnpm
Bun
npm install @solana/pay bignumber.js @solana/web3.js


Dashboard Configuration
Web3Auth's embedded wallets enable users to log in using familiar Web2 social logins by using Shamir Secret Sharing (MPC) to ensure the wallet key is distributed and non-custodial.

Create a Project: Go to the Web3Auth dashboard and create a new project.
Copy Client ID: Once created, copy your Client ID from the dashboard. This ID is crucial for initializing the Web3Auth SDK.
Enable Solana Chain: In the dashboard, navigate to "Chains and Network" and enable Solana, Solana Devnet and Solana Testnet. Ensure all the RPC URLs are configured.
Integrating Web3Auth in React
Once you have set up the Web3Auth Dashboard and created a new project, it's time to integrate Web3Auth in your React application. For the implementation, we'll use the @web3auth/modal SDK. This SDK facilitates integration with Web3Auth, allowing you to easily manage embedded wallets in your React application.

Initialize Web3Auth Provider
Wrap your application components with a Web3AuthProvider to configure Web3Auth with your Client ID.

src/main.tsx
import "./index.css";

import ReactDOM from "react-dom/client";
import { Web3AuthProvider } from "@web3auth/modal/react";
import web3AuthContextConfig from "./web3authContext";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <Web3AuthProvider config={web3AuthContextConfig}>
    <App />
  </Web3AuthProvider>
);


src/web3authContext.tsx
import { WEB3AUTH_NETWORK } from "@web3auth/modal";
import { type Web3AuthContextConfig } from "@web3auth/modal/react";

// Dashboard Registration
const clientId =
  "BFcLTVqWlTSpBBaELDPSz4_LFgG8Nf8hEltPlf3QeUG_88GDrQSw82fSjjYj5x4F3ys3ghMq8-InU7Azx7NbFSs"; // get from https://dashboard.web3auth.io

// Instantiate SDK
const web3AuthContextConfig: Web3AuthContextConfig = {
  web3AuthOptions: {
    clientId,
    web3AuthNetwork: WEB3AUTH_NETWORK.SAPPHIRE_DEVNET,
  },
};

export default web3AuthContextConfig;


Accessing Wallet Information & Fetching User Balance
Once Web3Auth is initialized, you can access wallet information and user details through the Web3Auth Solana hooks.

src/components/getBalance.tsx
import { useSolanaWallet } from "@web3auth/modal/react/solana";
import {
  LAMPORTS_PER_SOL,
  PublicKey,
} from "@solana/web3.js";
import { useEffect, useState } from "react";

export function Balance() {
  const { accounts, connection } = useSolanaWallet();
  const [balance, setBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = async () => {
    if (connection && accounts && accounts.length > 0) {
      try {
        setIsLoading(true);
        setError(null);
        const publicKey = new PublicKey(accounts[0]);
        const balance = await connection.getBalance(publicKey);
        setBalance(balance);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchBalance();
  }, [connection, accounts]);

  return (
    <div>
      <h2>Balance</h2>
      <div>
        {balance !== null && `${balance / LAMPORTS_PER_SOL} SOL`}
      </div>
        {isLoading && <span className="loading">Loading...</span>}
        {error && <span className="error">Error: {error}</span>}
      <button onClick={fetchBalance} type="submit" className="card">
          Fetch Balance
      </button>
    </div>
  )
}


Integrating Solana Pay
Solana Pay enables the generation of transaction requests, typically as QR codes, for direct payments from Solana wallets. This section will show you how to create and display Solana Pay QR codes for payments.

Required Imports
Ensure you import the necessary components from the installed libraries:

import { createQR } from "@solana/pay";
import { Keypair, PublicKey } from "@solana/web3.js";
import BigNumber from "bignumber.js";
import { useSolanaWallet } from "@web3auth/modal/react/solana";


Generating the Payment Request QR Code
The core of Solana Pay integration involves creating a payment request URL and then rendering it as a QR code. Here's what you need to define:

Recipient and Amount: Define the recipient (a PublicKey of the merchant/receiver) and the amount (a BigNumber representing the payment value, e.g., 0.001 SOL).
Reference: Generate a unique reference for the payment. This acts as a unique identifier for the transaction.
Optional Fields: Include label, message, and memo for enhanced user experience.
Here's how to implement a Solana Pay QR code generator component:

src/components/solanaPay.tsx
import { Keypair, PublicKey } from "@solana/web3.js";
import { createQR, encodeURL } from "@solana/pay";
import BigNumber from "bignumber.js";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useSolanaWallet } from "@web3auth/modal/react/solana";

export function SolanaPay() {
    const { accounts } = useSolanaWallet();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [amountToSend, setAmountToSend] = useState(0);
    const [showModal, setShowModal] = useState(false);
    const [qrUrl, setQrUrl] = useState<string>("");
    const qrRef = useRef<HTMLDivElement>(null);

    const generateQrCode = () => {
        try {
            if (!accounts?.[0]) {
                setError("No wallet connected");
                return;
            }

            setIsLoading(true);
            setError(null);
            // set the parameter of the transfer
            const recipient = new PublicKey(accounts?.[0]!);
            const amount = new BigNumber(amountToSend);
            // reference should be a unique ID for the payment
            const reference = new Keypair().publicKey;
            // Label and message are optional. They will be shown in wallets when users scan it but won't show on chain
            const label = "MetaMask Embedded Wallet x Solana Pay Demo";
            const message = "Thanks for Trying Solana Pay!";
            // memo is optional and will be included in the onchain transaction
            const memo = "Thanks for Trying Solana Pay!";
            // create the URL
            const url = encodeURL({
                recipient,
                amount,
                reference,
                label,
                message,
                memo,
            });

            setQrUrl(url.toString());
            setShowModal(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to generate QR code");
        } finally {
            setIsLoading(false);
        }
    };
    // Generate QR code when modal opens and URL is available
    useEffect(() => {
        if (showModal && qrUrl && qrRef.current) {
            qrRef.current.innerHTML = "";
            try {
                const qr = createQR(qrUrl, 300, "white");
                qr.append(qrRef.current);
            } catch (err) {
                setError("Failed to create QR code");
            }
        }
    }, [showModal, qrUrl]);

    const closeModal = () => {
        setShowModal(false);
        setQrUrl("");
        setError(null);
    };

    return (
      <>
        <div>
          <h2>Solana Pay QR</h2>
          <div className="flex flex-col items-center gap-4">
            <input
              type="number"
              placeholder="Enter SOL amount"
              onChange={(e) => setAmountToSend(Number(e.target.value))}
              className="px-4 py-2 border rounded-lg text-black"
              step="0.01"
              min="0"
            />
            <button
              onClick={generateQrCode}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              disabled={isLoading || amountToSend <= 0}
            >
              {isLoading ? "Generating..." : "Generate Payment QR"}
            </button>

            {/* Error Display */}
            {error && !showModal && (
              <div className="text-red-500 text-sm mt-2">
                Error: {error}
              </div>
            )}
          </div>
        </div>
...


Testing and Best Practices
Development Environment
DevNet for Testing: Always develop and test on DevNet or TestNet. You can use the Solana Faucet to get test SOL for your new account.
Environment Variables: Store your Web3Auth Client ID and other sensitive configuration in environment variables.
User Experience
User Interface: For better user experience, display the QR code within a modal or a dedicated confirmation page, providing clear messages to the user.
Loading States: Implement proper loading states while generating QR codes and processing transactions.
Error Handling: Provide clear error messages when transactions fail or when the user's wallet doesn't have sufficient balance.
Production Considerations
Tracking Payments: For production, implement a server-side solution to track the unique payment reference and poll for transaction confirmation using websockets. This allows you to update your application's state and perform reconciliation in your database.
Production RPCs: For scalable production usage, use dedicated Solana RPC services from providers like QuickNode, as public RPCs may have rate limits.
Security: Validate all payment parameters server-side before processing transactions.
Conclusion
This guide demonstrates how to integrate Web3Auth's embedded wallets with Solana Pay to create a seamless payment experience. By combining Web3Auth's familiar Web2-like social logins with Solana Pay's QR code functionality, you can enable users to make payments directly from their Web3Auth-powered embedded wallet.

The integration provides a smooth, familiar experience for your users while leveraging the power of the Solana blockchain for fast and low-cost transactions.

If you are interested in learning more about Web3Auth, please check out our documentation for Web SDK or explore our Solana Pay integration example.
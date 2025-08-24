Transfer USDC on testnet from Ethereum to Avalanche using CCTP V2
Explore this script to transfer USDC on testnet between two EVM-compatible chains via CCTP V2
This guide demonstrates how to use the viem framework and the CCTP V2 API in a simple script that enables a user to transfer USDC from a wallet address on the Ethereum Sepolia testnet to another wallet address on the Avalanche Fuji testnet.


Prerequisites
Before you start building the sample app to perform a USDC transfer, ensure you have met the following prerequisites:

Install Node.js and npm

Download and install Node.js directly or use a version manager like nvm.
npm is included with Node.js.
Set up a non-custodial wallet (for example, MetaMask)

You can download, install, and create a MetaMask wallet from its official website.
During setup, create a wallet on the Ethereum Sepolia testnet.
Retrieve the private key for your wallet, as it will be required in the script below.
Fund your wallet with testnet tokens

Obtain Sepolia ETH (native token) from a public faucet.
Get Sepolia USDC from the Circle Faucet.

Project setup
To build the script, first set up your project environment and install the required dependencies.

Set up a new project
Create a new directory and initialize a new Node.js project with default settings:

Shell
mkdir cctp-v2-transfer
cd cctp-v2-transfer
npm init -y

Copy
Copied!
This also creates a default package.json file.

Install dependencies
In your project directory, install the required dependencies, including viem:

Shell
npm install axios@^1.7.9 dotenv@^16.4.7 viem@^2.23.4

Copy
Copied!
This sets up your development environment with the necessary libraries for building the script. It also updates the package.json file with the dependencies.

Add module type
Add "type": "module" to the package.json file:

package.json
JSON
{
  "name": "cctp-v2-transfer",
  "version": "1.0.0",
  "type": "module",
  "main": "index.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1",
    "start": "node transfer.js"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "description": "",
  "dependencies": {
    "axios": "^1.7.9",
    "dotenv": "^16.4.7",
    "viem": "^2.23.4"
  }
}

Copy
Copied!
Configure environment variables
Create a .env file in your project directory and add your wallet private key:

Shell
echo "PRIVATE_KEY=your-private-key-here" > .env

Copy
Copied!
Warning: This is strictly for testing purposes. Never share your private key.


Script setup
This section covers the necessary setup for the transfer.js script, including defining keys and addresses, and configuring the wallet client for interacting with the source and destination chains.

Replace with your private key and wallet address
Ensure that this section of the file includes your private key and associated wallet address. The script also predefines the contract addresses, the transfer amount, and the max fee. These definitions are critical for successfully transferring USDC between the intended wallets.

JavaScript
// ============ Configuration Constants ============

// Authentication
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const account = privateKeyToAccount(`0x${PRIVATE_KEY}`);

// Contract Addresses
const ETHEREUM_SEPOLIA_USDC = "0x1c7d4b196cb0c7b01d743fbc6116a902379c7238";
const ETHEREUM_SEPOLIA_TOKEN_MESSENGER =
  "0x8fe6b999dc680ccfdd5bf7eb0974218be2542daa";
const AVALANCHE_FUJI_MESSAGE_TRANSMITTER =
  "0xe737e5cebeeba77efe34d4aa090756590b1ce275";

// Transfer Parameters
const DESTINATION_ADDRESS = "your-wallet-address"; // Address to receive minted tokens on destination chain
const AMOUNT = 1_000_000n; // Set transfer amount in 10^6 subunits (1 USDC; change as needed)
const maxFee = 500n; // Set fast transfer max fee in 10^6 subunits (0.0005 USDC; change as needed)

// Bytes32 Formatted Parameters
const DESTINATION_ADDRESS_BYTES32 = `0x000000000000000000000000${DESTINATION_ADDRESS.slice(2)}`; // Destination address in bytes32 format
const DESTINATION_CALLER_BYTES32 =
  "0x0000000000000000000000000000000000000000000000000000000000000000"; // Empty bytes32 allows any address to call MessageTransmitterV2.receiveMessage()

// Chain-specific Parameters
const ETHEREUM_SEPOLIA_DOMAIN = 0; // Source domain ID for Ethereum Sepolia testnet
const AVALANCHE_FUJI_DOMAIN = 1; // Destination domain ID for Avalanche Fuji testnet

Copy
Copied!
Set up wallet clients
The wallet client configures the appropriate network settings using viem. In this example, the script connects to the Ethereum Sepolia testnet and the Avalanche Fuji testnet.

JavaScript
// Set up the wallet clients
const sepoliaClient = createWalletClient({
  chain: sepolia,
  transport: http(),
  account,
});

const avalancheClient = createWalletClient({
  chain: avalancheFuji,
  transport: http(),
  account,
});

Copy
Copied!

CCTP transfer process
The following sections outline the relevant transfer logic of the sample script. You can view the full source code in the Build the script section below. To perform the actual transfer of USDC from Ethereum Sepolia to Avalanche Fuji using CCTP V2, follow the steps below:


1. Approve USDC
The first step is to grant approval for the TokenMessengerV2 contract deployed on the Ethereum Sepolia testnet to withdraw USDC from your wallet on that source chain. This allows the contract to withdraw USDC from the specified wallet address.

JavaScript
async function approveUSDC() {
  console.log("Approving USDC transfer...");
  const approveTx = await sepoliaClient.sendTransaction({
    to: ETHEREUM_SEPOLIA_USDC,
    data: encodeFunctionData({
      abi: [
        {
          type: "function",
          name: "approve",
          stateMutability: "nonpayable",
          inputs: [
            { name: "spender", type: "address" },
            { name: "amount", type: "uint256" },
          ],
          outputs: [{ name: "", type: "bool" }],
        },
      ],
      functionName: "approve",
      args: [ETHEREUM_SEPOLIA_TOKEN_MESSENGER, 10_000_000_000n], // Set max allowance in 10^6 subunits (10,000 USDC; change as needed)
    }),
  });
  console.log(`USDC Approval Tx: ${approveTx}`);
}

Copy
Copied!

2. Burn USDC
In this step, you call the depositForBurn function from the TokenMessengerV2 contract deployed on the Ethereum Sepolia testnet to burn USDC on that source chain. You specify the following parameters:

Burn amount: The amount of USDC to burn
Destination domain: the target blockchain for minting USDC
Mint recipient: The wallet address that will receive the minted USDC
Burn token: The contract address of the USDC token being burned on the source chain
Destination caller: The address on the target chain to call receiveMessage
Max fee: The maximum fee allowed for the transfer
Finality threshold: Determines whether it's a Fast Transfer or a Standard Transfer
JavaScript
async function burnUSDC() {
  console.log("Burning USDC on Ethereum Sepolia...");
  const burnTx = await sepoliaClient.sendTransaction({
    to: ETHEREUM_SEPOLIA_TOKEN_MESSENGER,
    data: encodeFunctionData({
      abi: [
        {
          type: "function",
          name: "depositForBurn",
          stateMutability: "nonpayable",
          inputs: [
            { name: "amount", type: "uint256" },
            { name: "destinationDomain", type: "uint32" },
            { name: "mintRecipient", type: "bytes32" },
            { name: "burnToken", type: "address" },
            { name: "destinationCaller", type: "bytes32" },
            { name: "maxFee", type: "uint256" },
            { name: "minFinalityThreshold", type: "uint32" },
          ],
          outputs: [],
        },
      ],
      functionName: "depositForBurn",
      args: [
        AMOUNT,
        AVALANCHE_FUJI_DOMAIN,
        DESTINATION_ADDRESS_BYTES32,
        ETHEREUM_SEPOLIA_USDC,
        DESTINATION_CALLER_BYTES32,
        maxFee,
        1000, // minFinalityThreshold (1000 or less for Fast Transfer)
      ],
    }),
  });
  console.log(`Burn Tx: ${burnTx}`);
  return burnTx;
}

Copy
Copied!

3. Retrieve attestation
In this step, you retrieve the attestation required to complete the CCTP transfer.

Call Circle's GET /v2/messages API endpoint to retrieve the attestation.
Pass the srcDomain argument from the CCTP Domain for your source chain.
Pass transactionHash from the value returned by sendTransaction within the burnUSDC function above.
This step is essential for verifying the burn event before proceeding with the transfer.

JavaScript
async function retrieveAttestation(transactionHash) {
  console.log("Retrieving attestation...");
  const url = `https://iris-api-sandbox.circle.com/v2/messages/${ETHEREUM_SEPOLIA_DOMAIN}?transactionHash=${transactionHash}`;
  while (true) {
    try {
      const response = await axios.get(url);
      if (response.status === 404) {
        console.log("Waiting for attestation...");
      }
      if (response.data?.messages?.[0]?.status === "complete") {
        console.log("Attestation retrieved successfully!");
        return response.data.messages[0];
      }
      console.log("Waiting for attestation...");
      await new Promise((resolve) => setTimeout(resolve, 5000));
    } catch (error) {
      console.error("Error fetching attestation:", error.message);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}

Copy
Copied!

4. Mint USDC
In this final step, you call the receiveMessage function from the MessageTransmitterV2 contract deployed on the Avalanche Fuji testnet to mint USDC on that destination chain.

Pass the signed attestation and the message data as parameters.
The function processes the attestation and mints USDC to the specified Avalanche Fuji wallet address.
This step finalizes the CCTP transfer, making the USDC available on the destination chain.

JavaScript
async function mintUSDC(attestation) {
  console.log("Minting USDC on Avalanche Fuji...");
  const mintTx = await avalancheClient.sendTransaction({
    to: AVALANCHE_FUJI_MESSAGE_TRANSMITTER,
    data: encodeFunctionData({
      abi: [
        {
          type: "function",
          name: "receiveMessage",
          stateMutability: "nonpayable",
          inputs: [
            { name: "message", type: "bytes" },
            { name: "attestation", type: "bytes" },
          ],
          outputs: [],
        },
      ],
      functionName: "receiveMessage",
      args: [attestation.message, attestation.attestation],
    }),
  });
  console.log(`Mint Tx: ${mintTx}`);
}

Copy
Copied!

Build the script
Now that you understand the core steps for programmatically transferring USDC from Ethereum Sepolia to Avalanche Fuji using CCTP V2, create a transfer.js in your project directory and populate it with the sample code below.

Note: The source wallet must contain native testnet tokens (to cover gas fees) and testnet USDC to complete the transfer.


transfer.js
JavaScript
// Import environment variables
import "dotenv/config";
import { createWalletClient, http, encodeFunctionData } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia, avalancheFuji } from "viem/chains";
import axios from "axios";

// ============ Configuration Constants ============

// Authentication
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const account = privateKeyToAccount(`0x${PRIVATE_KEY}`);

// Contract Addresses
const ETHEREUM_SEPOLIA_USDC = "0x1c7d4b196cb0c7b01d743fbc6116a902379c7238";
const ETHEREUM_SEPOLIA_TOKEN_MESSENGER =
  "0x8fe6b999dc680ccfdd5bf7eb0974218be2542daa";
const AVALANCHE_FUJI_MESSAGE_TRANSMITTER =
  "0xe737e5cebeeba77efe34d4aa090756590b1ce275";

// Transfer Parameters
const DESTINATION_ADDRESS = "your-wallet-address"; // Address to receive minted tokens on destination chain
const AMOUNT = 1_000_000n; // Set transfer amount in 10^6 subunits (1 USDC; change as needed)
const maxFee = 500n; // Set fast transfer max fee in 10^6 subunits (0.0005 USDC; change as needed)

// Bytes32 Formatted Parameters
const DESTINATION_ADDRESS_BYTES32 = `0x000000000000000000000000${DESTINATION_ADDRESS.slice(2)}`; // Destination address in bytes32 format
const DESTINATION_CALLER_BYTES32 =
  "0x0000000000000000000000000000000000000000000000000000000000000000"; // Empty bytes32 allows any address to call MessageTransmitterV2.receiveMessage()

// Chain-specific Parameters
const ETHEREUM_SEPOLIA_DOMAIN = 0; // Source domain ID for Ethereum Sepolia testnet
const AVALANCHE_FUJI_DOMAIN = 1; // Destination domain ID for Avalanche Fuji testnet

// Set up wallet clients
const sepoliaClient = createWalletClient({
  chain: sepolia,
  transport: http(),
  account,
});
const avalancheClient = createWalletClient({
  chain: avalancheFuji,
  transport: http(),
  account,
});

async function approveUSDC() {
  console.log("Approving USDC transfer...");
  const approveTx = await sepoliaClient.sendTransaction({
    to: ETHEREUM_SEPOLIA_USDC,
    data: encodeFunctionData({
      abi: [
        {
          type: "function",
          name: "approve",
          stateMutability: "nonpayable",
          inputs: [
            { name: "spender", type: "address" },
            { name: "amount", type: "uint256" },
          ],
          outputs: [{ name: "", type: "bool" }],
        },
      ],
      functionName: "approve",
      args: [ETHEREUM_SEPOLIA_TOKEN_MESSENGER, 10_000_000_000n], // Set max allowance in 10^6 subunits (10,000 USDC; change as needed)
    }),
  });
  console.log(`USDC Approval Tx: ${approveTx}`);
}

async function burnUSDC() {
  console.log("Burning USDC on Ethereum Sepolia...");
  const burnTx = await sepoliaClient.sendTransaction({
    to: ETHEREUM_SEPOLIA_TOKEN_MESSENGER,
    data: encodeFunctionData({
      abi: [
        {
          type: "function",
          name: "depositForBurn",
          stateMutability: "nonpayable",
          inputs: [
            { name: "amount", type: "uint256" },
            { name: "destinationDomain", type: "uint32" },
            { name: "mintRecipient", type: "bytes32" },
            { name: "burnToken", type: "address" },
            { name: "destinationCaller", type: "bytes32" },
            { name: "maxFee", type: "uint256" },
            { name: "minFinalityThreshold", type: "uint32" },
          ],
          outputs: [],
        },
      ],
      functionName: "depositForBurn",
      args: [
        AMOUNT,
        AVALANCHE_FUJI_DOMAIN,
        DESTINATION_ADDRESS_BYTES32,
        ETHEREUM_SEPOLIA_USDC,
        DESTINATION_CALLER_BYTES32,
        maxFee,
        1000, // minFinalityThreshold (1000 or less for Fast Transfer)
      ],
    }),
  });
  console.log(`Burn Tx: ${burnTx}`);
  return burnTx;
}

async function retrieveAttestation(transactionHash) {
  console.log("Retrieving attestation...");
  const url = `https://iris-api-sandbox.circle.com/v2/messages/${ETHEREUM_SEPOLIA_DOMAIN}?transactionHash=${transactionHash}`;
  while (true) {
    try {
      const response = await axios.get(url);
      if (response.status === 404) {
        console.log("Waiting for attestation...");
      }
      if (response.data?.messages?.[0]?.status === "complete") {
        console.log("Attestation retrieved successfully!");
        return response.data.messages[0];
      }
      console.log("Waiting for attestation...");
      await new Promise((resolve) => setTimeout(resolve, 5000));
    } catch (error) {
      console.error("Error fetching attestation:", error.message);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}

async function mintUSDC(attestation) {
  console.log("Minting USDC on Avalanche Fuji...");
  const mintTx = await avalancheClient.sendTransaction({
    to: AVALANCHE_FUJI_MESSAGE_TRANSMITTER,
    data: encodeFunctionData({
      abi: [
        {
          type: "function",
          name: "receiveMessage",
          stateMutability: "nonpayable",
          inputs: [
            { name: "message", type: "bytes" },
            { name: "attestation", type: "bytes" },
          ],
          outputs: [],
        },
      ],
      functionName: "receiveMessage",
      args: [attestation.message, attestation.attestation],
    }),
  });
  console.log(`Mint Tx: ${mintTx}`);
}

async function main() {
  await approveUSDC();
  const burnTx = await burnUSDC();
  const attestation = await retrieveAttestation(burnTx);
  await mintUSDC(attestation);
  console.log("USDC transfer completed!");
}

main().catch(console.error);

Copy
Copied!
The transfer.js script provides a complete end-to-end solution for transfering USDC in CCTP V2 with a non-custodial wallet. In the next section, you can test the script.


Test the script
To test the script, run the following command:

Shell
node transfer.js

Copy
Copied!
Once the script runs and the transfer is finalized, a confirmation receipt is logged in the console.

Rate Limit:

The attestation service rate limit is 35 requests per second. If you exceed this limit, the service blocks all API requests for the next 5 minutes and returns an HTTP 429 (Too Many Requests) response.

You have successfully transferred USDC between two EVM-compatible chains using CCTP end-to-end!


WHAT'S NEXT

CCTP Supported Chains and Domains


CCTP Solana Programs and Interfaces
Programs for CCTP V2 support on the Solana blockchain

Overview
Solana CCTP programs are written in Rust and leverage the Anchor framework. The Solana CCTP V2 protocol implementation is split into two programs: MessageTransmitterV2 and TokenMessengerMinterV2. TokenMessengerMinterV2 encapsulates the functionality of both TokenMessengerV2 and TokenMinterV2 contracts on EVM chains. To ensure alignment with EVM contracts' logic and state, and to facilitate future upgrades and maintenance, the code and state of Solana programs reflect the EVM counterparts as closely as possible.


Mainnet Program Addresses
Program	Domain	Address
MessageTransmitterV2	5	CCTPV2Sm4AdWt5296sk4P66VBZ7bEhcARwFaaS9YPbeC
TokenMessengerMinterV2	5	CCTPV2vPZJS2u2BBsUoscuikbYjnpFmbFsvVuJdgUMQe

Devnet Program Addresses
Program	Domain	Address
MessageTransmitterV2	5	CCTPV2Sm4AdWt5296sk4P66VBZ7bEhcARwFaaS9YPbeC
TokenMessengerMinterV2	5	CCTPV2vPZJS2u2BBsUoscuikbYjnpFmbFsvVuJdgUMQe
The Solana CCTP source code is available on GitHub. The interface below serves as a reference for permissionless messaging functions exposed by the programs.


CCTP V2 Interface
The interface below serves as a reference for permissionless messaging functions exposed by the TokenMessengerMinter and MessageTransmitter programs. The full IDLs can be found onchain using a block explorer. MessageTransmitterV2 IDL and TokenMessengerMinterV2 IDL.

Please see the instruction rust files or quick-start for PDA information.


Changes from CCTP V1

New Functions
TokenMessengerMinterV2#deposit_for_burn_with_hook (extends deposit_for_burn by adding hook data)
TokenMessengerMinterV2#handle_receive_unfinalized_message (replaces handle_receive_message)
TokenMessengerMinterV2#handle_receive_finalized_message (replaces handle_receive_message)

Modified Functions
TokenMessengerMinterV2#deposit_for_burn
MessageTransmitterV2#send_message
MessageTransmitterV2#receive_message
MessageTransmitterV2#reclaim_event_account (5 day waiting window added, see TokenMessengerMinterV2 section for more information)

Removed Functions
TokenMessengerV2#handle_receive_message
TokenMessengerV2#replace_deposit_for_burn
TokenMessengerV2#deposit_for_burn_with_caller
MessageTransmitterV2#replace_message
MessageTransmitterV2#send_message_with_caller

TokenMessengerMinterV2
depositForBurn
Deposits and burns tokens from sender to be minted on destination domain. Minted tokens will be transferred to mintRecipient.

Parameters

Field	Type	Description
amount	u64	Amount of tokens to deposit and burn.
destinationDomain	u32	Destination domain identifier.
mintRecipient	Pubkey	Public Key of token account mint recipient on destination domain. Address should be the 32 byte version of the hex address in base58. See Additional Notes on mintRecipient section for more information.
destinationCaller	Pubkey	Address which can call receiveMessage on destination domain. If set to PublicKey.default, any address can call receiveMessage Address should be the 32 byte version of the hex address in base58. See Additional Notes on mintRecipient section for more information.
maxFee	u64	Max fee paid for the transfer, specified in units of the burn token.
minFinalityThreshold	u32	Minimum finality threshold at which burn will be attested
Fees

A fee may be charged for standard USDC transfers. Fees for standard transfers are currently set to 0, but may be non-zero in the future. Please see CCTP Fees for more information.

MessageSent event storage

To ensure persistent and reliable message storage, MessageSent events are stored in accounts. MessageSent event accounts are generated client-side, passed into the instruction call, and assigned to have the MessageTransmitterV2 program as the owner. Please see the Quickstart Guide for how to generate this account and pass it to the instruction call.

For depositForBurn CCTP V1 messages, this costs ~0.00381408 SOL in rent. This rent is paid by the event_rent_payer account which can be the user or subsidized by a calling program or integrator.

In CCTP V1, this SOL could be reclaimed by calling reclaim_event_account once the attestation is available.

In CCTP V2, message nonces are generated off-chain, meaning the source messages cannot be identified from the attestation. Due to this, there is a 5 day window after sending a message that callers must wait before reclaim_event_account can be called. This is to ensure that the message has been fully processed by Circle's offchain services.

depositForBurnWithHook
Deposits and burns tokens from sender to be minted on destination domain, and emits a cross-chain message with additional hook data appended. In addition to the standard deposit_for_burn parameters, deposit_for_burn_with_hook accepts a dynamic-length hookData parameter, allowing the caller to include additional metadata to the attested message, which can be used to trigger custom logic on the destination chain.

Parameters

Field	Type	Description
amount	u64	Amount of tokens to deposit and burn.
destinationDomain	u32	Destination domain identifier.
mintRecipient	Pubkey	Public Key of token account mint recipient on destination domain. Address should be the 32 byte version of the hex address in base58. See Additional Notes on mintRecipient section for more information.
destinationCaller	Pubkey	Address which can call receiveMessage on destination domain. If set to PublicKey.default, any address can call receiveMessage Address should be the 32 byte version of the hex address in base58. See Additional Notes on mintRecipient section for more information.
maxFee	u64	Max fee paid for fast burn, specified in units of the burn token.
minFinalityThreshold	u32	Minimum finality threshold at which burn will be attested
hookData	Vec<u8>	Additional metadata attached to the attested message, which can be used to trigger custom logic on the destination chain
handleReceiveFinalizedMessage
Handles incoming message received by the local MessageTransmitter, and takes the appropriate action. For a burn message, mints the associated token to the requested recipient on the local domain. Validates the function sender is the local MessageTransmitter, and the remote sender is a registered remote TokenMessenger for remoteDomain.

Additionally, reads the feeExecuted parameter from the BurnMessage. If nonzero, the feeExecuted amount is minted to the feeRecipient.

Parameters

Field	Type	Description
remoteDomain	u32	The domain where the message originated from
sender	Pubkey	The sender of the message (remote TokenMessenger)
finalityThresholdExecuted	u32	Specifies the level of finality Iris signed the message with
messageBody	Vec<u8> (dynamic length)	The message body bytes
handleReceiveUnfinalizedMessage
Handles incoming message received by the local MessageTransmitter, and takes the appropriate action. For a burn message, mints the associated token to the requested recipient on the local domain. Validates the function sender is the local MessageTransmitter, and the remote sender is a registered remote TokenMessenger for remoteDomain.

Similar to handleReceiveFinalizedMessage, but is called for messages which are not finalized (finalityThresholdExecuted < 2000).

Unlike handleReceiveFinalizedMessage, handleReceiveUnfinalizedMessage has the following messageBody parameter:

expirationBlock. If expirationBlock ≤ blockNumber on the destination domain, the message will revert and must be re-signed without the expiration block.
Parameters

Field	Type	Description
remoteDomain	u32	The domain where the message originated from
sender	Pubkey	The sender of the message (remote TokenMessenger)
finalityThresholdExecuted	u32	Specifies the level of finality Iris signed the message with
messageBody	Vec<u8> (dynamic length)	The message body bytes (see Message format)

MessageTransmitterV2
receiveMessage
Messages with a given nonce can only be broadcast successfully once for a pair of domains. The message body of a valid message is passed to the specified recipient for further processing.

Parameters

Field	Type	Description
message	Vec<u8>	Message bytes.
attestation	Vec<u8>	Signed attestation of message.
Remaining Accounts

If the receiveMessage instruction is being called with a deposit for burn message that will be received by the TokenMessengerMinterV2, additional remainingAccounts are required so they can be passed with the CPI to TokenMessengerMinter#handle_receive_finalized_message or TokenMessengerMinter#handle_receive_unfinalized_message:

Account Name	PDA Seeds	PDA ProgramId	isSigner?	isWritable?	Description
token_messenger	["token_messenger"]	tokenMessengerMinter	false	false	TokenMessenger Program Account
remote_token_messenger	["remote_token_messenger", sourceDomainId]	tokenMessengerMinter	false	false	Remote token messenger account where the remote token messenger address is stored for the given source domain id
token_minter	["token_minter"]	tokenMessengerMinter	false	true	TokenMinter Program Account
local_token	["local_token", localTokenMint.publicKey]	tokenMessengerMinter	false	true	Local token account where the information for the local token (e.g. USDCSOL) being minted is stored
token_pair	["token_pair", sourceDomainId, sourceTokenInBase58]	tokenMessengerMinter	false	false	Token pair account where the info for the local and remote tokens are stored. sourceTokenInBase58 is the remote token that was burned and converted into base58 format.
user_token_account	N/A	N/A	false	true	User token account that will receive the minted tokens. This address must match the mintRecipient from the source chain depositForBurn call.
custody_token_account	["custody", localTokenMint.publicKey]	tokenMessengerMinter	false	true	Custody account that holds the pre-minted USDCSOL that can be minted for CCTP usage.
SPL.token_program_id	N/A	N/A	false	false	The native SPL token program ID.
token_program_event_authority	["__event_authority"]	tokenMessengerMinter	false	false	Event authority account for the TokenMessengerMinter program. Needed to emit Anchor CPI events.
program	N/A	N/A	false	false	Program id for the TokenMessengerMinter program.
sendMessage
Sends a message to the destination domain and recipient. Stores message in a MessageSent account which will be attested by Circle's attestation service.

Parameters

Field	Type	Description
destinationDomain	u32	Destination domain identifier.
recipient	Pubkey	Address to handle message body on destination domain.
messageBody	Vec<u8>	Application-specific message to be handled by recipient.

Additional Notes
These notes are applicable to all CCTP versions.


Mint Recipient for Solana as Destination Chain Transfers
When calling depositForBurn on a non-Solana chain with Solana as the destination, the mintRecipient should be a hex encoded USDC token account address. The token account* must exist at the time receiveMessage is called on Solana* or else this instruction will revert. An example of converting an address from Base58 to hex taken from the Solana quickstart tutorial in Typescript can be seen below:

Typescript
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import { hexlify } from "ethers";

const solanaAddressToHex = (solanaAddress: string): string =>
  hexlify(bs58.decode(solanaAddress));

Copy
Copied!

Mint Recipient for Solana as Source Chain Transfers
When specifying the mintRecipient for Solana deposit_for_burn instruction calls, the address must be given as the 32 byte version of the hex address in base58 format. An example taken from the Solana quickstart tutorial in Typescript can be seen below:

Typescript
import { getBytes } from "ethers";
import { PublicKey } from "@solana/web3.js";

const evmAddressToBytes32 = (address: string): string =>
  `0x000000000000000000000000${address.replace("0x", "")}`;

const evmAddressToBase58PublicKey = (addressHex: string): PublicKey =>
  new PublicKey(getBytes(evmAddressToBytes32(addressHex)));

Copy
Copied!

Program Events
Program events like DepositForBurn , MintAndWithdraw , and MessageReceived are emitted as Anchor CPI events. This means a self-CPI is made into the program with the serialized event as instruction data so it is persisted in the transaction and can be fetched later on as needed. More information can be seen in the Anchor implementation PR, and an example of reading CPI events can be seen in the solana-cctp-contracts repository.

MessageSent events are different, as they are stored in accounts. Please see the MessageSent Event Storage section for more info.


CCTP Workflow vs. CCTP V1
This table highlights the key workflow improvements of CCTP over CCTP V1 in terms of enhanced cross-chain messaging, fewer manual steps, and greater control over message acceptance:

CCTP	CCTP V1
Burn USDC via deposit_for_burn_with_hook

Currently, you can call deposit_for_burn_with_hook on TokenMessengerMinterV2, which supports hooks and finality thresholds. New parameters include destinationCaller, maxFee, and minFinalityThreshold, allowing you to choose Fast Transfer (1000) or Standard Transfer (2000).	Burn USDC via deposit_for_burn

In CCTP V1, you call deposit_for_burn on TokenMessengerMinter.
Retrieve, Hash, and Wait for Attestation

Currently, Iris automates message retrieval and hashing, allowing you to just poll for attestation via GET /v2/messages. The attestation includes both the hashed message and the attestation signature.	Retrieve and Hash Message explicitly

In CCTP V1, you need to manually extract and hash the messageBytes data from the MessageSent event logs using Keccak256.
Wait for Attestation via Iris

Currently, the attestation request is merged with message retrieval and hashing from the previous step. You simply wait for the polling to complete and retrieve the attestation.	Request Attestation from Circle's Attestation Service

In CCTP V1, you poll for attestation via GET /v1/attestations.
Send Messages via MessageTransmitterV2#send_message

Currently, the recipient must implement message handling methods based on finality thresholds:
• handle_receive_finalized_message for messages with finality_threshold_executed ≥ 2000 (fully finalized).
• handle_receive_unfinalized_message for messages with finality_threshold_executed < 2000 (pre-finalized).

This allows recipients to enforce specific finality requirements before accepting a message.	Send Messages via MessageTransmitter#send_message

In CCTP V1, you send an arbitrary message via send_message on MessageTransmitter. The recipient must implement handle_receive_message to process the message.

WHAT'S NEXT

This guide walks you through the process of:

Setting up a 7702 smart account and checking its USDC balance
Configuring the Circle Paymaster v0.8 to pay for gas with USDC
Connecting to a bundler and submitting a user operation
This quickstart shows you how you can integrate Circle Paymaster into your app to simplify network fee management for your users.

Note: Throughout this tutorial, each snippet lists any new imports above the relevant code. You should add the new imports to the top of the file and merge with other imports from the same module. You can add the rest of the code inline.

If you'd like a video guide on how to implement Circle Paymaster with an EIP-7702 smart account, watch the following presentation from Circle Developer Relations:



Prerequisites
Before you start building the sample app to pay for gas fees in USDC, ensure that Node.js and npm are installed. You can download and install Node.js directly, or use a version manager like nvm. The npm binary comes with Node.js.


Part 1: Set up a 7702 smart account
The following steps cover the steps required to set up your environment and initialize a new smart account.


1.1. Set up your development environment
Create a new project, set the package type to module, and install the necessary dependencies.

Shell
npm init
npm pkg set type="module"
npm install --save viem dotenv

Copy
Copied!
Create a new .env file.

Shell
touch .env

Copy
Copied!
Edit the .env file and add the following variables, replacing {YOUR_PRIVATE_KEY} and {RECIPIENT_ADDRESS} with your own values:

Text
OWNER_PRIVATE_KEY={YOUR_PRIVATE_KEY}
RECIPIENT_ADDRESS={RECIPIENT_ADDRESS}
PAYMASTER_V08_ADDRESS=0x3BA9A96eE3eFf3A69E2B18886AcF52027EFF8966
USDC_ADDRESS=0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d # Arbitrum Sepolia

Copy
Copied!
The RECIPIENT_ADDRESS is the destination address for the example USDC transfer.


1.2. Initialize clients and 7702 smart account
Create a file called index.js and add the following code to set up the necessary clients and 7702 account:

JavaScript
import "dotenv/config";
import { createPublicClient, http, getContract } from "viem";
import { arbitrumSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import {
  createBundlerClient,
  toSimple7702SmartAccount,
} from "viem/account-abstraction";

const chain = arbitrumSepolia;
const usdcAddress = process.env.USDC_ADDRESS;
const ownerPrivateKey = process.env.OWNER_PRIVATE_KEY;

const client = createPublicClient({ chain, transport: http() });
const owner = privateKeyToAccount(ownerPrivateKey);
const account = await toSimple7702SmartAccount({ client, owner });

Copy
Copied!

1.3. Check the USDC balance
Check the smart account's USDC balance using the following code:

JavaScript
import { erc20Abi } from "viem";
const usdc = getContract({ client, address: usdcAddress, abi: erc20Abi });
const usdcBalance = await usdc.read.balanceOf([account.address]);

if (usdcBalance < 1000000) {
  console.log(
    `Fund ${account.address} with USDC on ${client.chain.name} using https://faucet.circle.com, then run this again.`,
  );
  process.exit();
}

Copy
Copied!

Part 2: Configure the Paymaster
The Circle Paymaster requires an allowance to spend USDC on behalf of the smart account.


2.1. Implement the permit
A USDC allowance is required for the paymaster to be able to withdraw USDC from the account to pay for fees. A signed permit can be used to set the paymaster's allowance without submitting a separate transaction.

Create a new file called permit.js with the following code to sign EIP-2612 permits:

JavaScript
import { maxUint256, erc20Abi, parseErc6492Signature, getContract } from "viem";

// Adapted from https://github.com/vacekj/wagmi-permit/blob/main/src/permit.ts
export async function eip2612Permit({
  token,
  chain,
  ownerAddress,
  spenderAddress,
  value,
}) {
  return {
    types: {
      // Required for compatibility with Circle PW Sign Typed Data API
      EIP712Domain: [
        { name: "name", type: "string" },
        { name: "version", type: "string" },
        { name: "chainId", type: "uint256" },
        { name: "verifyingContract", type: "address" },
      ],
      Permit: [
        { name: "owner", type: "address" },
        { name: "spender", type: "address" },
        { name: "value", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    },
    primaryType: "Permit",
    domain: {
      name: await token.read.name(),
      version: await token.read.version(),
      chainId: chain.id,
      verifyingContract: token.address,
    },
    message: {
      // Convert bigint fields to string to match EIP-712 JSON schema expectations
      owner: ownerAddress,
      spender: spenderAddress,
      value: value.toString(),
      nonce: (await token.read.nonces([ownerAddress])).toString(),
      // The paymaster cannot access block.timestamp due to 4337 opcode
      // restrictions, so the deadline must be MAX_UINT256.
      deadline: maxUint256.toString(),
    },
  };
}

export const eip2612Abi = [
  ...erc20Abi,
  {
    inputs: [
      {
        internalType: "address",
        name: "owner",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
    name: "nonces",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
  },
  {
    inputs: [],
    name: "version",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
];

export async function signPermit({
  tokenAddress,
  client,
  account,
  spenderAddress,
  permitAmount,
}) {
  const token = getContract({
    client,
    address: tokenAddress,
    abi: eip2612Abi,
  });
  const permitData = await eip2612Permit({
    token,
    chain: client.chain,
    ownerAddress: account.address,
    spenderAddress,
    value: permitAmount,
  });

  const wrappedPermitSignature = await account.signTypedData(permitData);

  const isValid = await client.verifyTypedData({
    ...permitData,
    address: account.address,
    signature: wrappedPermitSignature,
  });

  if (!isValid) {
    throw new Error(
      `Invalid permit signature for ${account.address}: ${wrappedPermitSignature}`,
    );
  }

  const { signature } = parseErc6492Signature(wrappedPermitSignature);
  return signature;
}

Copy
Copied!

2.2. Set up Circle Paymaster
In the index.js file, use the Circle permit implementation to build paymaster data:

JavaScript
import { encodePacked } from "viem";
import { signPermit } from "./permit.js";

const paymasterAddress = process.env.PAYMASTER_V08_ADDRESS;

const paymaster = {
  async getPaymasterData(parameters) {
    const permitAmount = 10000000n;
    const permitSignature = await signPermit({
      tokenAddress: usdcAddress,
      account,
      client,
      spenderAddress: paymasterAddress,
      permitAmount: permitAmount,
    });

    const paymasterData = encodePacked(
      ["uint8", "address", "uint256", "bytes"],
      [0, usdcAddress, permitAmount, permitSignature],
    );

    return {
      paymaster: paymasterAddress,
      paymasterData,
      paymasterVerificationGasLimit: 200000n,
      paymasterPostOpGasLimit: 15000n,
      isFinal: true,
    };
  },
};

Copy
Copied!

Part 3: Submit a user operation
Once the paymaster is configured, you can connect to a bundler submit a user operation to transfer USDC.


3.1. Connect to the bundler
In index.js, set up the bundler client with the following code:

JavaScript
import { createBundlerClient } from "viem/account-abstraction";
import { hexToBigInt } from "viem";

const bundlerClient = createBundlerClient({
  account,
  client,
  paymaster,
  userOperation: {
    estimateFeesPerGas: async ({ account, bundlerClient, userOperation }) => {
      const { standard: fees } = await bundlerClient.request({
        method: "pimlico_getUserOperationGasPrice",
      });
      const maxFeePerGas = hexToBigInt(fees.maxFeePerGas);
      const maxPriorityFeePerGas = hexToBigInt(fees.maxPriorityFeePerGas);
      return { maxFeePerGas, maxPriorityFeePerGas };
    },
  },
  transport: http(`https://public.pimlico.io/v2/${client.chain.id}/rpc`),
});

Copy
Copied!

3.2. Sign an authorization and submit the user operation
For 7702 smart accounts, you need to sign an authorization to set the code of the account to a 7702 smart account before submitting the user operation:

JavaScript
const recipientAddress = process.env.RECIPIENT_ADDRESS;

// Sign authorization for 7702 account
const authorization = await owner.signAuthorization({
  chainId: chain.id,
  nonce: await client.getTransactionCount({ address: owner.address }),
  contractAddress: account.authorization.address,
});

const hash = await bundlerClient.sendUserOperation({
  account,
  calls: [
    {
      to: usdc.address,
      abi: usdc.abi,
      functionName: "transfer",
      args: [recipientAddress, 10000n],
    },
  ],
  authorization: authorization,
});
console.log("UserOperation hash", hash);

const receipt = await bundlerClient.waitForUserOperationReceipt({ hash });
console.log("Transaction hash", receipt.receipt.transactionHash);

// We need to manually exit the process, since viem leaves some promises on the
// event loop for features we're not using.
process.exit();

Copy
Copied!

Next steps
The above example demonstrates how to pay for a transaction using only USDC. You can review the transaction in an explorer to verify the details and see the USDC transfers that occurred during the transaction. Remember that you need to use the transaction hash from the bundler, not the user operation hash in the explorer. You can also view more details about the user operation by searching for the user operation hash in a user op explorer on the appropriate network.

Did this page help you?

Yes



Testnet
Blockchain	Symbol	Paymaster contract address
Ethereum Sepolia	ETH-SEPOLIA	0x3BA9A96eE3eFf3A69E2B18886AcF52027EFF8966

Paymaster events
This section explains the events from the Circle Paymaster and when they are emitted. You can use these events to debug or track the state after submitting a user operation (user op) to a bundler.


TokenPaymasterV07.sol and TokenPaymasterV08.sol
These files are the main contract of the Circle Paymaster that support EntryPoint v0.7 and v0.8. The primary functions they integrate are:

_validatePaymasterUserOp: validates the user op and charges the prefund token from the sender before execution.
_postOp: refunds the token back to the sender when the actual amount of tokens needed is known after execution.

UserOperationSponsored
The contract emits this event after the _postOp is executed and the prefund token (if any) is refunded.

Attributes

Name	Type	Description
token	IERC20	The ERC-20 token paid by the sender
sender	address	The sender address
userOpHash	bytes32	The hash of the user op
nativeTokenPrice	uint256	The price of 1 ether = 1e18 wei, denominated in token
actualTokenNeeded	uint256	The final transaction cost to the smart contract account (SCA), denominated in token
feeTokenAmount	uint256	The fee spread used to cover the slippage from exchanging USDC for ETH, denominated in token
Example

Using this transaction as an example, the userOperationSponsored event contains the following data:

Name	Type	Value
token	IERC20	0x0000000000000000000000001c7d4b196cb0c7b01d743fbc6116a902379c7238
sender	address	0x000000000000000000000000148cab4b1a7e8c23ae62967cfc8df6292ecf27a8
userOpHash	bytes32	cc6f71a0ba8d9b72e75c45fae7b830c403b46964eb1d3f8daa0b73d14e6c5b0d
nativeTokenPrice	uint256	3000000000
actualTokenNeeded	uint256	4551712
feeTokenAmount	uint256	0
Did this page help you?

Yes


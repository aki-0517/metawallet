# Metawallet MVP

A multi-chain wallet application that provides seamless user experience across Ethereum and Solana networks.

## Features Implemented

### ✅ User Authentication (F-01)
- Email-based signup/login using Web3Auth
- Automatic EVM and Solana wallet generation
- Secure MPC-based key management

### ✅ Username Registration (F-02)
- Unique @username system
- Real-time ENS (.eth) and SNS (.sol) availability checking
- Cross-chain username validation

### ✅ Dashboard & Asset Management (F-03)
- Total USD balance display across all chains
- Chain-specific asset breakdown (USDC/USDT)
- Mock balances for demonstration (70% Ethereum, 30% Solana)

### ✅ Address & Username Display (F-04)
- User's @username prominently shown
- EVM and Solana addresses with copy functionality
- Collapsible address section

### ✅ Send Money by Username (F-05)
- Send to @username on Ethereum (Smart Account)
- ENS resolution for recipient addresses
- Gasless transactions using ERC-4337 Smart Accounts
- USD-based sending

### ✅ Send Money by Address (F-06)
- Direct Ethereum address sending
- Smart Account based transactions
- Gasless transaction support

### ✅ Transaction History (F-07)
- Unified transaction timeline
- Filter by sent/received transactions
- Transaction status and chain indicators
- Mock transaction data for demonstration

### ✅ Contact List (F-08)
- Recent transaction contact storage
- Quick contact selection for sending
- Contact management interface

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Blockchain**: viem (Ethereum), @solana/kit (Solana)
- **Authentication**: Web3Auth with Smart Accounts (ERC-4337)
- **Smart Accounts**: MetaMask Smart Account with gasless transactions
- **Name Services**: ENS + SNS integration
- **Payment**: Solana Pay QR code generation

## Getting Started

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment**
   - Copy `.env` and add your Web3Auth Client ID
   - Get Client ID from [Web3Auth Dashboard](https://dashboard.web3auth.io/)

3. **Run Development Server**
   ```bash
   npm run dev
   ```

4. **Build for Production**
   ```bash
   npm run build
   ```

## Environment Variables

```env
# Web3Auth Configuration
VITE_WEB3AUTH_CLIENT_ID=your_web3auth_client_id_here

# Blockchain RPC Endpoints
VITE_SEPOLIA_RPC_URL=https://rpc.sepolia.org
VITE_SOLANA_RPC_URL=https://api.devnet.solana.com

# App Configuration
VITE_APP_NAME=Metawallet

# Token Contract Addresses
VITE_USDC_SEPOLIA_ADDRESS=0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
VITE_USDC_SOLANA_MINT=4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU

# Smart Account Configuration (ERC-4337)
VITE_PIMLICO_API_KEY=your_pimlico_api_key_here

# Circle Paymaster Configuration
VITE_CIRCLE_PAYMASTER_ADDRESS=0x3BA9A96eE3eFf3A69E2B18886AcF52027EFF8966
```

## Project Structure

```
src/
├── components/           # React components
│   ├── Dashboard.tsx    # Main dashboard
│   ├── LoginPage.tsx    # Authentication
│   ├── SendMoney.tsx    # Send functionality
│   ├── TransactionHistory.tsx
│   └── UsernameRegistration.tsx
├── contexts/
│   └── AuthContext.tsx  # Authentication state
├── lib/                 # Utility libraries
│   ├── web3auth.ts     # Web3Auth integration
│   ├── ens.ts          # ENS utilities
│   └── sns.ts          # SNS utilities
└── App.tsx             # Main app component
```

## Demo Features

- Mock transaction data for demonstration
- Simulated balance loading
- Username availability checking on testnets
- Cross-chain address resolution

## Smart Account Setup (ERC-4337)

This application uses Web3Auth Smart Accounts for gasless transactions on Ethereum. Follow these steps to configure:

### 1. Web3Auth Dashboard Configuration

1. **Login to Web3Auth Dashboard**
   - Go to [Web3Auth Dashboard](https://dashboard.web3auth.io/)
   - Login with your account

2. **Enable Smart Accounts**
   - Navigate to your project settings
   - Go to the "Smart Accounts" section
   - Enable the "Set up Smart Accounts" toggle
   - Select "MetaMaskSmartAccount" as the provider

3. **Configure Wallet Settings**
   - Choose "All supported wallets" for maximum compatibility
   - Or select "Embedded wallets only" if preferred

4. **Configure Bundler & Paymaster**
   - Navigate to the "Bundler & Paymaster" tab
   - Add bundler URL for Sepolia: `https://api.pimlico.io/v2/sepolia/rpc?apikey=YOUR_API_KEY`
   - Configure paymaster settings for sponsored transactions (optional)

### 2. Pimlico API Key Setup

1. **Get Pimlico API Key**
   - Visit [Pimlico](https://www.pimlico.io/)
   - Sign up for an account
   - Create a new API key
   - Copy the API key

2. **Update Environment Variables**
   ```env
   VITE_PIMLICO_API_KEY=pim_your_actual_api_key_here
   ```

### 3. Circle Paymaster Setup (USDC Gas Payment)

This application uses Circle Paymaster to allow users to pay gas fees with USDC instead of ETH.

1. **Automatic Integration**
   - Circle Paymaster is pre-configured for Sepolia testnet
   - Contract address: `0x3BA9A96eE3eFf3A69E2B18886AcF52027EFF8966`
   - No additional setup required for testing

2. **USDC Gas Payment Process**
   - User approves USDC spending via EIP-2612 permit (gasless)
   - Paymaster pays ETH gas fees on behalf of user
   - Equivalent USDC amount is deducted from user's balance
   - Transaction appears gasless to the user

3. **Requirements**
   - Smart account must have sufficient USDC balance
   - USDC contract: `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238` (Sepolia)
   - Fund account at [Circle Faucet](https://faucet.circle.com)

### 4. Smart Account Features

- **USDC Gas Payment**: Pay gas fees with USDC instead of ETH
- **Gasless Experience**: Users don't need to hold ETH
- **Batch Transactions**: Multiple operations in a single transaction
- **Account Deployment**: Smart accounts are deployed on first transaction
- **Address Types**: 
  - Smart Account Address: Used for transactions (primary)
  - EOA Address: Traditional wallet address (backup)

### 5. Testing Smart Accounts

1. **Development Mode**
   - Smart Accounts work on Web3Auth Sapphire Devnet for free
   - No production API keys needed for testing

2. **First Transaction**
   - The first transaction will deploy the smart account
   - Subsequent transactions use the deployed account
   - Monitor transaction status in the dashboard

3. **Troubleshooting**
   - Check Web3Auth Dashboard for configuration issues
   - Verify Pimlico API key is valid
   - Ensure sufficient balance in paymaster (if using sponsored transactions)

### 6. Production Considerations

- **Pricing**: Smart Accounts require Growth Plan or higher for production
- **Gas Sponsorship**: Configure paymaster policies for different transaction types
- **Monitoring**: Set up alerts for bundler and paymaster failures
- **Backup**: Always maintain access to EOA addresses

## Next Steps

To make this production-ready:

1. ✅ Smart Account integration completed
2. ✅ Gasless transaction support implemented  
3. ✅ Real balance fetching from contracts
4. Add comprehensive error handling for smart account failures
5. Add comprehensive testing for ERC-4337 flows
6. Implement advanced paymaster policies

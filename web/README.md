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
- Send to @username across chains
- Automatic proportional distribution based on current balances
- ENS/SNS resolution for recipient addresses
- USD-based sending with chain distribution

### ✅ Send Money by Address (F-06)
- Direct address sending
- Chain selection (Ethereum/Solana)
- Token amount specification

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
- **Authentication**: Web3Auth with MPC wallets
- **Name Services**: ENS + SNS integration

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
VITE_WEB3AUTH_CLIENT_ID=your_web3auth_client_id_here
VITE_SEPOLIA_RPC_URL=https://rpc.sepolia.org
VITE_SOLANA_RPC_URL=https://api.devnet.solana.com
VITE_APP_NAME=Metawallet
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

## Next Steps

To make this production-ready:

1. Replace mock data with real blockchain calls
2. Implement actual transaction sending
3. Add real balance fetching from contracts
4. Set up proper error handling and loading states
5. Add comprehensive testing
6. Implement Paymaster integration for gasless transactions

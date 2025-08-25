# Metawallet

**An identity-driven unified wallet that realizes a seamless multi-chain future**

## Overview

Metawallet solves the complexity of multi-chain Web3 by providing a single, intuitive interface where your identity (`@username`) functions as a universal wallet ID. Through this identity-first approach, Metawallet makes cross-chain finance as simple as sending an email.

## Key Features

- **🔐 Simple Email Login**: Sign up with just your email using Web3Auth - no seed phrases to remember
- **🆔 Universal Username**: Choose a unique `@username` that works across all chains
- **💰 Unified Balance**: See all your assets (Solana & Ethereum) as one USD balance
- **💸 Easy Transfers**: Send money to anyone using their `@username` or wallet address
- **⚡ Gasless Transactions**: Pay gas fees with USDC instead of ETH using Paymaster
- **🌉 Automatic Bridging**: Seamless cross-chain transfers using Circle CCTP
- **📱 Solana Pay Integration**: QR code payments and deep links for offline transactions

## Technology Stack

### Frontend
- **React + TypeScript + Vite**
- **Tailwind CSS** for styling
- **Web3Auth (MetaMask Embedded Wallet)** for authentication

### Blockchain Integration
- **Ethereum Sepolia Testnet** with Account Abstraction (ERC-4337)
- **Solana Devnet** for fast, low-cost transactions
- **Circle CCTP** for cross-chain USDC bridging
- **USDC Paymaster** for gasless transactions
- **Solana Name Service (SNS)** & **Ethereum Name Service (ENS)**

## Getting Started

### Prerequisites
- Node.js 18+
- Git

### Installation

1. Clone the repository
```bash
git clone https://github.com/your-username/metawallet.git
cd metawallet
```

2. Install dependencies
```bash
cd web
npm install
```

3. Set up environment variables
```bash
cp .env.example .env
```

Fill in your environment variables:
- `VITE_WEB3AUTH_CLIENT_ID`: Your Web3Auth client ID
- `VITE_PIMLICO_API_KEY`: Your Pimlico API key for Account Abstraction
- `VITE_SEPOLIA_RPC_URL`: Ethereum Sepolia RPC endpoint
- `VITE_APP_NAME`: Your app name (default: "Metawallet")

4. Start the development server
```bash
npm run dev
```

## Project Structure

```
metawallet/
├── web/                          # Frontend React application
│   ├── src/
│   │   ├── components/          # React components
│   │   ├── contexts/           # React contexts (Auth, etc.)
│   │   ├── lib/               # Web3Auth and blockchain utilities
│   │   └── hooks/            # Custom React hooks
│   └── public/              # Static assets
├── docs/                   # Documentation
│   ├── idea.md            # Project concept (Japanese)
│   ├── idea_en.md         # Project concept (English)
│   └── library/          # Technical documentation
└── README.md             # This file
```

## How It Works

1. **Identity Creation**: Users sign up with email via Web3Auth, automatically creating Solana and Ethereum wallets
2. **Username Registration**: Choose a unique `@username` verified across SNS and ENS
3. **Unified Experience**: View combined USD balance from both chains in a single interface
4. **Smart Transfers**: Send money using `@username` - system automatically handles cross-chain bridging and gas payments
5. **Gasless Transactions**: All Ethereum transactions use USDC Paymaster to eliminate ETH requirements

## Features in Detail

### Multi-Chain Account Abstraction
- **Smart Account**: ERC-4337 Account Abstraction on Ethereum for gasless transactions
- **USDC Paymaster**: Pay gas fees with USDC instead of ETH
- **Cross-Chain Bridging**: Automatic Circle CCTP integration for seamless USDC transfers

### Identity System
- **SNS Integration**: Solana Name Service for `.sol` domains
- **ENS Integration**: Ethereum Name Service for `.eth` domains
- **Universal Username**: Single `@username` works across all supported chains

### Payment Experience
- **Solana Pay**: QR code and deep link payments
- **Contact Management**: Automatic contact list for frequent recipients
- **Transaction History**: Unified timeline of all cross-chain transactions

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Documentation

- [Project Concept (English)](docs/idea_en.md)
- [Project Concept (Japanese)](docs/idea.md)
- [Technical Documentation](docs/library/)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Web3Auth](https://web3auth.io/) for seamless wallet infrastructure
- [Circle](https://www.circle.com/) for CCTP cross-chain bridging
- [Solana](https://solana.com/) for fast, low-cost transactions
- [Ethereum](https://ethereum.org/) for smart contract capabilities
# Metawallet

**An identity-driven unified wallet that realizes a seamless multi-chain future**

## Vision
The future of the web is multi-chain, but the current user experience is fragmented and complex. Ordinary users feel resistance to managing multiple addresses, switching networks, and understanding concepts like gas fees for different chains.

**Metawallet** solves this problem by abstracting blockchain complexity. It provides a single, intuitive interface where the user's identity (`@username`) functions as a universal wallet ID. Through this identity-first seamless approach, Metawallet makes cross-chain finance as simple as sending an email.

---

## Key Features

* **Unified Identity and Onboarding:**
    * **Easy signup:** Users can sign up using just their email address via the **MetaMask Embedded Wallet (Web3Auth) SDK**. This instantly creates two non-custodial wallets for Solana and EVM, eliminating the need to manage seed phrases.
    * **Universal Username:** During registration, users choose a unique `@username` (e.g., `@alice`).
    * **SNS & ENS Integration:** The system verifies that this username is unique across both Solana Name Service (SNS) and Ethereum Name Service (ENS). Once registration is complete, the app automatically associates the user's new wallets with `alice.sol` and `alice.eth`, making the user's identity the core of their on-chain activities.

* **Chain-Abstracted User Experience:**
    * **Single Unified Asset Balance:** The main dashboard displays only a **single balance in USD**, showing the combined value of assets (USDC) across both Solana and EVM wallets. Cross-chain differences are hidden from the main interface.
    * **Transparent Detail View:** By clicking the "Details" button, users can see specific asset breakdowns for each chain.
    * [Image of a clean wallet dashboard showing only one large USD balance]

* **Superior UX for Money Transfer:**
    * **Send to Anyone:** Users can send funds using the recipient's `@username` or traditional wallet addresses.
    * **USDC Paymaster Integration on Ethereum:** All transfers are executed on Ethereum using **USDC Paymaster** to pay gas fees with USDC. This eliminates the need for users to hold ETH, allowing all operations with just USDC.
    * **Automatic Circle CCTP Bridging:** When USDC is available on Solana, the system automatically uses **Circle CCTP** to bridge USDC from Solana to Ethereum, then executes the transfer on Ethereum. Users don't need to be aware of this complex process.
    * **Single Wallet Experience:** EVM and Solana wallets are completely integrated, allowing users to operate them as a single wallet. Cross-chain differences are completely abstracted, achieving superior UX.

* **Enhanced Payment Experience:**
    * **Solana Pay Integration:** Integration with **Solana Pay** enables simple and intuitive payment experiences. One-tap payments using QR codes and deep links make offline payments easy.
    * **Automatic Bridging Function:** When balance is insufficient on Solana, the system automatically uses **Circle CCTP** to bridge USDC from Ethereum to Solana. This allows users to enjoy seamless payment experiences without worrying about insufficient balances.
    * **Unified Transaction History:** All send/receive history across all chains (EVM/Solana) is displayed in a single timeline format. Users can easily see who (`@username`), when, and how much was sent/received, making asset movement tracking simple.
    * **Contact List:** `@username`s of previous transaction counterparts are automatically saved to a contact list. Users can easily send money by simply selecting from the list, reducing the risk of misdirected transfers.
---

## How Metawallet Meets Each Track's Judging Criteria

### Track 1: Cross-Chain Interoperability and Asset Movement

Metawallet is a prime example of simple cross-chain asset movement.

* **Seamless User Experience:** By integrating Solana and EVM chains into a single identity and balance, it eliminates the need for users to manually switch networks or manage multiple wallets.
* **Superior UX:** Through **USDC Paymaster** and **automatic Circle CCTP bridging**, users don't need to hold ETH, and insufficient balances are automatically resolved. It achieves an integrated experience where EVM and Solana wallets feel like one wallet.
* **Novel Asset Movement:** **Automatic Circle CCTP bridging** and **USDC Paymaster integration on Ethereum** provide unique solutions for cross-chain transactions. Solana assets are automatically bridged to Ethereum, and all transfers are executed on Ethereum using USDC Paymaster. This eliminates the need for users to hold ETH while automating complex bridging operations.
* **Embedded Wallet Integration:** All flows from onboarding to transaction signing are powered by **MetaMask Embedded Wallet**, completely abstracting wallet complexity and meeting this track's core requirements.

***

### Track 2: Solana's Daily Impact: Consumer & Community Apps

Metawallet is designed for users unfamiliar with crypto assets and is the ideal tool for daily financial interactions.

* **Democratizing Web3:** Email login and the `@username` system remove the biggest barriers to entry. It feels like familiar Web2 apps (Venmo, PayPay, etc.) but is built on the decentralized, high-performance **Solana** network.
* **Real-World Use Cases:** This simplicity makes it perfect for:
    * **P2P Tipping:** Creators can easily receive tips at their `@username` without worrying about which chain they use.
    * **Social Rewards:** Communities can directly airdrop rewards to user IDs.
    * **Small Commerce:** Small shops can accept payments at `@shopname`, with payments instantly settled on Solana's fast and affordable network.
* **User Empowerment:** Users truly own their assets with their own non-custodial wallets, combining Web2 convenience with Web3 self-sovereignty.

***

### Track 3: Programmable Commerce & DeFi for Everyone

Metawallet makes complex financial logic simple for everyone through a common ID system of ENS and SNS.

* **UX Enhancement through ENS and SNS Common ID:** **`@username`** is automatically mapped to both `.sol` and `.eth` domains, allowing users to seamlessly operate in multi-chain environments with a single ID. This common ID system eliminates complex address management and achieves intuitive financial experiences.
* **Automated Financial Tools:** **Automatic Circle CCTP bridging** and **USDC Paymaster integration on Ethereum** are forms of programmable payments. The automated strategy of "automatically bridging Solana assets to Ethereum and paying gas with USDC" is executed with one click.
* **"One-Click" DeFi:** This approach simplifies asset management by making user portfolio allocation an active, programmable tool rather than a static balance sheet. Through ENS and SNS common ID, cross-chain operations are completely abstracted, allowing users to execute all financial operations through a single interface.

***

### Track 4: Best Use Case for SNS

Metawallet doesn't just use SNS as a feature but as the foundational pillar of the entire application.

* **SNS as Core Identity:** **Solana Name Service (SNS)** isn't just a pretty feature for receiving transfers. In Metawallet, `username.sol` is a vital component of the user's universal identity, verified during registration and used in all identity-based transactions.
* **Practical and Creative Integration:**
    * **Practical:** Simplifying Solana-side send/receive to human-readable names is essential for mainstream adoption.
    * **Creative:** We use SNS as the key to a multi-chain identity system. `@username` connects `.sol` domains with their corresponding `.eth` domains, enabling chain-abstracting logic. The availability of a `.sol` domain becomes a prerequisite for creating a user's universal ID, making SNS the gateway to the Metawallet ecosystem. This deep integration demonstrates powerful and practical SNS use cases beyond simple address resolution.

***

### Track 5: Best Use of Solana Pay

Metawallet leverages Solana Pay not just as a payment feature, but as the core of an integrated payment experience in a multi-chain ecosystem.

* **Innovative Solana Pay Integration:** **Solana Pay** plays a central role in Metawallet's payment experience. One-tap payments using QR codes and deep links make offline payments easy. However, Metawallet's true innovation lies in integrating Solana Pay into a multi-chain environment.

* **Multi-Chain Solana Pay Experience:**
    * **Automatic Bridging Function:** When balance is insufficient on Solana, the system automatically uses **Circle CCTP** to bridge USDC from Ethereum to Solana. This allows users to maximize the convenience of Solana Pay without worrying about insufficient balances.
    * **Integrated Payment Flow:** When receiving a Solana Pay payment request, the system automatically checks the user's asset status and, if necessary, bridges assets from Ethereum to Solana before executing the payment. This process is completely automated, allowing users to complete payments with a single tap.

* **Solana Pay Extensibility:** Metawallet extends Solana Pay's standard functionality to enable use in multi-chain environments. This maintains Solana Pay's convenience while providing access to a broader user base.
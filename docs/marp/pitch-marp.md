---
marp: true
theme: default
class: lead
paginate: true
style: |
  section {
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
    color: white;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  }
  h1 {
    color: #FFD700;
    text-shadow: 3px 3px 6px rgba(0,0,0,0.8);
    font-size: 2.5em;
    margin-bottom: 0.5em;
  }
  h2 {
    color: #FF69B4;
    text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
    font-size: 1.8em;
  }
  h3 {
    color: #00FF7F;
    text-shadow: 1px 1px 3px rgba(0,0,0,0.8);
    font-size: 1.4em;
  }
  ul li {
    color: #FFFFFF;
    font-size: 1.1em;
    margin: 0.3em 0;
    text-shadow: 1px 1px 2px rgba(0,0,0,0.7);
  }
  strong {
    color: #FFD700;
    text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
  }
  table {
    background: rgba(255,255,255,0.05);
    border-radius: 15px;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255,255,255,0.2);
  }
  table th {
    background: rgba(255,215,0,0.9);
    color: #000;
    font-weight: bold;
    padding: 12px;
  }
  table td {
    color: white;
    background: rgba(0,0,0,0.3);
    padding: 12px;
    border: 1px solid rgba(255,255,255,0.1);
  }
  .emoji {
    font-size: 1.3em;
  }
  section::before {
    content: '✨';
    position: absolute;
    top: 20px;
    right: 30px;
    font-size: 2em;
    animation: sparkle 2s infinite;
  }
  @keyframes sparkle {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.7; transform: scale(1.1); }
  }
---

![w:200](../../web/public/logo.jpg)

# **Metawallet**
## *Making cross-chain finance as simple as sending an email*

### Identity-First Multi-Chain Wallet

---

# **The Web3 UX Crisis**

## Current Web3 Experience
-  **Fragmented**: Multiple addresses, networks, gas tokens
-  **Complex**: Manual bridging, seed phrases, technical barriers  
-  **Excluding**: Mass adoption blocked by terrible UX


---

# **Our Solution: Metawallet**

## Identity-First Multi-Chain Wallet
- **Email signup**  Instant Solana + Ethereum wallets  
- **@username** Works across all chains  
- **One USD balance** Hide blockchain complexity  
- **Pay gas with USDC** Zero friction experience 

---

# **How It Works**

## 5-Step User Journey

**1. Sign Up**  Email  Web3Auth creates Solana + Ethereum wallets

**2. Choose Identity**  Pick `@alice`  Verified across SNS + ENS  

**3. Unified Balance**  See combined USD value from all chains

**4. Send Money**  `@bob` or address Auto-bridge + USDC gas send

**5. Receive Payments**  Solana Pay QR codes Instant settlement

---

# **Key Technologies**

- **Web3Auth**: Email login, no seed phrases
- **SNS + ENS**: Universal @username identity  
- **USDC Paymaster**: Gas fees paid with USDC (no ETH needed)
- **Circle CCTP**: Automatic cross-chain bridging
- **Solana Pay**: QR code payments

---

# **Why Metawallet Wins**

| Feature | **Metawallet** | Traditional Wallets |
|---------|---------------|-------------------|
| **Onboarding** |  Email signup |  Seed phrases |
| **Identity** |  Universal @username |  Multiple addresses |
| **Balance** |  Single USD amount |  Per-chain breakdown |
| **Gas Fees** |  USDC Paymaster | Native tokens needed |
| **Cross-Chain** | Automatic bridging |  Manual operations |

---

# **Advanced Features**

- **Chain Abstraction**: Solana + Ethereum feel like one wallet
- **Smart Bridging**: Auto CCTP when sending cross-chain
- **Contact Management**: Save @usernames for easy repeat sends  
- **Unified History**: All transactions in one timeline
 

---

# **Current Status** 

- Web3Auth integration complete
- SNS + ENS username system working  
- USDC Paymaster implemented
- Circle CCTP bridging active

---

# **Get Involved**

 **Try Demo**: metawallet.app  
 **Partner**: Integrate universal @username  
 **Contact**: team@metawallet.app | @metawallet

## **Let's make Web3 accessible for everyone**

---

# Thank You
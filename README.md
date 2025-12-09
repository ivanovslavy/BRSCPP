# BRSCPP - Blockchain Real-time Settlement Crypto Payment Protocol

A non-custodial Web3 payment infrastructure for instant cryptocurrency settlements without KYC. Direct wallet-to-wallet settlement system with price-locked quotes using Chainlink Oracles.

**Current Status:** Live Beta Testing (December 2024)

**Networks:** Sepolia Testnet, BSC Testnet

**Tokens:** ETH, BNB, USDC, USDT

**Website:** https://pp.slavy.space

**Demo Shop:** https://testshop.pp.slavy.space

---

## Quick Links

- [Smart Contracts Documentation](blockchain/README.md)
- [Backend API Documentation](backend/brscpp_backend/README.md)
- [Test Shop Backend Documentation](backend/testshop_backend/README.md)
- [Marketing Site Documentation](frontend/marketing_app/README.md)
- [Payment App Documentation](frontend/payment_app/README.md)
- [Test Shop Frontend Documentation](frontend/testshop_app/README.md)

---

## Overview

BRSCPP enables merchants to accept cryptocurrency payments in their web stores. Customers pay in crypto (ETH, BNB, USDC, USDT) while merchants set prices in 12 supported fiat currencies with automatic USD conversion for blockchain operations.

### Key Features

- **Non-Custodial:** P2P transfers, no intermediaries, no custody
- **Multi-Currency:** 12 fiat currencies supported (USD, EUR, GBP, JPY, CNY, RUB, INR, CAD, AUD, BRL, MXN, KRW)
- **Multi-Chain:** Sepolia (Ethereum), BSC Testnet, Polygon Amoy (deployed)
- **Multi-Token:** Native tokens (ETH, BNB) and stablecoins (USDC, USDT)
- **Price Protection:** Chainlink oracle-locked quotes (60-120 seconds)
- **Instant Settlement:** Immediate fund transfer to merchant wallet
- **Low Fees:** 1% on Sepolia, 0.5% on BSC Testnet (on-chain deduction)
- **Open Source:** Verified smart contracts, publicly auditable

---

## Architecture
```
┌─────────────────┐
│   Merchant      │
│   Web Store     │
└────────┬────────┘
         │ API Request
         ▼
┌─────────────────┐      ┌──────────────┐
│  BRSCPP API     │─────►│  PostgreSQL  │
│  (Node.js)      │      │   Database   │
└────────┬────────┘      └──────────────┘
         │ Payment URL
         ▼
┌─────────────────┐
│  Payment App    │
│  (React)        │
└────────┬────────┘
         │ Web3 Transaction
         ▼
┌─────────────────┐      ┌──────────────┐
│  Smart Contract │◄─────│  Chainlink   │
│  (Solidity)     │      │   Oracles    │
└────────┬────────┘      └──────────────┘
         │ P2P Transfer
         ▼
┌─────────────────┐
│   Customer      │
│   Wallet        │
└─────────────────┘
```

### Technology Stack

**Blockchain Layer:**
- Solidity smart contracts
- Chainlink Price Feeds (dual-oracle validation)
- OpenZeppelin libraries (ReentrancyGuard, Ownable)

**Backend Layer:**
- Node.js with Express.js
- PostgreSQL database
- Prisma ORM
- RESTful API

**Frontend Layer:**
- React with Vite
- TailwindCSS
- ethers.js v6
- MetaMask integration

---

## Project Structure
```
brscpp/
├── blockchain/              Smart contracts and deployment scripts
│   ├── contracts/          Gateway and faucet contracts (Solidity)
│   ├── scripts/            Deployment and testing scripts
│   ├── deployments/        Deployment addresses
│   └── README.md           Full blockchain documentation
│
├── backend/
│   ├── brscpp_backend/     Payment gateway API
│   │   ├── src/            API source code
│   │   ├── prisma/         Database schema
│   │   └── README.md       API documentation
│   │
│   └── testshop_backend/   Demo shop backend
│       ├── src/            Shop API source
│       └── README.md       Shop backend documentation
│
└── frontend/
    ├── marketing_app/      Landing page (pp.slavy.space)
    │   ├── src/            Marketing site source
    │   └── README.md       Marketing site documentation
    │
    ├── payment_app/        Checkout application (app.pp.slavy.space)
    │   ├── src/            Payment app source
    │   └── README.md       Payment app documentation
    │
    └── testshop_app/       Demo shop (testshop.pp.slavy.space)
        ├── src/            Shop frontend source
        └── README.md       Shop frontend documentation
```

---

## Deployment Status

### Smart Contracts

| Network | Gateway Address | Faucet Address | Fee | Status |
|---------|----------------|----------------|-----|--------|
| Sepolia | `0x1378329ABE689594355a95bDAbEaBF015ef9CF39` | `0xFB370f6c9Bd1dbc7dB6c202D5B9e6B8F30273c00` | 1% | Live |
| BSC Testnet | `0x0E2878bC634Ac0c1C4d3dA22CFb171Fb67a2d6e7` | `0x9959AD0fC939013aEca6121295272756E352d902` | 0.5% | Live |
| Polygon Amoy | `0x6d125b85f49066f7BEaB3ffEa412b6B54948E539` | `0x0E2878bC634Ac0c1C4d3dA22CFb171Fb67a2d6e7` | 1% | Deployed |

### Backend Services

| Service | URL | Status |
|---------|-----|--------|
| Payment API | https://api.pp.slavy.space | Live |
| Test Shop API | https://backend.testshop.pp.slavy.space | Live |

### Frontend Applications

| Application | URL | Status |
|------------|-----|--------|
| Marketing Site | https://pp.slavy.space | Live |
| Payment App | https://app.pp.slavy.space | Live |
| Test Shop | https://testshop.pp.slavy.space | Live |

---

## Payment Flow

### Merchant Integration
1. Register at https://pp.slavy.space/register
2. Receive API key
3. Create payment request via API with order ID, amount, currency, network
4. Redirect customer to payment URL
5. Receive funds directly to wallet (P2P)

### Customer Experience
1. Select blockchain network (Sepolia or BSC Testnet)
2. Choose token (Native or Stablecoin)
3. Lock price quote (60-120 second timer)
4. Approve token spending (stablecoins only)
5. Confirm payment transaction
6. Payment complete, merchant receives funds instantly

---

## Supported Currencies

### Fiat Currencies (Merchant Side)
USD, EUR, GBP, JPY, CNY, RUB, INR, CAD, AUD, BRL, MXN, KRW

All currencies automatically convert to USD for blockchain operations.

### Crypto Tokens (Customer Side)

**Sepolia Testnet:**
- ETH (native)
- USDC (0xC4De068C028127bdB44670Edb82e6E3Ff4113E49)
- USDT (0x00D75E583DF2998C7582842e69208ad90820Eaa1)

**BSC Testnet:**
- BNB (native)
- USDC (0x45787D76D24F3b47663eC3DEcc76f46C20Fa0c4C)
- USDT (0xb6dFe9F6810955A3bcbdf7F99418C95Cb073F23D)

---

## Testing Resources

### Test Token Faucets
Access free test tokens at https://pp.slavy.space/faucets

**Available Tokens:**
- USDC: 10,000 per claim (24-hour cooldown)
- USDT: 10,000 per claim (24-hour cooldown)

**Supported Networks:**
- Sepolia Testnet
- BSC Testnet

### Demo Shop
Experience complete payment flow at https://testshop.pp.slavy.space

**Features:**
- Multi-currency product pricing
- Network selection (Sepolia/BSC)
- Token selection (Native/USDC/USDT)
- Complete checkout flow

---

## API Integration Example
```javascript
const axios = require('axios');

const response = await axios.post(
  'https://api.pp.slavy.space/api/merchant/payment-request',
  {
    orderId: 'ORDER-123',
    amountUsd: '100.00',
    currency: 'USD',
    network: 'sepolia',
    description: 'Product purchase'
  },
  {
    headers: {
      'Authorization': 'Bearer YOUR_API_KEY',
      'Content-Type': 'application/json'
    }
  }
);

const paymentUrl = response.data.paymentRequest.paymentUrl;
// Redirect customer to: paymentUrl
```

Full API documentation: https://pp.slavy.space/docs

---

## Development Roadmap

| Period | Status | Milestone |
|--------|--------|-----------|
| Q1-Q2 2025 | Complete | Smart contract development and testing |
| Q3 2025 | Complete | Backend API development |
| Q3-Q4 2025 | Complete | Frontend applications development |
| Q4 2025 | In Progress | Multi-chain deployment, testing, documentation |
| Q1-Q2 2026 | Planned | WordPress plugin, JavaScript widget, beta testing |
| Q3-Q4 2026 | Planned | Mainnet launch (Ethereum, Polygon, BSC) |

---

## Security

### Smart Contract Security Features
- Reentrancy protection
- Access control (Ownable)
- Dual-oracle price validation
- Oracle staleness protection
- Quote expiration enforcement
- Merchant whitelist system
- Emergency pause functionality

### Security Audit
Professional security audit planned for Q1 2026 before mainnet launch.

### Reporting Vulnerabilities
Report security issues via https://me.slavy.space (contact form)

Do not create public GitHub issues for security concerns.

---

## System Requirements

**Tested Configuration:**
- OS: Ubuntu Desktop
- Browser: Firefox (latest version)
- Wallet: MetaMask extension

**Note:** Compatibility with other operating systems, browsers, and wallet providers has not been extensively tested.

---

## Contributing

BRSCPP is currently in beta testing phase. We welcome:
- Bug reports
- Feature suggestions
- Integration feedback
- Documentation improvements

Contact: https://me.slavy.space

---

## Job Openings

### Marketing Specialist
Develop go-to-market strategy and build community around BRSCPP protocol.

**Responsibilities:**
- Social media management and content development
- Developer outreach programs
- Partnership development and community engagement

**Compensation:** Payable or co-owner agreements available

### React Developer
Enhance frontend applications with focus on UI/UX excellence.

**Responsibilities:**
- Design and develop user-friendly interfaces
- Optimize frontend performance

**Compensation:** Payable or co-owner agreements available

**Apply:** https://me.slavy.space

---

## Links and Resources

| Resource | URL |
|----------|-----|
| Website | https://pp.slavy.space |
| Documentation | https://pp.slavy.space/docs |
| Integration Guide | https://pp.slavy.space/integration |
| Token Faucets | https://pp.slavy.space/faucets |
| Test Shop Demo | https://testshop.pp.slavy.space |
| GitHub Repository | https://github.com/ivanovslavy/BRSCPP |
| Contact | https://me.slavy.space |
| Demo Video | https://youtube.com/watch?v=3n2e2H9aXAw |

---

## License

MIT License - See LICENSE file for details

---

## Acknowledgments

Built with support from:
- Chainlink (Price feed oracles)
- OpenZeppelin (Smart contract libraries)
- Ethereum Foundation (Sepolia testnet)
- Binance (BSC testnet infrastructure)

---

Last Updated: December 2025

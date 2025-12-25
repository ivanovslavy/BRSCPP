# BRSCPP - Real-time No Custody Payment Infrastructure

**Version:** 2.1  
**Author:** Slavcho Ivanov  
**License:** MIT  
**Status:** Production Beta (December 2025)

**Web Page:** https://brscpp.slavy.space

---

## Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Key Features](#key-features)
4. [Technology Stack](#technology-stack)
5. [Network Deployment Status](#network-deployment-status)
6. [Supported Payment Methods](#supported-payment-methods)
7. [Merchant Dashboard](#merchant-dashboard)
8. [Project Structure](#project-structure)
9. [Payment Flow](#payment-flow)
10. [Testing Resources](#testing-resources)
11. [Development Roadmap](#development-roadmap)
12. [Security](#security)
13. [Performance Metrics](#performance-metrics)
14. [System Requirements](#system-requirements)
15. [Contributing](#contributing)
16. [Career Opportunities](#career-opportunities)
17. [Links and Resources](#links-and-resources)
18. [License](#license)

---

## Overview

BRSCPP is a non-custodial Web3 payment infrastructure enabling merchants to accept both cryptocurrency and fiat payments through a unified API. The system eliminates intermediaries through direct peer-to-peer settlement while providing merchants with traditional payment processor integration via Stripe and PayPal.

**Core Innovation:** Version 2.1 achieves 310% cost reduction compared to v1 by eliminating quote-locking transactions for stablecoin payments. Merchants can now accept direct USDC/USDT transfers with significantly lower gas costs.

### Primary Use Cases

- E-commerce cryptocurrency payment processing
- Cross-border merchant settlements
- Decentralized marketplace integrations
- Fiat-to-crypto payment gateway services
- Multi-method checkout (Crypto + Stripe + PayPal)

### Production Endpoints

| Service | URL | Purpose |
|---------|-----|---------|
| API Server | https://api.brscpp.slavy.space | Payment processing backend |
| Payment Application | https://payment.brscpp.slavy.space | Checkout interface |
| Merchant Dashboard | https://merchant-dashboard.brscpp.slavy.space | Merchant portal |
| Marketing Site | https://brscpp.slavy.space | Documentation and registration |
| Demo Shop | https://testshop-frontend.brscpp.slavy.space | Integration example |

---

## System Architecture
```
┌──────────────────────────────────────────────────────────────────┐
│                         Merchant Layer                           │
│  ┌────────────────┐         ┌──────────────────┐               │
│  │  Web Store     │────────►│  BRSCPP API      │               │
│  │  (Customer)    │  API    │  (Node.js)       │               │
│  └────────────────┘  Call   └────────┬─────────┘               │
└──────────────────────────────────────│──────────────────────────┘
                                        │
         ┌──────────────────────────────┼──────────────────────────┐
         │                              │                          │
         ▼                              ▼                          ▼
┌─────────────────┐          ┌─────────────────┐         ┌─────────────────┐
│  PostgreSQL DB  │          │  Payment App    │         │  Fiat Payments  │
│  (Prisma ORM)   │          │  (React)        │         │  Stripe/PayPal  │
└─────────────────┘          └────────┬────────┘         └─────────────────┘
                                       │
         ┌─────────────────────────────┼─────────────────────────────┐
         │                             │                             │
         ▼                             ▼                             ▼
┌─────────────────┐          ┌─────────────────┐          ┌─────────────────┐
│  Smart Contract │          │   Chainlink     │          │  NFT Gift       │
│  (Multi-chain)  │          │   Oracles       │          │  Contract       │
└────────┬────────┘          └─────────────────┘          └─────────────────┘
         │
         ▼
┌─────────────────┐
│  Customer Wallet│
│  (MetaMask)     │
└─────────────────┘
```

### Component Description

**Backend Layer:**
- RESTful API server handling payment requests and merchant authentication
- PostgreSQL database with Prisma ORM for payment records and merchant data
- JWT and API key-based dual authentication system
- Real-time webhook delivery to merchant endpoints
- Event listener with polling mode for blockchain events

**Blockchain Layer:**
- CryptoPaymentGateway smart contract (Solidity 0.8.27)
- Chainlink price feed integration for ETH/USD, BNB/USD, MATIC/USD oracle data
- Direct stablecoin transfer mechanism (USDC/USDT)
- NFT reward contract with signature-based minting

**Frontend Layer:**
- React-based payment checkout application
- Merchant dashboard for transaction monitoring and settings
- MetaMask integration with multi-chain network switching
- Real-time payment status updates via WebSocket

**Payment Processor Integration:**
- Stripe Connect for credit card processing
- PayPal Commerce Platform for PayPal payments
- Automatic currency conversion (12 fiat currencies to USD)
- Unified webhook system for crypto and fiat payments

---

## Key Features

### Version 2.1 New Features (December 2025)

**Merchant Dashboard:**
- Complete merchant portal with real-time analytics
- Revenue breakdown by payment provider (Crypto/Stripe/PayPal)
- Transaction management with filters and CSV export
- API key management (create, view, revoke)
- Profile management with wallet linking

**Multi-Method Authentication:**
- Email/password registration and login
- Web3 wallet authentication (MetaMask)
- Wallet linking to existing accounts
- Dual auth support (email + web3)

**Payment Provider Integration:**
- Stripe Connect onboarding flow
- PayPal Commerce Platform integration
- Per-merchant payment method configuration
- Real-time connection status display

**Event Listener Improvements:**
- Polling mode for reliable event capture
- Multi-network support (Sepolia, BSC, Polygon)
- Automatic recovery from RPC errors
- Configurable poll intervals per network

### Version 2.0 Features

**Cost Optimization:**
- Direct stablecoin transfers bypass quote-locking mechanism
- 310% reduction in transaction costs for USDC/USDT payments
- Single-transaction settlement for stablecoins

**Dual Payment System:**
- Cryptocurrency payments via smart contracts
- Credit card payments via Stripe integration
- PayPal payments via Commerce Platform
- Unified merchant API for all payment methods

**Merchant Customization:**
- Configurable fee structures (0% to 100% discount capability)
- Early adopter and special merchant whitelist support
- Real-time payment method configuration via dashboard

**Enhanced Integration:**
- NFT gift rewards for all payment types
- Multi-currency support (12 fiat currencies)
- Automatic exchange rate conversion via Chainlink and external APIs

### Core Features

**Non-Custodial Architecture:**
- Direct peer-to-peer fund transfers
- No intermediate custody or escrow
- Merchant receives funds immediately to specified wallet

**Multi-Chain Support:**
- Ethereum Sepolia Testnet
- Binance Smart Chain Testnet
- Polygon Amoy Testnet

**Multi-Token Support:**
- Native tokens: ETH, BNB, MATIC
- Stablecoins: USDC, USDT (direct transfer capability)

**Price Oracle Integration:**
- Chainlink price feeds for native token valuations
- Dual-oracle validation with configurable deviation thresholds
- Staleness protection (1-hour maximum for testnet deployments)

**Security Features:**
- Reentrancy protection (OpenZeppelin ReentrancyGuard)
- Access control (Ownable pattern)
- Emergency pause functionality
- Quote expiration enforcement
- Merchant whitelist system

---

## Technology Stack

### Blockchain

| Component | Technology | Version |
|-----------|-----------|---------|
| Smart Contracts | Solidity | 0.8.27 |
| Development Framework | Hardhat | Latest |
| Security Libraries | OpenZeppelin | 5.x |
| Price Oracles | Chainlink | Latest |
| Web3 Library | ethers.js | 6.x |

### Backend

| Component | Technology | Version |
|-----------|-----------|---------|
| Runtime | Node.js | 20.x |
| Framework | Express.js | 4.x |
| Database | PostgreSQL | 15.x |
| ORM | Prisma | 5.x |
| Authentication | JWT + API Keys | - |
| Payment Processors | Stripe, PayPal | Latest |
| WebSocket | Socket.IO | 4.x |

### Frontend

| Component | Technology | Version |
|-----------|-----------|---------|
| Framework | React | 18.x |
| Build Tool | Vite | 5.x |
| Styling | TailwindCSS | 3.x |
| Routing | React Router | 6.x |
| Web3 Integration | ethers.js | 6.x |

---

## Network Deployment Status

### Smart Contracts

#### Sepolia Testnet

| Contract | Address | Fee | Status |
|----------|---------|-----|--------|
| CryptoPaymentGateway | `0x31b80790726c88f342447DA710fa814d41B141Dd` | 0.5% | Active |
| NFT Gift Contract | `0x3699fcA271bE686f8501aDba0f24dDa4358ebbAA` | - | Active |
| USDC Token | `0xC4De068C028127bdB44670Edb82e6E3Ff4113E49` | - | Active |
| USDT Token | `0x00D75E583DF2998C7582842e69208ad90820Eaa1` | - | Active |

**Chainlink Oracle:** ETH/USD: `0x694AA1769357215DE4FAC081bf1f309aDC325306`

#### BSC Testnet

| Contract | Address | Fee | Status |
|----------|---------|-----|--------|
| CryptoPaymentGateway | `0xee6162f759A647351aB71c7296Fd02bDe7534074` | 0.5% | Active |
| NFT Gift Contract | `0xF166733eD46F7A7185A31eC6E0D6b74C06c57ff8` | - | Active |
| USDC Token | `0x45787D76D24F3b47663eC3DEcc76f46C20Fa0c4C` | - | Active |
| USDT Token | `0xb6dFe9F6810955A3bcbdf7F99418C95Cb073F23D` | - | Active |

**Chainlink Oracle:** BNB/USD: `0x2514895c72f50D8bd4B4F9b1110F0D6bD2c97526`

#### Polygon Amoy Testnet

| Contract | Address | Fee | Status |
|----------|---------|-----|--------|
| CryptoPaymentGateway | `0xC4De068C028127bdB44670Edb82e6E3Ff4113E49` | 0.5% | Active |
| NFT Gift Contract | `0xD24a89dc1686C2F88d33A70250473495459C564a` | - | Active |
| USDC Token | `0x3F6357a74Bec93F6281aA1FC705133eC71a1BaE2` | - | Active |
| USDT Token | `0x9f9eF1DA8A630917383B0b78104887Da1D48dA01` | - | Active |

**Chainlink Oracle:** MATIC/USD: `0x001382149eBa3441043c1c66972b4772963f5D43`

### Backend Services

| Service | Port | Status | Description |
|---------|------|--------|-------------|
| Payment API | 3062 | Active | Main API server |
| Event Listener | - | Active | Blockchain event polling |
| TestShop Backend | 3064 | Active | Demo shop API |

### Frontend Applications

| Application | URL | Status |
|------------|-----|--------|
| Payment App | payment.brscpp.slavy.space | Active |
| Merchant Dashboard | merchant-dashboard.brscpp.slavy.space | Active |
| Marketing Site | brscpp.slavy.space | Active |
| TestShop Frontend | testshop-frontend.brscpp.slavy.space | Active |

---

## Supported Payment Methods

### Cryptocurrency Payments

**Networks:**
- Ethereum (Sepolia Testnet)
- Binance Smart Chain (Testnet)
- Polygon (Amoy Testnet)

**Tokens:**
- ETH (Ethereum native)
- BNB (BSC native)
- MATIC (Polygon native)
- USDC (stablecoin - all networks)
- USDT (stablecoin - all networks)

### Fiat Payments

**Stripe:**
- Credit/Debit card payments
- Stripe Connect for merchant payouts
- Automatic onboarding flow

**PayPal:**
- PayPal Commerce Platform integration
- PayPal account payments
- Merchant onboarding via Partner Referrals

**Supported Currencies:**
USD, EUR, GBP, JPY, CNY, RUB, INR, CAD, AUD, BRL, MXN, KRW

**Currency Conversion:**
All fiat currencies automatically convert to USD for blockchain operations using real-time exchange rates.

---

## Merchant Dashboard

### Features

**Dashboard Overview:**
- All-time revenue statistics
- Last 30 days performance
- Revenue breakdown by payment provider
- Transaction count and success rate
- Quick action links

**Transactions:**
- Full transaction history
- Filter by date, payment method, network, status
- Search by order ID, transaction hash
- CSV export functionality
- Correct blockchain explorer links per network

**Payment Settings:**
- Enable/disable payment methods (Crypto, Stripe, PayPal)
- Network configuration (Sepolia, BSC, Amoy)
- Token selection per network
- Stripe Connect onboarding
- PayPal Commerce Platform onboarding
- Webhook URL and secret configuration

**API Keys:**
- Create new API keys (test/live environment)
- View existing keys with prefix
- Revoke keys
- Copy to clipboard functionality
- Security: full key shown only once on creation

**Profile:**
- Account information (email, company name, website)
- Wallet connection/linking
- Support for both email and Web3 authentication
- Account overview with connection status

### Authentication Methods

**Email Authentication:**
- Registration with email, password, company name
- Login with email and password
- Password hashing with bcrypt

**Web3 Authentication:**
- MetaMask wallet connection
- Signature-based authentication (SIWE)
- Wallet linking to existing accounts
- Dual auth mode support

---

## Project Structure
```
brscpp/
├── pp-v2/                       # Version 2 implementation
│   ├── blockchain/              # Smart contract layer
│   │   ├── contracts/           # Solidity source files
│   │   ├── scripts/             # Deployment scripts
│   │   └── deployed/            # Deployment records
│   │
│   ├── backend/                 # API server layer
│   │   ├── src/
│   │   │   ├── routes/          # API endpoints
│   │   │   ├── services/        # Business logic
│   │   │   ├── middleware/      # Auth middleware
│   │   │   ├── workers/         # Event listener
│   │   │   └── config/          # Configuration
│   │   └── prisma/              # Database schema
│   │
│   ├── frontend/
│   │   ├── payment-page/        # Checkout application
│   │   ├── merchant-dashboard/  # Merchant portal
│   │   └── marketing-app/       # Landing page
│   │
│   └── testshop/                # Demo shop
│       ├── frontend/            # Shop UI
│       └── backend/             # Shop API with WebSocket
│
└── README.md                    # This file
```

---

## Payment Flow

### Cryptocurrency Payment Flow
```
1. Merchant creates payment request via API
2. Backend converts fiat currency to USD (if applicable)
3. Customer redirected to payment application
4. Customer selects blockchain network and token
5. System queries Chainlink oracle for current token price
6. Payment execution:
   - Native Tokens: Quote lock → Payment confirmation
   - Stablecoins: Direct transfer (310% cheaper)
7. Event listener detects blockchain event
8. Payment recorded in database
9. Webhook notification sent to merchant
10. NFT gift available for customer claim
```

### Stripe Payment Flow
```
1. Merchant creates payment request via API
2. Customer selects Stripe payment option
3. Redirect to Stripe Checkout session
4. Stripe processes credit card payment
5. Stripe webhook received and verified
6. Payment recorded in database
7. Webhook notification sent to merchant
8. NFT gift available (requires wallet connection)
```

### PayPal Payment Flow
```
1. Merchant creates payment request via API
2. Customer selects PayPal payment option
3. Redirect to PayPal checkout
4. Customer approves payment in PayPal
5. PayPal webhook received and verified
6. Payment recorded in database
7. Webhook notification sent to merchant
8. NFT gift available (requires wallet connection)
```

---

## Testing Resources

### Test Networks

**Sepolia Testnet:**
- Network ID: 11155111
- Explorer: https://sepolia.etherscan.io
- Faucet: https://sepoliafaucet.com

**BSC Testnet:**
- Network ID: 97
- Explorer: https://testnet.bscscan.com
- Faucet: https://testnet.bnbchain.org/faucet-smart

**Polygon Amoy:**
- Network ID: 80002
- Explorer: https://amoy.polygonscan.com

### BRSCPP Token Faucets

Access test USDC and USDT at: https://brscpp.slavy.space/faucets

- USDC: 10,000 per claim
- USDT: 10,000 per claim
- Cooldown: 24 hours per address

### Demo Shop

Complete integration demonstration: https://testshop-frontend.brscpp.slavy.space

**Features:**
- Multi-currency product pricing (12 currencies)
- Network and token selection
- Crypto, Stripe, and PayPal checkout
- Real-time WebSocket payment confirmation
- NFT gift claiming

---

## Development Roadmap

### 2026 Roadmap

**Q1 2026:**
- WooCommerce plugin release
- WordPress widget development
- Extended documentation

**Q2 2026:**
- Marketing campaign launch
- Community building (LinkedIn, X, Discord)
- Video advertisements

**Q3 2026:**
- Professional smart contract audit
- Mainnet preparation
- Production server deployment

**Q4 2026:**
- Company establishment
- MiCA L1 license acquisition
- Mainnet launch (Ethereum, BSC, Polygon)

---

## Security

### Smart Contract Security

- Reentrancy guard (OpenZeppelin)
- Access control (Ownable)
- Emergency pause functionality
- Oracle staleness validation
- Quote expiration enforcement

### Backend Security

- JWT tokens with 30-day expiration
- API key authentication
- Password hashing (bcrypt)
- HTTPS/TLS encryption
- Rate limiting
- SQL injection prevention (Prisma)
- CORS policy enforcement

### Reporting Vulnerabilities

Contact: https://me.slavy.space

---

## Performance Metrics

### Transaction Costs (Testnet)

| Payment Method | Gas Cost | USD Equivalent |
|---------------|----------|----------------|
| ETH Payment (Quote) | ~150,000 gas | ~$0.50 |
| USDC Direct Transfer | ~65,000 gas | ~$0.15 |
| Stripe Payment | $0.30 + 2.9% | Variable |
| PayPal Payment | 2.9% + $0.30 | Variable |

### Processing Times

| Step | Duration |
|------|----------|
| Payment Request Creation | <100ms |
| Quote Generation | <500ms |
| Blockchain Confirmation | 12-15s |
| Webhook Delivery | <1s |

---

## System Requirements

### Development Environment

- Node.js 20.x or higher
- PostgreSQL 15.x or higher
- 8GB RAM recommended
- 50GB SSD storage

### Client Requirements

- Modern browser (Chrome, Firefox, Safari)
- MetaMask browser extension (for crypto payments)

---

## Contributing

Contributions welcome:
- Bug fixes and security improvements
- Performance optimizations
- Documentation improvements
- Integration testing

Contact: https://me.slavy.space

---

## Career Opportunities

**Open Positions:**
- Marketing Specialist
- React Developer / UI Designer

Compensation: Negotiable salary or co-ownership

Apply: https://me.slavy.space

---

## Links and Resources

| Resource | URL |
|----------|-----|
| Main Website | https://brscpp.slavy.space |
| API Documentation | https://brscpp.slavy.space/docs |
| Demo Shop | https://testshop-frontend.brscpp.slavy.space |
| Merchant Dashboard | https://merchant-dashboard.brscpp.slavy.space |
| GitHub Repository | https://github.com/ivanovslavy/BRSCPP |

---

## License

MIT License

Copyright (c) 2025 Slavcho Ivanov

---

**Last Updated:** December 24, 2025  
**Document Version:** 2.1  
**Author:** Slavcho Ivanov

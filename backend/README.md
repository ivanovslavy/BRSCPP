# BRSCPP Backend API

Payment gateway backend system for cryptocurrency and fiat payments with unified merchant API.

**Version:** 2.1  
**Author:** Slavcho Ivanov  
**Service URL:** https://api.brscpp.slavy.space  
**Status:** Production Beta (December 2025)

---

## Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Technology Stack](#technology-stack)
4. [Database Schema](#database-schema)
5. [API Endpoints](#api-endpoints)
6. [Payment Flow](#payment-flow)
7. [Authentication](#authentication)
8. [Multi-Currency Support](#multi-currency-support)
9. [Stripe Integration](#stripe-integration)
10. [PayPal Integration](#paypal-integration)
11. [Webhook System](#webhook-system)
12. [NFT Gift System](#nft-gift-system)
13. [Event Listener](#event-listener)
14. [Configuration](#configuration)
15. [Installation](#installation)
16. [Deployment](#deployment)
17. [Testing](#testing)
18. [Error Handling](#error-handling)
19. [Monitoring](#monitoring)
20. [Security](#security)
21. [Performance](#performance)
22. [Troubleshooting](#troubleshooting)

---

## Overview

BRSCPP v2.1 backend provides a unified API for merchants to accept cryptocurrency, credit card (Stripe), and PayPal payments. The system handles payment processing, currency conversion, blockchain interaction, fiat processor integration, webhook delivery, and NFT reward distribution.

### Key Features

**Payment Processing:**
- Cryptocurrency payments via smart contracts
- Credit card payments via Stripe Connect
- PayPal payments via Commerce Platform
- Unified webhook notifications for all payment types
- NFT gift rewards for all successful payments

**Multi-Currency:**
- Support for 12 fiat currencies
- Automatic conversion to USD for blockchain operations
- Real-time exchange rates via ExchangeRate-API
- Fallback to Frankfurter API

**Merchant Tools:**
- Dashboard authentication with JWT + Web3
- API key management (create, view, revoke)
- Payment method configuration per merchant
- Transaction history with filters and export
- Webhook configuration and testing
- Stripe/PayPal Connect onboarding

**Blockchain Integration:**
- Multi-chain support (Sepolia, BSC Testnet, Polygon Amoy)
- Multi-token support (ETH, BNB, MATIC, USDC, USDT)
- Direct stablecoin transfers (310% cost reduction)
- Event-driven payment confirmation via polling

### Version 2.1 New Features (December 2025)

- **PayPal Commerce Platform** integration
- **Web3 Authentication** (MetaMask login/register)
- **Wallet Linking** to existing accounts
- **Event Listener Polling Mode** for reliable blockchain events
- **API Keys Management** (create, view, revoke)
- **Stripe Connect** onboarding flow
- **Revenue Analytics** by payment provider

---

## System Architecture

### Core Components
```
┌─────────────────────────────────────────────────────────────┐
│                     API Server Layer                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Express    │  │     Auth     │  │  Rate Limit  │     │
│  │   Routes     │  │  Middleware  │  │   Logging    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
    ┌───────────────────────┼───────────────────────┐
    │                       │                       │
    ▼                       ▼                       ▼
┌──────────────┐   ┌─────────────────┐   ┌──────────────────┐
│  PostgreSQL  │   │  Event Listener │   │  Payment Services│
│   Database   │   │   (Polling)     │   │  Stripe/PayPal   │
│   (Prisma)   │   └─────────────────┘   └──────────────────┘
└──────────────┘            │                      │
                            ▼                      ▼
                   ┌─────────────────┐   ┌──────────────────┐
                   │   Blockchain    │   │    Webhooks      │
                   │   (ethers.js)   │   │    Delivery      │
                   └─────────────────┘   └──────────────────┘
```

### Service Components

**API Server** (`src/server.js`)
- Express.js REST API
- JWT authentication for dashboard
- API key authentication for integrations
- Web3 signature verification (SIWE)
- Stripe/PayPal webhook handlers (raw body)
- CORS configuration and rate limiting

**Event Listener Worker** (`src/workers/event-listener.js`)
- Polling mode for reliable event capture
- Monitors PaymentProcessed and DirectPaymentProcessed events
- Configurable poll intervals per network
- Automatic recovery from RPC errors
- Updates payment status and triggers webhooks

**Authentication Service** (`src/services/auth.service.js`)
- Email/password registration and login
- Web3 wallet registration and login
- Wallet linking to existing accounts
- JWT token generation (30-day expiry)
- Nonce-based signature verification

**Stripe Service** (`src/services/stripe.service.js`)
- Connect account creation
- Onboarding link generation
- Checkout session creation
- Webhook signature verification

**PayPal Service** (`src/services/paypal.service.js`)
- Partner referral creation
- Merchant onboarding
- Order creation and capture
- Webhook verification

**Webhook Service** (`src/services/webhook.service.js`)
- HMAC signature generation
- Retry logic with exponential backoff
- Delivery tracking and logging

---

## Technology Stack

### Backend Framework

| Component | Technology | Version |
|-----------|-----------|---------|
| Runtime | Node.js | 20.x |
| Framework | Express.js | 4.x |
| Database | PostgreSQL | 15.x |
| ORM | Prisma | 5.x |

### Authentication

| Component | Technology |
|-----------|-----------|
| API Keys | SHA-256 hashing |
| JWT | jsonwebtoken (30d expiry) |
| Passwords | bcrypt (10 rounds) |
| Web3 Auth | SIWE (Sign-In with Ethereum) |

### Blockchain

| Component | Technology | Version |
|-----------|-----------|---------|
| Web3 Library | ethers.js | 6.x |
| Networks | Sepolia, BSC, Amoy | Testnet |
| Oracles | Chainlink | Latest |

### External Services

| Service | Purpose |
|---------|---------|
| Stripe | Credit card processing |
| PayPal | PayPal payments |
| ExchangeRate-API | Currency conversion |
| Frankfurter | Exchange rate fallback |

---

## Database Schema

### Merchants Table
```sql
CREATE TABLE merchants (
  id                          UUID PRIMARY KEY,
  email                       VARCHAR(255) UNIQUE NOT NULL,
  password_hash               VARCHAR(255),
  wallet_address              VARCHAR(42) UNIQUE,
  auth_method                 VARCHAR(20) DEFAULT 'email',
  company_name                VARCHAR(255),
  website                     VARCHAR(500),
  webhook_url                 VARCHAR(500),
  webhook_secret              VARCHAR(64),
  api_key                     VARCHAR(100) UNIQUE,
  payment_methods             JSONB DEFAULT '{}',
  stripe_account_id           VARCHAR(255),
  stripe_connected            BOOLEAN DEFAULT FALSE,
  stripe_onboarding_completed BOOLEAN DEFAULT FALSE,
  paypal_merchant_id          VARCHAR(255),
  paypal_connected            BOOLEAN DEFAULT FALSE,
  paypal_onboarding_completed BOOLEAN DEFAULT FALSE,
  paypal_tracking_id          VARCHAR(255),
  status                      VARCHAR(20) DEFAULT 'active',
  created_at                  TIMESTAMP DEFAULT NOW(),
  updated_at                  TIMESTAMP DEFAULT NOW()
);
```

### API Keys Table
```sql
CREATE TABLE api_keys (
  id            UUID PRIMARY KEY,
  merchant_id   UUID REFERENCES merchants(id) ON DELETE CASCADE,
  key_hash      VARCHAR(255) UNIQUE NOT NULL,
  key_prefix    VARCHAR(20) NOT NULL,
  name          VARCHAR(100),
  environment   VARCHAR(10),
  permissions   JSONB DEFAULT '[]',
  last_used_at  TIMESTAMP,
  expires_at    TIMESTAMP,
  is_active     BOOLEAN DEFAULT TRUE,
  revoked       BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMP DEFAULT NOW()
);
```

### Auth Nonces Table
```sql
CREATE TABLE auth_nonces (
  id              UUID PRIMARY KEY,
  wallet_address  VARCHAR(42) NOT NULL,
  nonce           VARCHAR(64) UNIQUE NOT NULL,
  used            BOOLEAN DEFAULT FALSE,
  expires_at      TIMESTAMP NOT NULL,
  created_at      TIMESTAMP DEFAULT NOW()
);
```

### Payments Table
```sql
CREATE TABLE payments (
  id                    UUID PRIMARY KEY,
  payment_request_id    UUID REFERENCES payment_requests(id),
  merchant_id           UUID REFERENCES merchants(id),
  order_id              VARCHAR(255) NOT NULL,
  customer_address      VARCHAR(42),
  merchant_address      VARCHAR(42),
  token_address         VARCHAR(42),
  token_amount          VARCHAR(78),
  merchant_amount       VARCHAR(78),
  fee_amount            VARCHAR(78),
  usd_amount            DECIMAL(18,2),
  tx_hash               VARCHAR(66),
  block_number          BIGINT,
  network               VARCHAR(20),
  status                VARCHAR(20) DEFAULT 'pending',
  payment_provider      VARCHAR(20),
  provider_payment_id   VARCHAR(255),
  provider_fee_amount   DECIMAL(18,4),
  provider_metadata     JSONB,
  payment_mode          VARCHAR(20),
  nft_claimed           BOOLEAN DEFAULT FALSE,
  created_at            TIMESTAMP DEFAULT NOW()
);
```

---

## API Endpoints

### Public Endpoints

**System Information**
```http
GET /health
GET /health/detailed
GET /api/info
```

**Customer Payment Flow**
```http
GET  /api/customer/payment/:orderId
POST /api/customer/payment/:orderId/stripe
POST /api/customer/payment/:orderId/paypal
GET  /api/customer/payment/:orderId/status
```

**NFT Gift System**
```http
GET  /api/customer/nft-gift/supply/:network
POST /api/customer/nft-gift/prepare
POST /api/customer/nft-gift/record
```

### Authentication Endpoints

**Registration and Login**
```http
POST /api/auth/register           # Email registration
POST /api/auth/login              # Email login
POST /api/auth/web3/nonce         # Get Web3 nonce
POST /api/auth/web3/login         # Web3 login
POST /api/auth/web3/register      # Web3 registration
POST /api/auth/link-wallet        # Link wallet to account
GET  /api/auth/me                 # Get current user
```

**Dashboard Endpoints (JWT Required)**
```http
GET /api/auth/dashboard/stats          # Revenue stats by provider
GET /api/auth/dashboard/transactions   # Transaction history with filters
PUT /api/auth/profile                  # Update profile
```

### Merchant API Endpoints (API Key Required)

**Payment Request Management**
```http
POST /api/merchant/payment-request
GET  /api/merchant/payment-requests
GET  /api/merchant/payment-request/:id
```

**API Key Management (JWT Auth)**
```http
GET    /api/merchant/apikeys          # List API keys
POST   /api/merchant/apikeys          # Create new key
DELETE /api/merchant/apikeys/:keyId   # Revoke key
```

**Settings Management**
```http
GET  /api/merchant/settings
PUT  /api/merchant/settings
PUT  /api/merchant/webhook
```

### Stripe Connect Endpoints (JWT Auth)
```http
POST /api/stripe/connect/create       # Create Connect account
POST /api/stripe/connect/onboarding   # Get onboarding link
GET  /api/stripe/connect/status       # Check connection status
POST /api/stripe/create-session       # Create checkout session
```

### PayPal Endpoints (JWT Auth)
```http
POST /api/paypal/onboard              # Start onboarding
GET  /api/paypal/merchant-status/:id  # Check connection status
POST /api/paypal/create-order         # Create PayPal order
POST /api/paypal/capture-order        # Capture payment
```

---

## Authentication

### Dual Authentication System

BRSCPP supports two authentication methods that can be used together:

**Email/Password Authentication:**
- Traditional registration with email, password, company name
- bcrypt password hashing (10 rounds)
- JWT tokens with 30-day expiration

**Web3 Wallet Authentication:**
- MetaMask wallet connection
- Nonce-based signature verification
- Automatic account creation on first login
- Can be linked to existing email accounts

### API Key Authentication

**Format:**
```
Test:       brscpp_test_[64 hex characters]
Production: brscpp_live_[64 hex characters]
```

**Usage:**
```http
Authorization: Bearer brscpp_live_abc123...
```

**Security:**
- Keys shown only once on creation
- Only hash stored in database
- Can be revoked but not recovered

### Web3 Authentication Flow

**1. Get Nonce:**
```bash
curl -X POST https://api.brscpp.slavy.space/api/auth/web3/nonce \
  -H "Content-Type: application/json" \
  -d '{"walletAddress": "0x..."}'
```

**2. Sign Message (Frontend):**
```javascript
const message = `Sign in to BRSCPP Merchant Dashboard\n\nNonce: ${nonce}\nAddress: ${walletAddress}`;
const signature = await signer.signMessage(message);
```

**3. Login/Register:**
```bash
curl -X POST https://api.brscpp.slavy.space/api/auth/web3/login \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0x...",
    "signature": "0x...",
    "nonce": "abc123..."
  }'
```

### Wallet Linking

Link wallet to existing email account:
```bash
curl -X POST https://api.brscpp.slavy.space/api/auth/link-wallet \
  -H "Authorization: Bearer JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0x...",
    "signature": "0x...",
    "nonce": "abc123..."
  }'
```

---

## Stripe Integration

### Stripe Connect

Merchants connect their Stripe accounts for direct payouts:

**1. Create Connect Account:**
```bash
curl -X POST https://api.brscpp.slavy.space/api/stripe/connect/create \
  -H "Authorization: Bearer JWT_TOKEN"
```

**2. Get Onboarding Link:**
```bash
curl -X POST https://api.brscpp.slavy.space/api/stripe/connect/onboarding \
  -H "Authorization: Bearer JWT_TOKEN"
```

**3. Check Status:**
```bash
curl https://api.brscpp.slavy.space/api/stripe/connect/status \
  -H "Authorization: Bearer JWT_TOKEN"
```

### Checkout Flow
```javascript
const session = await stripe.checkout.sessions.create({
  payment_method_types: ['card'],
  mode: 'payment',
  success_url: `${FRONTEND_URL}/success/${orderId}`,
  cancel_url: `${FRONTEND_URL}/checkout/${orderId}`,
  metadata: { orderId, merchantId },
  line_items: [{ ... }],
  payment_intent_data: {
    application_fee_amount: platformFeeCents,
    transfer_data: { destination: merchant.stripeAccountId }
  }
});
```

---

## PayPal Integration

### PayPal Commerce Platform

Merchants connect via Partner Referrals:

**1. Start Onboarding:**
```bash
curl -X POST https://api.brscpp.slavy.space/api/paypal/onboard \
  -H "Authorization: Bearer JWT_TOKEN"
```

**2. Check Status:**
```bash
curl https://api.brscpp.slavy.space/api/paypal/merchant-status/MERCHANT_ID \
  -H "Authorization: Bearer JWT_TOKEN"
```

### Payment Flow
```javascript
// Create order
const order = await paypal.orders.create({
  intent: 'CAPTURE',
  purchase_units: [{
    reference_id: orderId,
    amount: { currency_code: 'USD', value: amount }
  }]
});

// Capture after approval
const capture = await paypal.orders.capture(orderId);
```

---

## Event Listener

### Polling Mode Architecture

The event listener uses polling instead of WebSocket-style `.on()` listeners for better reliability with public RPC nodes:
```javascript
// Configuration per network
const NETWORKS = [
  { name: 'sepolia', pollInterval: 15000 },    // 15 seconds
  { name: 'bscTestnet', pollInterval: 10000 }, // 10 seconds
  { name: 'amoy', pollInterval: 10000 }        // 10 seconds
];
```

### Poll Cycle

1. Get current block number
2. Query events from lastProcessedBlock to currentBlock
3. Process PaymentProcessed events
4. Process DirectPaymentProcessed events
5. Update lastProcessedBlock
6. Schedule next poll

### Error Recovery
```javascript
} catch (error) {
  console.error(`❌ [${networkName}] Poll error:`, error.message);
  
  // Still update block to avoid getting stuck
  if (actualToBlock) {
    this.networks[networkName].lastProcessedBlock = actualToBlock;
  }
}
```

### Events Monitored
```solidity
event PaymentProcessed(
  uint256 indexed paymentId,
  bytes32 indexed quoteId,
  address indexed merchant,
  address customer,
  address token,
  uint256 totalAmount,
  uint256 merchantAmount,
  uint256 feeAmount,
  uint256 usdAmount,
  string orderId,
  uint256 blockNumber
);

event DirectPaymentProcessed(
  uint256 indexed paymentId,
  address indexed merchant,
  address indexed customer,
  address token,
  uint256 amount,
  uint256 merchantAmount,
  uint256 feeAmount,
  string orderId,
  uint256 blockNumber
);
```

---

## Webhook System

### Unified Webhook Payload

All payment methods send the same webhook format:
```json
{
  "event": "payment.completed",
  "payment": {
    "id": "uuid",
    "orderId": "ORDER-123",
    "txHash": "0x...",
    "usdAmount": 100.00,
    "network": "sepolia|stripe|paypal",
    "customerAddress": "0x...",
    "tokenAmount": "100000000"
  },
  "timestamp": "2025-12-24T10:00:00.000Z"
}
```

### Headers
```http
Content-Type: application/json
X-BRSCPP-Event: payment.completed
X-BRSCPP-Signature: sha256=abc123...
```

### Retry Logic

- **Attempts:** 3
- **Delays:** 2s, 4s, 8s (exponential backoff)
- **Timeout:** 15 seconds per attempt
- **Success:** HTTP 200-299

---

## Configuration

### Environment Variables
```bash
# Server
NODE_ENV=production
PORT=3062
API_BASE_URL=https://api.brscpp.slavy.space
FRONTEND_URL=https://payment.brscpp.slavy.space

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/brscpp_v2

# JWT
JWT_SECRET=your-secret-min-32-chars
JWT_EXPIRES_IN=30d

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# PayPal
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
PAYPAL_PARTNER_ID=...
PAYPAL_BN_CODE=...
PAYPAL_WEBHOOK_ID=...

# Blockchain - Sepolia
SEPOLIA_RPC_URL=https://rpc.ankr.com/eth_sepolia/...
GATEWAY_ADDRESS_SEPOLIA=0x31b80790726c88f342447DA710fa814d41B141Dd

# Blockchain - BSC Testnet (use Ankr, NOT public Binance RPC)
BSC_TESTNET_RPC_URL=https://rpc.ankr.com/bsc_testnet_chapel/...
GATEWAY_ADDRESS_BSC_TESTNET=0xee6162f759A647351aB71c7296Fd02bDe7534074

# Blockchain - Polygon Amoy
AMOY_RPC_URL=https://rpc-amoy.polygon.technology
GATEWAY_ADDRESS_AMOY=0xC4De068C028127bdB44670Edb82e6E3Ff4113E49
```

**Important:** Use Ankr RPC for BSC Testnet. Public Binance RPC doesn't support `queryFilter` for event polling.

---

## Deployment

### Systemd Services

**API Server:**
```ini
# /etc/systemd/system/brscpp-v2-api.service
[Service]
ExecStart=/usr/bin/node src/server.js
WorkingDirectory=/home/slavy/brscpp/pp-v2/backend
```

**Event Listener:**
```ini
# /etc/systemd/system/brscpp-v2-listener.service
[Service]
ExecStart=/usr/bin/node src/workers/event-listener.js
WorkingDirectory=/home/slavy/brscpp/pp-v2/backend
```

### Service Management
```bash
# Start/stop
sudo systemctl start brscpp-v2-api
sudo systemctl start brscpp-v2-listener

# View logs
tail -f ~/brscpp/pp-v2/backend/logs/api.log
tail -f ~/brscpp/pp-v2/backend/logs/listener.log

# Restart after changes
sudo systemctl restart brscpp-v2-api
sudo systemctl restart brscpp-v2-listener
```

---

## Troubleshooting

### Event Listener Not Capturing Events

**Symptom:** Payments complete on blockchain but status stays "pending"

**Check:**
```bash
# Verify listener is running
sudo systemctl status brscpp-v2-listener

# Check logs for errors
tail -50 ~/brscpp/pp-v2/backend/logs/listener.log
```

**Common causes:**
1. Wrong RPC URL (use Ankr for BSC)
2. Duplicate env variables (last one wins)
3. Gateway address mismatch

### BSC Events Not Working

**Problem:** BSC uses public RPC that doesn't support `queryFilter`

**Solution:** Use Ankr RPC with API key:
```bash
BSC_TESTNET_RPC_URL=https://rpc.ankr.com/bsc_testnet_chapel/YOUR_KEY
```

### Webhook Not Received

**Check:**
```bash
# View webhook deliveries
psql brscpp_v2 -c "SELECT * FROM webhook_deliveries ORDER BY created_at DESC LIMIT 5"

# Check listener logs for webhook sends
grep "webhook" ~/brscpp/pp-v2/backend/logs/listener.log
```

---

## Related Documentation

- [Main Project Documentation](../README.md)
- [Smart Contracts](../blockchain/README.md)
- [Payment Application](../frontend/payment-app/README.md)
- [Merchant Dashboard](../frontend/merchant-dashboard/README.md)

---

**Last Updated:** December 24, 2025  
**Document Version:** 2.1  
**Author:** Slavcho Ivanov

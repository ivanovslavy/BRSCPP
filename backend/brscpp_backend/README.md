# BRSCPP Backend API

Payment gateway backend system for decentralized cryptocurrency payments on EVM-compatible blockchains.

**Service URL:** https://api.pp.slavy.space

**Status:** Live (Beta Testing)

---

## Navigation

- [Main Project README](../../README.md)
- [Smart Contracts Documentation](../../blockchain/README.md)
- [Test Shop Backend](../testshop_backend/README.md)
- [Marketing Site](../../frontend/marketing_app/README.md)
- [Payment App](../../frontend/payment_app/README.md)
- [Test Shop Frontend](../../frontend/testshop_app/README.md)

---

## System Architecture

### Core Components

**API Server**
- Framework: Express.js
- Authentication: API key with SHA-256 hashing
- Rate limiting: 100 requests/minute per IP
- Logging: Winston logger
- CORS: Configured for frontend applications

**Database Layer**
- Database: PostgreSQL 16.x
- ORM: Prisma
- Schema: Merchants, API keys, payment requests, payments, webhooks

**Event Listener Worker**
- Monitors blockchain for PaymentProcessed events
- Processes payments and updates database
- Sends webhook notifications to merchants
- Automatic retry with exponential backoff

**Blockchain Integration**
- Library: ethers.js v6
- Networks: Sepolia, BSC Testnet, Polygon Amoy
- Functions: Quote creation, payment verification, event monitoring
- Tokens: Native (ETH, BNB), USDC, USDT

### Security Features

- API key authentication
- Rate limiting per IP
- Quote creator validation
- Quote expiration enforcement (60-120 seconds)
- One-time quote usage
- Amount verification
- HMAC webhook signatures

---

## Database Schema

### Merchants
```sql
id              UUID PRIMARY KEY
walletAddress   STRING UNIQUE NOT NULL
email           STRING UNIQUE NOT NULL
companyName     STRING
webhookUrl      STRING
webhookSecret   STRING
status          ENUM (active, suspended)
createdAt       TIMESTAMP
updatedAt       TIMESTAMP
```

### ApiKeys
```sql
id              UUID PRIMARY KEY
merchantId      UUID FOREIGN KEY
keyHash         STRING NOT NULL
keyPrefix       STRING NOT NULL
name            STRING
permissions     JSON
lastUsedAt      TIMESTAMP
expiresAt       TIMESTAMP
revoked         BOOLEAN
createdAt       TIMESTAMP
```

### PaymentRequests
```sql
id              UUID PRIMARY KEY
merchantId      UUID FOREIGN KEY
orderId         STRING UNIQUE NOT NULL
amountUsd       DECIMAL NOT NULL
currency        STRING (USD, EUR, GBP, etc.)
network         STRING (sepolia, bscTestnet)
description     STRING
customerEmail   STRING
metadata        JSON
status          ENUM (pending, processing, completed, expired)
quoteId         STRING
paymentUrl      STRING
expiresAt       TIMESTAMP
completedAt     TIMESTAMP
createdAt       TIMESTAMP
```

### Payments
```sql
id                  UUID PRIMARY KEY
paymentRequestId    UUID FOREIGN KEY
merchantId          UUID FOREIGN KEY
paymentIdOnchain    STRING
quoteId             STRING
orderId             STRING
customerAddress     STRING
merchantAddress     STRING
tokenAddress        STRING
tokenAmount         STRING
merchantAmount      STRING
feeAmount           STRING
usdAmount           DECIMAL
txHash              STRING
blockNumber         INTEGER
network             STRING
status              ENUM (pending, confirmed, failed)
createdAt           TIMESTAMP
```

### WebhookDeliveries
```sql
id              UUID PRIMARY KEY
merchantId      UUID FOREIGN KEY
paymentId       UUID FOREIGN KEY
eventType       STRING (payment.completed)
webhookUrl      STRING
payload         JSON
responseStatus  INTEGER
responseBody    STRING
attempt         INTEGER
delivered       BOOLEAN
createdAt       TIMESTAMP
```

---

## API Endpoints

### Public Endpoints

**Health Check**
```
GET /health
GET /health/detailed
```

**API Information**
```
GET /
GET /api/info
```

**Customer Flow**
```
GET  /api/customer/payment/:orderId
POST /api/customer/payment/:orderId/quote
POST /api/customer/payment/:orderId/confirm
GET  /api/customer/payment/:orderId/status
```

**Quote Management**
```
POST /api/quote/preview
POST /api/quote/create
GET  /api/quote/:quoteId
```

**Payment Verification**
```
POST /api/payment/eth/process
POST /api/payment/token/process
GET  /api/payment/status/:txHash
POST /api/payment/verify
```

### Protected Endpoints (API Key Required)

**Merchant Management**
```
POST /api/merchant/register
GET  /api/merchant/profile
PUT  /api/merchant/profile
```

**API Key Management**
```
POST   /api/merchant/apikeys
GET    /api/merchant/apikeys
DELETE /api/merchant/apikeys/:id
```

**Payment Requests**
```
POST /api/merchant/payment-request
GET  /api/merchant/payment-requests
GET  /api/merchant/payment-request/:id
```

**Payment History**
```
GET /api/merchant/payments
GET /api/merchant/payments/stats
```

**Webhook Configuration**
```
POST   /api/merchant/webhook
DELETE /api/merchant/webhook
POST   /api/merchant/webhook/test
```

**Admin & Analytics**
```
GET  /api/admin/stats/system
GET  /api/admin/stats/payments
GET  /api/admin/stats/merchants
GET  /api/admin/activity/recent
GET  /api/admin/webhooks/failed
POST /api/admin/webhooks/retry
```

---

## Payment Flow

### Standard Payment Process

1. Merchant creates payment request via API
   - POST /api/merchant/payment-request
   - Parameters: orderId, amountUsd, currency, network, description

2. System returns payment URL
   - Format: https://app.pp.slavy.space/checkout/:orderId

3. Customer visits payment URL
   - Selects network (Sepolia or BSC Testnet)
   - Selects token (ETH, BNB, USDC, USDT)

4. Backend creates price quote on blockchain
   - Calls CryptoPaymentGateway.lockPriceQuote()
   - Quote valid for 60-120 seconds
   - Returns: quoteId, tokenAmount, validUntil

5. Customer confirms payment in wallet
   - Sends transaction with quoteId reference
   - Gateway contract processes payment
   - Emits PaymentProcessed event

6. Event Listener detects blockchain event
   - Parses event data
   - Updates database
   - Sends webhook to merchant

7. Merchant receives webhook notification
   - Verifies HMAC signature
   - Fulfills order
   - Returns 200 OK

### Quote Creation Details

**Request Parameters:**
```json
{
  "tokenAddress": "0x...",
  "amountUsdCents": 10000,
  "creatorAddress": "0x..."
}
```

**Response:**
```json
{
  "quoteId": "0x...",
  "tokenAmount": "100500000",
  "tokenPrice": "0.999850",
  "validUntil": "2024-12-09T12:02:00.000Z",
  "txHash": "0x..."
}
```

**Blockchain Event:**
```solidity
event PriceQuoteGenerated(
    bytes32 indexed quoteId,
    address indexed creator,
    address token,
    uint256 tokenAmount,
    uint256 validUntil
);
```

### Webhook Notification Format

**Headers:**
```
X-BRSCPP-Event: payment.completed
X-BRSCPP-Merchant-Id: uuid
X-BRSCPP-Signature: hmac-sha256
X-BRSCPP-Timestamp: iso8601
Content-Type: application/json
```

**Payload:**
```json
{
  "event": "payment.completed",
  "payment": {
    "id": "uuid",
    "orderId": "ORDER-123",
    "quoteId": "0x...",
    "txHash": "0x...",
    "customerAddress": "0x...",
    "merchantAddress": "0x...",
    "tokenAddress": "0x...",
    "tokenSymbol": "USDC",
    "tokenAmount": "100.500000",
    "merchantAmount": "99.495000",
    "feeAmount": "1.005000",
    "usdAmount": 100.00,
    "network": "sepolia",
    "blockNumber": 12345678
  },
  "merchant": {
    "id": "uuid",
    "walletAddress": "0x...",
    "companyName": "Example Store"
  },
  "timestamp": "2024-12-09T12:00:00.000Z"
}
```

**Retry Logic:**
- Attempts: 3
- Delays: 2s, 4s, 8s (exponential backoff)
- Timeout: 15 seconds per attempt

---

## Configuration

### Environment Variables
```bash
# Server
NODE_ENV=production
PORT=3052

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/brscpp

# Blockchain - Sepolia
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
SEPOLIA_GATEWAY_ADDRESS=0x1378329ABE689594355a95bDAbEaBF015ef9CF39
SEPOLIA_PRIVATE_KEY=0x...

# Blockchain - BSC Testnet
BSC_TESTNET_RPC_URL=https://data-seed-prebsc-1-s1.bnbchain.org:8545
BSC_TESTNET_GATEWAY_ADDRESS=0x0E2878bC634Ac0c1C4d3dA22CFb171Fb67a2d6e7
BSC_TESTNET_PRIVATE_KEY=0x...

# Blockchain - Polygon Amoy
AMOY_RPC_URL=https://rpc-amoy.polygon.technology
AMOY_GATEWAY_ADDRESS=0x6d125b85f49066f7BEaB3ffEa412b6B54948E539
AMOY_PRIVATE_KEY=0x...

# Security
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
```

### CORS Configuration

**Allowed Origins:**
```
https://pp.slavy.space
https://app.pp.slavy.space
https://testshop.pp.slavy.space
http://localhost:3000
http://localhost:3001
http://localhost:3051
```

**Methods:** GET, POST, PUT, DELETE, OPTIONS

**Credentials:** Enabled

**Max Age:** 86400 seconds

---

## Installation

### Prerequisites
```bash
Node.js >= 18.x
PostgreSQL >= 16.x
npm or yarn
```

### Setup Steps
```bash
# Install dependencies
npm install

# Create database
createdb brscpp

# Configure environment
cp .env.example .env
nano .env

# Run migrations
npx prisma migrate dev --name init

# Generate Prisma client
npx prisma generate

# Start services
npm start                    # API server
npm run worker               # Event listener
```

---

## Deployment

### Systemd Services

**API Server:**
```ini
[Unit]
Description=BRSCPP API Server
After=network.target postgresql.service

[Service]
Type=simple
User=slavy
WorkingDirectory=/home/slavy/pp/backend
ExecStart=/usr/bin/node src/server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

**Event Listener:**
```ini
[Unit]
Description=BRSCPP Event Listener
After=network.target postgresql.service

[Service]
Type=simple
User=slavy
WorkingDirectory=/home/slavy/pp/backend
ExecStart=/usr/bin/node src/workers/event-listener.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

### Service Management
```bash
# Start services
sudo systemctl start brscpp-api.service
sudo systemctl start brscpp-listener.service

# Check status
sudo systemctl status brscpp-api.service
sudo systemctl status brscpp-listener.service

# View logs
sudo journalctl -u brscpp-api.service -f
sudo journalctl -u brscpp-listener.service -f

# Restart services
sudo systemctl restart brscpp-api.service
sudo systemctl restart brscpp-listener.service
```

---

## API Authentication

### API Key Format
```
Test:       pk_test_[48 hex characters]
Production: pk_live_[48 hex characters]
```

### Authentication Header
```
Authorization: Bearer pk_test_1234567890abcdef...
```

### Key Generation
```javascript
const crypto = require('crypto');
const key = crypto.randomBytes(24).toString('hex');
const prefix = `pk_test_${key}`;
const hash = crypto.createHash('sha256').update(prefix).digest('hex');
```

### Key Management

- Multiple keys per merchant
- Named keys for organization
- Revocable without deletion
- Last used timestamp tracking
- Optional expiration dates

---

## Error Handling

### Response Format
```json
{
  "error": "Error type",
  "message": "Detailed message",
  "timestamp": "2024-12-09T12:00:00.000Z"
}
```

### HTTP Status Codes
```
200 OK                  Success
201 Created             Resource created
400 Bad Request         Invalid parameters
401 Unauthorized        Missing/invalid API key
403 Forbidden           Insufficient permissions
404 Not Found           Resource not found
409 Conflict            Duplicate resource
410 Gone                Quote expired
429 Too Many Requests   Rate limit exceeded
500 Internal Error      Server error
503 Service Unavailable Blockchain unavailable
```

### Common Errors
```
Invalid API key → 401
Missing fields → 400
Quote expired → 410
Quote already used → 400
Payment not found → 404
Rate limit → 429
```

---

## Monitoring

### Health Endpoints
```bash
# Basic health
curl https://api.pp.slavy.space/health

# Detailed health (database + blockchain)
curl https://api.pp.slavy.space/health/detailed
```

### Metrics Tracked

- Total merchants (active/suspended)
- Total payments and volume
- Payment requests by status
- Webhook delivery success rate
- API request rate
- Database query performance
- Blockchain sync status

### Logging
```bash
# Application logs
tail -f ~/pp/backend/logs/combined.log

# Error logs
tail -f ~/pp/backend/logs/error.log

# Systemd logs
journalctl -u brscpp-api.service -f
```

---

## Testing

### Manual API Testing
```bash
# Test payment request creation
curl -X POST https://api.pp.slavy.space/api/merchant/payment-request \
  -H "Authorization: Bearer pk_test_..." \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "TEST-001",
    "amountUsd": "10.00",
    "currency": "USD",
    "network": "sepolia",
    "description": "Test payment"
  }'

# Check payment status
curl https://api.pp.slavy.space/api/customer/payment/TEST-001/status
```

### End-to-End Testing
```bash
# From blockchain directory
cd ~/brscpp/blockchain
npx hardhat run scripts/comprehensive-e2e-test.js --network sepolia
```

**Test Coverage:**
- Merchant registration
- Payment request creation
- Quote creation and locking
- Payment transaction
- Event listener processing
- Database verification
- Webhook delivery
- Statistics updates

---

## Security Considerations

### API Security
- Rate limiting per IP
- API key authentication
- CORS restrictions
- Helmet security headers
- Request logging and audit trail

### Smart Contract Security
- ReentrancyGuard
- Quote creator validation
- One-time quote usage
- Quote expiration
- Amount verification

### Data Security
- API keys hashed with SHA-256
- Private keys in environment only
- Webhook HMAC signatures
- Database credentials secured
- Sensitive data excluded from logs

---

## Performance

### Optimization
- Database connection pooling
- Indexed database queries
- Blockchain event caching
- Rate limiting
- Async webhook delivery

### Scalability
- Stateless API (horizontal scaling)
- Database replication support
- Multiple event listener instances
- Webhook queue processing

---

## Troubleshooting

### Common Issues

**API not starting**
- Check environment variables
- Verify DATABASE_URL
- Ensure PostgreSQL running

**Database connection failed**
- Check PostgreSQL service
- Verify credentials
- Test connection manually

**Blockchain connection failed**
- Check RPC URL
- Verify network status
- Test with curl

**Event listener not processing**
- Check service status
- View logs for errors
- Verify contract address

**Webhook delivery failed**
- Verify merchant URL accessible
- Check webhook secret
- Review delivery logs

### Debug Mode
```bash
# Enable debug logging
export LOG_LEVEL=debug

# View detailed logs
tail -f logs/combined.log

# Monitor database
npx prisma studio

# Check systemd logs
journalctl -u brscpp-api.service -f
```

---

## Related Documentation

- [Main Project](../../README.md)
- [Smart Contracts](../../blockchain/README.md)
- [Test Shop Backend](../testshop_backend/README.md)
- [Frontend Applications](../../frontend/)

---

## License

MIT License

---

Last Updated: December 2025

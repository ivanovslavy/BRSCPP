# BRSCPP Backend API

Decentralized cryptocurrency payment gateway backend system for EVM-compatible blockchains.

## System Architecture

### Core Components

**API Server (Express.js)**
- RESTful API endpoints
- Authentication via API keys
- Rate limiting and security middleware
- Request logging with Winston
- CORS configuration for frontend integration

**Database (PostgreSQL + Prisma)**
- Merchant accounts and API keys
- Payment requests and completed payments
- Webhook delivery tracking
- Payment statistics and analytics

**Event Listener (Worker Service)**
- Monitors blockchain for PaymentProcessed events
- Processes payments and updates database
- Sends webhook notifications to merchants
- Automatic retry logic for failed webhooks

**Blockchain Integration (ethers.js)**
- Creates price quotes on-chain
- Verifies quote validity and usage
- Monitors payment transactions
- Supports ETH and ERC20 tokens (USDC, USDT)

### Security Features

- API key authentication with SHA-256 hashing
- Rate limiting (100 requests per minute per IP)
- Quote creator validation (prevents front-running)
- Quote expiration enforcement (60 seconds default)
- Replay attack prevention (one-time quote usage)
- Amount verification (prevents payment manipulation)

## Database Schema

### Merchants
Stores merchant account information and webhook configuration.

Fields: id, walletAddress, email, companyName, webhookUrl, webhookSecret, status, createdAt, updatedAt

### ApiKeys
Multiple API keys per merchant with permissions and expiration.

Fields: id, merchantId, keyHash, keyPrefix, name, permissions, lastUsedAt, expiresAt, revoked, createdAt

### PaymentRequests
Created by merchants for customer payments.

Fields: id, merchantId, orderId, amountUsd, currency, description, customerEmail, metadata, status, quoteId, paymentUrl, expiresAt, completedAt, createdAt

### Payments
Confirmed payments from blockchain events.

Fields: id, paymentRequestId, merchantId, paymentIdOnchain, quoteId, orderId, customerAddress, merchantAddress, tokenAddress, tokenAmount, merchantAmount, feeAmount, usdAmount, txHash, blockNumber, network, status, createdAt

### WebhookDeliveries
Log of webhook delivery attempts with retry tracking.

Fields: id, merchantId, paymentId, eventType, webhookUrl, payload, responseStatus, responseBody, attempt, delivered, createdAt

## API Endpoints

### Public Endpoints

**Health Check**
- GET /health - Basic service health
- GET /health/detailed - Detailed health with blockchain and database status

**API Information**
- GET / - API overview and available endpoints
- GET /api/info - API version and configuration details

**Quote Management**
- POST /api/quote/preview - Preview quote without blockchain transaction
- POST /api/quote/create - Lock price quote on blockchain
- GET /api/quote/:quoteId - Get quote details from blockchain

**Customer Flow**
- GET /api/customer/payment/:orderId - Get payment request details
- POST /api/customer/payment/:orderId/quote - Create quote for order
- POST /api/customer/payment/:orderId/confirm - Submit payment transaction
- GET /api/customer/payment/:orderId/status - Check payment status

**Payment Verification**
- POST /api/payment/eth/process - Get ETH payment instructions
- POST /api/payment/token/process - Get ERC20 payment instructions
- GET /api/payment/status/:txHash - Get payment status by transaction
- POST /api/payment/verify - Verify payment by transaction and order ID

### Protected Endpoints (Require API Key)

**Merchant Management**
- POST /api/merchant/register - Register new merchant account
- GET /api/merchant/profile - Get merchant profile
- PUT /api/merchant/profile - Update merchant profile

**API Key Management**
- POST /api/merchant/apikeys - Create new API key
- GET /api/merchant/apikeys - List all API keys
- DELETE /api/merchant/apikeys/:id - Revoke API key

**Payment Requests**
- POST /api/merchant/payment-request - Create payment request
- GET /api/merchant/payment-requests - List payment requests
- GET /api/merchant/payment-request/:id - Get payment request details

**Payment History**
- GET /api/merchant/payments - List completed payments
- GET /api/merchant/payments/stats - Get payment statistics

**Webhook Configuration**
- POST /api/merchant/webhook - Set webhook URL
- DELETE /api/merchant/webhook - Remove webhook URL
- POST /api/merchant/webhook/test - Test webhook delivery

**Admin & Analytics**
- GET /api/admin/stats/system - System-wide statistics
- GET /api/admin/stats/payments - Payment statistics by period
- GET /api/admin/stats/merchants - Per-merchant statistics
- GET /api/admin/activity/recent - Recent payments and requests
- GET /api/admin/webhooks/failed - List failed webhook deliveries
- POST /api/admin/webhooks/retry - Retry failed webhooks

## Payment Flow

### Standard Payment Flow

1. Merchant creates payment request via API with order ID and USD amount
2. System returns unique payment URL for customer
3. Customer visits payment URL and selects payment token (ETH, USDC, USDT)
4. Backend creates price quote on blockchain locking current exchange rate
5. Quote valid for 60 seconds with fixed token amount
6. Customer sends payment transaction from wallet using quote ID
7. Blockchain emits PaymentProcessed event with payment details
8. Event Listener detects event and processes payment
9. Payment saved to database with transaction hash and amounts
10. Payment request status updated to completed
11. Webhook notification sent to merchant with payment details
12. Merchant fulfills order based on webhook confirmation

### Quote Creation

Request: token address, USD amount in cents, creator address
Response: quote ID, token amount, token price, valid until timestamp, transaction hash

Blockchain Transaction: Calls lockPriceQuote on CryptoPaymentGateway contract
Event Emitted: PriceQuoteGenerated with quote details

### Payment Processing

Request: quote ID, merchant address, order ID, payment amount
Validation: Quote exists, not expired, not used, correct amount, creator matches
Transaction: Transfers tokens to gateway, splits between merchant and fee collector
Event Emitted: PaymentProcessed with all payment details

### Webhook Notification

Payload Format:
- event: payment.completed
- payment: id, orderId, quoteId, addresses, amounts, transaction details
- merchant: id, walletAddress, companyName
- timestamp: ISO 8601 format

Headers:
- X-BRSCPP-Event: event type
- X-BRSCPP-Merchant-Id: merchant UUID
- X-BRSCPP-Signature: HMAC-SHA256 signature for verification
- X-BRSCPP-Timestamp: request timestamp

Retry Logic: 3 attempts with exponential backoff (2s, 4s, 8s)
Timeout: 15 seconds per attempt

## Configuration

### Environment Variables

**Server Configuration**
- NODE_ENV: development, production, test (default: development)
- PORT: API server port (default: 3052)

**Database Configuration**
- DATABASE_URL: PostgreSQL connection string (required)

**Blockchain Configuration**
- NETWORK: sepolia, mainnet, localhost (default: sepolia)
- INFURA_API_KEY: Infura project API key (required)
- GATEWAY_CONTRACT_ADDRESS: deployed gateway contract address (required)
- PRIVATE_KEY: wallet private key for transactions (required)

**Security Configuration**
- RATE_LIMIT_WINDOW_MS: rate limit time window (default: 60000)
- RATE_LIMIT_MAX_REQUESTS: max requests per window (default: 100)

**Logging Configuration**
- LOG_LEVEL: error, warn, info, debug (default: info)

### CORS Configuration

Allowed Origins:
- https://pp.slavy.space
- https://app.pp.slavy.space
- https://api.pp.slavy.space
- http://localhost:3000
- http://localhost:3001
- http://localhost:3051

Methods: GET, POST, PUT, DELETE, OPTIONS
Credentials: Enabled
Max Age: 86400 seconds (24 hours)

## Installation

### Prerequisites
- Node.js 18.x or higher
- PostgreSQL 16.x or higher
- npm or yarn package manager

### Setup Steps

1. Clone repository and install dependencies
2. Create PostgreSQL database and user
3. Configure environment variables in .env file
4. Run database migrations with Prisma
5. Generate Prisma client
6. Start API server
7. Start Event Listener worker

### Commands

npm install
npx prisma migrate dev --name init
npx prisma generate
npm start

## Deployment

### Systemd Services

**API Server Service**
- Service Name: brscpp-api.service
- Working Directory: /home/slavy/pp/backend
- Command: node src/server.js
- Auto-restart: Always with 10 second delay

**Event Listener Service**
- Service Name: brscpp-listener.service
- Working Directory: /home/slavy/pp/backend
- Command: node src/workers/event-listener.js
- Auto-restart: Always with 10 second delay

### Service Management

sudo systemctl start brscpp-api.service
sudo systemctl start brscpp-listener.service
sudo systemctl status brscpp-api.service
sudo systemctl status brscpp-listener.service
sudo journalctl -u brscpp-api.service -f
sudo journalctl -u brscpp-listener.service -f

### Logs

Application Logs: ~/pp/backend/logs/combined.log
Error Logs: ~/pp/backend/logs/error.log
Systemd Logs: journalctl -u brscpp-api.service

## Testing

### Manual API Testing

Use provided test script: ./test-new-endpoints.sh
Test individual endpoints with curl commands
Monitor logs for request processing

### End-to-End Testing

Run comprehensive E2E test from Hardhat project
Test script: scripts/comprehensive-e2e-test.js
Command: npx hardhat run scripts/comprehensive-e2e-test.js --network sepolia

Test Coverage:
- Merchant payment request creation
- Customer payment retrieval
- Quote creation and verification
- Payment transaction processing
- Event listener processing
- Database record verification
- Webhook delivery
- Statistics updates

## API Authentication

### API Key Format

Test Keys: pk_test_[48 hex characters]
Production Keys: pk_live_[48 hex characters]

### Authentication Header

Authorization: Bearer pk_test_1234567890abcdef...

### Key Generation

Keys generated with crypto.randomBytes(24)
Stored as SHA-256 hash in database
Prefix stored separately for display

### Key Management

Multiple keys per merchant supported
Keys can be named for organization
Keys can be revoked without deletion
Last used timestamp tracked
Optional expiration date

## Error Handling

### Error Response Format

{
  "error": "Error type",
  "message": "Detailed error message",
  "timestamp": "2025-11-22T14:00:00.000Z"
}

### HTTP Status Codes

200: Success
201: Created
400: Bad Request
401: Unauthorized
403: Forbidden
404: Not Found
409: Conflict
410: Gone (Expired)
429: Too Many Requests
500: Internal Server Error
503: Service Unavailable

### Common Errors

Invalid API key: 401 Unauthorized
Missing required fields: 400 Bad Request
Quote expired: 410 Gone
Quote already used: 400 Bad Request
Payment request not found: 404 Not Found
Rate limit exceeded: 429 Too Many Requests

## Monitoring

### Health Endpoints

Basic: /health - Returns uptime and status
Detailed: /health/detailed - Tests database and blockchain connectivity

### Metrics Tracked

Total merchants (active and inactive)
Total payments and volume
Payment requests (pending, processing, completed)
Webhook deliveries (success and failed)
API request rate
Database query performance
Blockchain sync status

### Alerts

Database connection failures logged
Blockchain connection failures logged
Failed webhook deliveries tracked
High error rates logged

## Security Considerations

### API Security

Rate limiting per IP address
API key authentication required for protected endpoints
CORS restrictions on allowed origins
Helmet middleware for security headers
Request logging for audit trail

### Smart Contract Security

ReentrancyGuard prevents reentrancy attacks
Quote creator validation prevents front-running
One-time quote usage prevents replay attacks
Quote expiration prevents stale price exploitation
Amount verification prevents payment manipulation

### Data Security

API keys stored as SHA-256 hashes
Private keys never exposed in responses
Webhook secrets for signature verification
Database credentials in environment variables
Logging excludes sensitive data

## Performance

### Optimization Strategies

Database connection pooling with Prisma
Efficient database queries with indexes
Blockchain event caching
Rate limiting prevents resource exhaustion
Request logging for performance monitoring

### Scalability

Horizontal scaling supported (stateless API)
Database can be replicated for read scaling
Event Listener can run multiple instances
Webhook delivery uses async processing

## Troubleshooting

### Common Issues

API not starting: Check environment variables validation
Database connection failed: Verify DATABASE_URL and PostgreSQL running
Blockchain connection failed: Check INFURA_API_KEY and network status
Webhook delivery failed: Verify merchant webhook URL is accessible
Event Listener not processing: Check service status and logs

### Debug Mode

Set LOG_LEVEL=debug in environment
View detailed logs in logs/combined.log
Monitor systemd logs with journalctl -f
Check database with Prisma Studio

## License

MIT License

## Support

Documentation: https://pp.slavy.space/docs
GitHub: https://github.com/ivanovslavy/brscpp

# BRSCPP Test Shop Backend

Demo e-commerce backend for testing BRSCPP payment gateway integration.

**Service URL:** https://backend.testshop.pp.slavy.space

**Frontend URL:** https://testshop.pp.slavy.space

**Status:** Live (Demo)

---

## Navigation

- [Main Project README](../../README.md)
- [Smart Contracts Documentation](../../blockchain/README.md)
- [BRSCPP Backend](../brscpp_backend/README.md)
- [Marketing Site](../../frontend/marketing_app/README.md)
- [Payment App](../../frontend/payment_app/README.md)
- [Test Shop Frontend](../../frontend/testshop_app/README.md)

---

## Overview

Test Shop Backend is a simple Node.js/Express API that demonstrates BRSCPP payment gateway integration. It provides product catalog, currency conversion, and payment request creation functionality.

### Purpose

- Demonstrate BRSCPP API integration
- Show multi-currency support
- Provide working payment examples
- Serve as integration reference

### Features

- Product catalog with USD base prices
- Real-time currency conversion (12 fiat currencies)
- BRSCPP payment request creation
- Multi-network support (Sepolia, BSC Testnet)
- CORS enabled for frontend

---

## Architecture

### Technology Stack

**Framework:** Express.js

**Currency Conversion:** exchangerate-api.com

**Payment Gateway:** BRSCPP API (api.pp.slavy.space)

**Deployment:** Systemd service on Ubuntu

### System Flow
```
┌──────────────────┐
│  Test Shop       │
│  Frontend        │
└────────┬─────────┘
         │ GET /api/products?currency=EUR
         ▼
┌──────────────────┐
│  Test Shop       │
│  Backend         │
└────────┬─────────┘
         │ Convert prices
         ▼
┌──────────────────┐
│  Exchange Rate   │
│  API             │
└──────────────────┘

┌──────────────────┐
│  Test Shop       │
│  Frontend        │
└────────┬─────────┘
         │ POST /api/create-payment
         ▼
┌──────────────────┐
│  Test Shop       │
│  Backend         │
└────────┬─────────┘
         │ POST /api/merchant/payment-request
         ▼
┌──────────────────┐
│  BRSCPP API      │
│  (Payment)       │
└────────┬─────────┘
         │ Returns payment URL
         ▼
┌──────────────────┐
│  Customer        │
│  redirected      │
└──────────────────┘
```

---

## API Endpoints

### Product Catalog

**Get Products**
```
GET /api/products?currency=USD

Response:
{
  "products": [
    {
      "id": "BOOKS",
      "name": "Programming Books Bundle",
      "description": "Essential coding books collection",
      "price": 50.00,
      "image": "https://..."
    },
    ...
  ]
}
```

**Parameters:**
- `currency` (optional): USD, EUR, GBP, JPY, CNY, RUB, INR, CAD, AUD, BRL, MXN, KRW
- Default: USD

**Base Prices (USD):**
- Programming Books Bundle: $50.00
- Web Development Course: $99.00
- Cloud Infrastructure Setup: $199.00

### Currency Management

**Get Supported Currencies**
```
GET /api/currencies

Response:
{
  "currencies": {
    "USD": { "name": "US Dollar", "symbol": "$", "flag": "🇺🇸" },
    "EUR": { "name": "Euro", "symbol": "€", "flag": "🇪🇺" },
    ...
  }
}
```

**Supported Currencies:**
- USD (US Dollar)
- EUR (Euro)
- GBP (British Pound)
- JPY (Japanese Yen)
- CNY (Chinese Yuan)
- RUB (Russian Ruble)
- INR (Indian Rupee)
- CAD (Canadian Dollar)
- AUD (Australian Dollar)
- BRL (Brazilian Real)
- MXN (Mexican Peso)
- KRW (South Korean Won)

### Payment Processing

**Create Payment**
```
POST /api/create-payment

Request:
{
  "productId": "BOOKS",
  "productName": "Programming Books Bundle",
  "price": 50.00,
  "currency": "USD",
  "network": "sepolia"
}

Response:
{
  "success": true,
  "paymentUrl": "https://app.pp.slavy.space/checkout/TESTSHOP-123456-BOOKS",
  "orderId": "TESTSHOP-123456-BOOKS",
  "network": "sepolia"
}
```

**Parameters:**
- `productId`: Product identifier (BOOKS, COURSE, CLOUD)
- `productName`: Display name
- `price`: Amount in selected currency
- `currency`: Currency code (USD, EUR, etc.)
- `network`: Blockchain network (sepolia, bscTestnet)

**Order ID Format:**
```
TESTSHOP-{timestamp}-{productId}
Example: TESTSHOP-1733756789123-BOOKS
```

---

## Product Catalog

### Available Products

**1. Programming Books Bundle**
- ID: BOOKS
- Base Price: $50.00
- Description: Essential coding books collection
- Image: Placeholder book stack

**2. Web Development Course**
- ID: COURSE
- Base Price: $99.00
- Description: Complete full-stack web development course
- Image: Placeholder course thumbnail

**3. Cloud Infrastructure Setup**
- ID: CLOUD
- Base Price: $199.00
- Description: Professional cloud setup and configuration
- Image: Placeholder cloud diagram

### Price Conversion

Prices automatically convert based on selected currency using real-time exchange rates:
```javascript
// Example conversions
USD $50.00 → EUR €47.25
USD $50.00 → GBP £39.50
USD $50.00 → JPY ¥7,500
```

---

## Configuration

### Environment Variables
```bash
# Server
PORT=3002
NODE_ENV=production

# BRSCPP Integration
BRSCPP_API_URL=https://api.pp.slavy.space
BRSCPP_API_KEY=pk_test_your_api_key_here
BRSCPP_MERCHANT_WALLET=0xYourMerchantWalletAddress

# Currency API
EXCHANGE_RATE_API_URL=https://open.exchangerate-api.com/v6/latest/USD

# Frontend
FRONTEND_URL=https://testshop.pp.slavy.space
```

### CORS Configuration

**Allowed Origins:**
```
https://testshop.pp.slavy.space
http://localhost:3001
```

**Methods:** GET, POST, OPTIONS

**Credentials:** Enabled

---

## Installation

### Prerequisites
```bash
Node.js >= 18.x
npm or yarn
BRSCPP API key
```

### Setup Steps
```bash
# Clone or navigate to directory
cd ~/pp/backend/testshop

# Install dependencies
npm install

# Configure environment
cp .env.example .env
nano .env

# Start server
npm start
```

### Dependencies
```json
{
  "express": "^4.18.2",
  "cors": "^2.8.5",
  "dotenv": "^16.3.1",
  "axios": "^1.6.0"
}
```

---

## Deployment

### Systemd Service

**Service File:** `/etc/systemd/system/brscpp-testshop.service`
```ini
[Unit]
Description=BRSCPP Test Shop Backend
After=network.target

[Service]
Type=simple
User=slavy
WorkingDirectory=/home/slavy/pp/backend/testshop
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

### Service Management
```bash
# Start service
sudo systemctl start brscpp-testshop.service

# Check status
sudo systemctl status brscpp-testshop.service

# View logs
sudo journalctl -u brscpp-testshop.service -f

# Restart service
sudo systemctl restart brscpp-testshop.service

# Enable on boot
sudo systemctl enable brscpp-testshop.service
```

### Nginx Configuration
```nginx
server {
    listen 443 ssl;
    server_name backend.testshop.pp.slavy.space;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## Integration Example

### Frontend Integration
```javascript
// Fetch products in EUR
const response = await fetch(
  'https://backend.testshop.pp.slavy.space/api/products?currency=EUR'
);
const data = await response.json();
console.log(data.products);

// Create payment
const paymentResponse = await fetch(
  'https://backend.testshop.pp.slavy.space/api/create-payment',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      productId: 'BOOKS',
      productName: 'Programming Books Bundle',
      price: 47.25,
      currency: 'EUR',
      network: 'sepolia'
    })
  }
);

const payment = await paymentResponse.json();
window.location.href = payment.paymentUrl;
```

### Backend Payment Flow
```javascript
// 1. Receive payment request from frontend
app.post('/api/create-payment', async (req, res) => {
  const { productId, price, currency, network } = req.body;
  
  // 2. Convert price to USD
  const usdAmount = await convertToUSD(price, currency);
  
  // 3. Create BRSCPP payment request
  const orderId = `TESTSHOP-${Date.now()}-${productId}`;
  const brscppResponse = await axios.post(
    `${BRSCPP_API_URL}/api/merchant/payment-request`,
    {
      orderId,
      amountUsd: usdAmount.toFixed(2),
      currency,
      network,
      description: `Test Shop - ${productName}`
    },
    {
      headers: {
        'Authorization': `Bearer ${BRSCPP_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  // 4. Return payment URL to frontend
  res.json({
    success: true,
    paymentUrl: brscppResponse.data.paymentRequest.paymentUrl,
    orderId,
    network
  });
});
```

---

## Testing

### Manual Testing
```bash
# Test product catalog
curl https://backend.testshop.pp.slavy.space/api/products

# Test with EUR currency
curl https://backend.testshop.pp.slavy.space/api/products?currency=EUR

# Test currency list
curl https://backend.testshop.pp.slavy.space/api/currencies

# Test payment creation
curl -X POST https://backend.testshop.pp.slavy.space/api/create-payment \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "BOOKS",
    "productName": "Programming Books Bundle",
    "price": 50.00,
    "currency": "USD",
    "network": "sepolia"
  }'
```

### Complete Flow Test

1. Visit https://testshop.pp.slavy.space
2. Select currency (e.g., EUR)
3. Verify prices converted correctly
4. Click "Pay with Crypto" on any product
5. Select network (Sepolia or BSC Testnet)
6. Redirected to payment app
7. Complete payment
8. Verify order ID format: TESTSHOP-{timestamp}-{productId}

---

## Error Handling

### Error Response Format
```json
{
  "error": "Error message",
  "details": "Additional information"
}
```

### Common Errors

**Product Not Found**
```
Status: 404
Error: "Product not found"
```

**Invalid Currency**
```
Status: 400
Error: "Unsupported currency"
```

**Payment Creation Failed**
```
Status: 500
Error: "Failed to create payment"
Details: "BRSCPP API error message"
```

**Currency Conversion Failed**
```
Status: 500
Error: "Currency conversion failed"
Details: "Exchange rate API unavailable"
```

---

## Currency Conversion

### Exchange Rate API

**Provider:** exchangerate-api.com (free tier)

**Endpoint:** https://open.exchangerate-api.com/v6/latest/USD

**Rate Limit:** 1500 requests/month (free)

**Cache:** 1 hour (to avoid rate limits)

### Conversion Logic
```javascript
async function convertToUSD(amount, currency) {
  if (currency === 'USD') return amount;
  
  const rates = await fetchExchangeRates();
  const rate = rates[currency];
  
  if (!rate) throw new Error('Currency not supported');
  
  return amount / rate;
}
```

### Supported Conversions

All 12 currencies convert to USD for BRSCPP payment requests:
- EUR → USD
- GBP → USD
- JPY → USD
- CNY → USD
- RUB → USD
- INR → USD
- CAD → USD
- AUD → USD
- BRL → USD
- MXN → USD
- KRW → USD

---

## Logging

### Console Logs
```bash
# View service logs
sudo journalctl -u brscpp-testshop.service -f

# Recent logs
sudo journalctl -u brscpp-testshop.service -n 100
```

### Log Events

- Server startup
- API requests (method, path, status)
- Currency conversions
- BRSCPP payment requests
- Errors and exceptions

---

## Performance

### Optimization

- Exchange rate caching (1 hour)
- Minimal dependencies
- Stateless design (horizontal scaling ready)
- CORS configured for specific origins

### Response Times

- Product catalog: <50ms
- Currency list: <20ms
- Payment creation: <500ms (depends on BRSCPP API)

---

## Security

### API Key Protection

- BRSCPP API key in environment only
- Never exposed to frontend
- Server-side payment creation only

### CORS Policy

- Restricted to testshop.pp.slavy.space
- Localhost allowed for development
- Credentials enabled

### Rate Limiting

Currently no rate limiting (demo service)

Production would implement:
- 100 requests/minute per IP
- Express rate-limit middleware

---

## Troubleshooting

### Service Not Starting
```bash
# Check environment variables
cat .env

# Check port availability
lsof -i :3002

# View error logs
sudo journalctl -u brscpp-testshop.service -n 50
```

### Currency Conversion Failing
```bash
# Test exchange rate API directly
curl https://open.exchangerate-api.com/v6/latest/USD

# Check API rate limit status
# Free tier: 1500 requests/month
```

### Payment Creation Failing
```bash
# Verify BRSCPP API key
echo $BRSCPP_API_KEY

# Test BRSCPP API directly
curl -X POST https://api.pp.slavy.space/api/merchant/payment-request \
  -H "Authorization: Bearer $BRSCPP_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"orderId":"TEST","amountUsd":"10","currency":"USD","network":"sepolia"}'
```

---

## Future Enhancements

### Planned Features

- Order history tracking
- Email notifications
- Product inventory management
- Admin dashboard
- Database integration
- Webhook handler for payment confirmation
- Customer accounts
- Shopping cart

### Integration Improvements

- WordPress plugin example
- React integration guide
- Next.js example
- PHP example

---

## Related Documentation

- [Main Project](../../README.md)
- [BRSCPP Backend](../brscpp_backend/README.md)
- [Smart Contracts](../../blockchain/README.md)
- [Test Shop Frontend](../../frontend/testshop_app/README.md)
- [Payment App](../../frontend/payment_app/README.md)

---

## Source Code

### Server Structure
```
testshop_backend/
├── server.js           Main Express application
├── .env               Environment configuration
├── package.json       Dependencies
└── README.md          This file
```

### Main Server Code

Location: `~/pp/backend/testshop/server.js`

Key Functions:
- Product catalog management
- Currency conversion
- BRSCPP API integration
- Error handling

---

## License

MIT License

---

Last Updated: December 2025

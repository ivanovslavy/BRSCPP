# BRSCPP TestShop Backend

Demo e-commerce backend showcasing BRSCPP v2 payment gateway integration.

**Version:** 2.0  
**Author:** Slavcho Ivanov  
**Service URL:** https://testshop-backend.brscpp.slavy.space  
**Frontend URL:** https://testshop-frontend.brscpp.slavy.space  
**Status:** Production Demo (December 2025)

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [API Endpoints](#api-endpoints)
4. [Product Catalog](#product-catalog)
5. [Payment Integration](#payment-integration)
6. [Currency Conversion](#currency-conversion)
7. [Installation](#installation)
8. [Configuration](#configuration)
9. [Deployment](#deployment)
10. [Testing](#testing)
11. [Troubleshooting](#troubleshooting)

---

## Overview

TestShop Backend is a demonstration Node.js/Express API that shows real-world BRSCPP payment gateway integration. It provides a complete e-commerce backend with product catalog, multi-currency support, and payment processing.

### Purpose

**Educational:**
- Demonstrate BRSCPP API integration patterns
- Show best practices for payment handling
- Provide working code examples
- Serve as integration reference

**Functional:**
- Product catalog with dynamic pricing
- Multi-currency support (12 currencies)
- Payment request creation
- Stripe and crypto payment support

### Key Features

**Payment Processing:**
- Cryptocurrency payments (multi-chain)
- Credit card payments via Stripe
- Unified payment creation flow
- Automatic currency conversion

**Product Management:**
- Static product catalog
- USD base pricing
- Real-time currency conversion
- Product images and descriptions

**Integration:**
- RESTful API design
- CORS enabled
- Error handling
- Logging and monitoring

---

## Architecture

### Technology Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Runtime | Node.js | 20.x |
| Framework | Express.js | 4.x |
| HTTP Client | Axios | 1.x |
| CORS | cors | 2.x |

### System Flow
```
┌─────────────────────────────────────────────────────┐
│              Customer Request Flow                  │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│  1. Browse Products                                 │
│     GET /api/products?currency=EUR                  │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│  2. TestShop Backend                                │
│     - Fetch exchange rates                          │
│     - Convert prices to selected currency           │
│     - Return product catalog                        │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│  3. Select Product & Payment Method                 │
│     POST /api/create-payment                        │
│     { productId, price, currency, network }         │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│  4. TestShop Backend                                │
│     POST /api/merchant/payment-request              │
│     → BRSCPP API                                    │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│  5. BRSCPP API Returns Payment URL                  │
│     payment.brscpp.slavy.space/checkout/ORDER-123   │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│  6. Customer Redirected to Payment Page             │
│     - Crypto: Connect wallet, select network/token  │
│     - Fiat: Redirect to Stripe Checkout             │
└─────────────────────────────────────────────────────┘
```

---

## API Endpoints

### Product Catalog

**Get Products**
```http
GET /api/products?currency=EUR

Response:
{
  "products": [
    {
      "id": "BOOKS",
      "name": "Programming Books Bundle",
      "description": "Essential coding books: Clean Code, Design Patterns, Refactoring",
      "price": 47.25,
      "priceUSD": 50.00,
      "currency": "EUR",
      "image": "/images/books.jpg"
    },
    {
      "id": "COURSE",
      "name": "Web Development Course",
      "description": "Complete full-stack web development bootcamp",
      "price": 93.56,
      "priceUSD": 99.00,
      "currency": "EUR",
      "image": "/images/course.jpg"
    },
    {
      "id": "CLOUD",
      "name": "Cloud Infrastructure Setup",
      "description": "Professional cloud deployment and configuration",
      "price": 188.06,
      "priceUSD": 199.00,
      "currency": "EUR",
      "image": "/images/cloud.jpg"
    }
  ],
  "currency": "EUR",
  "exchangeRate": 1.0595
}
```

**Query Parameters:**
- `currency` (optional): Currency code (default: USD)
  - Supported: USD, EUR, GBP, JPY, CNY, RUB, INR, CAD, AUD, BRL, MXN, KRW

### Currency Management

**Get Supported Currencies**
```http
GET /api/currencies

Response:
{
  "currencies": {
    "USD": {
      "name": "US Dollar",
      "symbol": "$",
      "flag": "🇺🇸"
    },
    "EUR": {
      "name": "Euro",
      "symbol": "€",
      "flag": "🇪🇺"
    },
    "GBP": {
      "name": "British Pound",
      "symbol": "£",
      "flag": "🇬🇧"
    },
    "JPY": {
      "name": "Japanese Yen",
      "symbol": "¥",
      "flag": "🇯🇵"
    }
    // ... 8 more currencies
  }
}
```

### Payment Processing

**Create Payment Request**
```http
POST /api/create-payment

Request:
{
  "productId": "BOOKS",
  "productName": "Programming Books Bundle",
  "price": 47.25,
  "currency": "EUR",
  "network": "sepolia"
}

Response:
{
  "success": true,
  "paymentUrl": "https://payment.brscpp.slavy.space/checkout/TESTSHOP-1734876543210-BOOKS",
  "orderId": "TESTSHOP-1734876543210-BOOKS",
  "amountUsd": "50.00",
  "amountOriginal": 47.25,
  "currencyOriginal": "EUR",
  "exchangeRate": 1.0595,
  "network": "sepolia",
  "allowedMethods": ["crypto", "stripe"]
}
```

**Request Parameters:**
- `productId` (required): Product identifier (BOOKS, COURSE, CLOUD)
- `productName` (required): Display name
- `price` (required): Amount in selected currency
- `currency` (required): Currency code
- `network` (optional): Preferred blockchain network (sepolia, bscTestnet, amoy)

**Order ID Format:**
```
TESTSHOP-{timestamp}-{productId}

Examples:
TESTSHOP-1734876543210-BOOKS
TESTSHOP-1734876543210-COURSE
TESTSHOP-1734876543210-CLOUD
```

### Health Check
```http
GET /health

Response:
{
  "status": "healthy",
  "timestamp": "2025-12-22T10:00:00.000Z",
  "services": {
    "brscpp": "connected",
    "exchangeRate": "connected"
  }
}
```

---

## Product Catalog

### Available Products

**1. Programming Books Bundle**
```javascript
{
  id: "BOOKS",
  name: "Programming Books Bundle",
  description: "Essential coding books: Clean Code, Design Patterns, Refactoring",
  priceUSD: 50.00,
  image: "/images/books.jpg"
}
```

**2. Web Development Course**
```javascript
{
  id: "COURSE",
  name: "Web Development Course",
  description: "Complete full-stack web development bootcamp with React, Node.js, and MongoDB",
  priceUSD: 99.00,
  image: "/images/course.jpg"
}
```

**3. Cloud Infrastructure Setup**
```javascript
{
  id: "CLOUD",
  name: "Cloud Infrastructure Setup",
  description: "Professional cloud deployment and configuration service on AWS, Azure, or Google Cloud",
  priceUSD: 199.00,
  image: "/images/cloud.jpg"
}
```

### Price Conversion Examples

| Product | USD | EUR | GBP | JPY |
|---------|-----|-----|-----|-----|
| Books | $50.00 | €47.25 | £39.62 | ¥7,850 |
| Course | $99.00 | £93.56 | £78.46 | ¥15,543 |
| Cloud | $199.00 | €188.06 | £157.66 | ¥31,243 |

---

## Payment Integration

### BRSCPP API Integration

**Payment Request Creation:**
```javascript
// ~/brscpp/pp-v2/testshop/backend/server.js

app.post('/api/create-payment', async (req, res) => {
  try {
    const { productId, productName, price, currency, network } = req.body;
    
    // Validate product
    const product = PRODUCTS.find(p => p.id === productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    // Generate unique order ID
    const orderId = `TESTSHOP-${Date.now()}-${productId}`;
    
    // Create payment request with BRSCPP
    const response = await axios.post(
      `${BRSCPP_API_URL}/api/merchant/payment-request`,
      {
        orderId: orderId,
        amount: price,
        currency: currency,
        description: `TestShop - ${productName}`,
        metadata: {
          productId: productId,
          productName: productName
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${BRSCPP_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    // Return payment details
    res.json({
      success: true,
      paymentUrl: response.data.paymentUrl,
      orderId: orderId,
      amountUsd: response.data.amountUsd,
      amountOriginal: response.data.amountOriginal,
      currencyOriginal: response.data.currencyOriginal,
      exchangeRate: response.data.exchangeRate,
      allowedMethods: response.data.allowedMethods
    });
    
  } catch (error) {
    console.error('Payment creation error:', error);
    res.status(500).json({
      error: 'Payment creation failed',
      message: error.response?.data?.message || error.message
    });
  }
});
```

### Error Handling

**Product Not Found:**
```json
{
  "error": "Product not found",
  "productId": "INVALID"
}
```

**Invalid Currency:**
```json
{
  "error": "Unsupported currency",
  "currency": "XYZ"
}
```

**BRSCPP API Error:**
```json
{
  "error": "Payment creation failed",
  "message": "BRSCPP API error details"
}
```

**Currency Conversion Error:**
```json
{
  "error": "Currency conversion failed",
  "message": "Exchange rate API unavailable"
}
```

---

## Currency Conversion

### Exchange Rate Service

**Primary Provider:** ExchangeRate-API  
**Fallback Provider:** Frankfurter (planned)

**API Endpoint:**
```
https://open.exchangerate-api.com/v6/latest/USD
```

**Rate Limits:**
- Free tier: 1,500 requests/month
- Cache duration: 5 minutes

### Conversion Implementation
```javascript
const EXCHANGE_RATE_CACHE = {
  rates: null,
  timestamp: null,
  ttl: 5 * 60 * 1000 // 5 minutes
};

async function getExchangeRates() {
  const now = Date.now();
  
  // Return cached rates if still valid
  if (EXCHANGE_RATE_CACHE.rates && 
      (now - EXCHANGE_RATE_CACHE.timestamp) < EXCHANGE_RATE_CACHE.ttl) {
    return EXCHANGE_RATE_CACHE.rates;
  }
  
  // Fetch fresh rates
  try {
    const response = await axios.get(
      'https://open.exchangerate-api.com/v6/latest/USD'
    );
    
    EXCHANGE_RATE_CACHE.rates = response.data.rates;
    EXCHANGE_RATE_CACHE.timestamp = now;
    
    return response.data.rates;
  } catch (error) {
    console.error('Exchange rate fetch failed:', error);
    
    // Return cached rates if available, even if expired
    if (EXCHANGE_RATE_CACHE.rates) {
      console.log('Using expired cache');
      return EXCHANGE_RATE_CACHE.rates;
    }
    
    throw new Error('Exchange rate service unavailable');
  }
}

function convertPrice(usdPrice, targetCurrency, rates) {
  if (targetCurrency === 'USD') {
    return usdPrice;
  }
  
  const rate = rates[targetCurrency];
  if (!rate) {
    throw new Error(`Currency ${targetCurrency} not supported`);
  }
  
  return usdPrice * rate;
}
```

### Supported Currency Conversions

All prices stored in USD, converted on-demand:

| From | To | Example |
|------|-----|---------|
| USD | EUR | $50.00 → €47.25 |
| USD | GBP | $50.00 → £39.62 |
| USD | JPY | $50.00 → ¥7,850 |
| USD | CNY | $50.00 → ¥361.50 |
| USD | RUB | $50.00 → ₽4,725 |
| USD | INR | $50.00 → ₹4,200 |
| USD | CAD | $50.00 → C$70.50 |
| USD | AUD | $50.00 → A$77.50 |
| USD | BRL | $50.00 → R$255.00 |
| USD | MXN | $50.00 → $905.00 |
| USD | KRW | $50.00 → ₩66,500 |

---

## Installation

### Prerequisites
```
Node.js >= 20.x
npm >= 9.x
BRSCPP API key
```

### Setup
```bash
# Navigate to directory
cd testshop/backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
nano .env

# Start development server
npm start

# Or use nodemon for auto-reload
npm run dev
```

### Dependencies
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "axios": "^1.6.0",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
```

---

## Configuration

### Environment Variables
```bash
# Server Configuration
PORT=3052
NODE_ENV=production

# BRSCPP Integration
BRSCPP_API_URL=https://api.brscpp.slavy.space
BRSCPP_API_KEY=brscpp_test_your_api_key_here

# Exchange Rate API
EXCHANGE_RATE_API_URL=https://open.exchangerate-api.com/v6/latest/USD
EXCHANGE_RATE_CACHE_TTL=300000

# CORS Configuration
FRONTEND_URL=https://testshop-frontend.brscpp.slavy.space

# Logging
LOG_LEVEL=info
```

### CORS Configuration
```javascript
// server.js
const corsOptions = {
  origin: [
    'https://testshop-frontend.brscpp.slavy.space',
    'http://localhost:3001',
    'http://localhost:5173'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
```

---

## Deployment

### Build and Deploy
```bash
# No build step needed (Node.js runtime)
cd ~/brscpp/pp-v2/testshop/backend

# Install production dependencies
npm install --production

# Restart service
sudo systemctl restart brscpp-v2-testshop-backend.service
```

### Systemd Service

**Service File:** `/etc/systemd/system/brscpp-v2-testshop-backend.service`
```ini
[Unit]
Description=BRSCPP v2 TestShop Backend
After=network.target

[Service]
Type=simple
User=slavy
WorkingDirectory=/home/slavy/brscpp/pp-v2/testshop/backend
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10

Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

### Service Management
```bash
# Enable service
sudo systemctl enable brscpp-v2-testshop-backend.service

# Start service
sudo systemctl start brscpp-v2-testshop-backend.service

# Check status
sudo systemctl status brscpp-v2-testshop-backend.service

# Restart service
sudo systemctl restart brscpp-v2-testshop-backend.service

# View logs
sudo journalctl -u brscpp-v2-testshop-backend.service -f
```

### Apache Configuration
```apache
<VirtualHost *:443>
    ServerName testshop-backend.brscpp.slavy.space
    
    ProxyPreserveHost On
    ProxyPass / http://127.0.0.1:3052/
    ProxyPassReverse / http://127.0.0.1:3052/
    
    ErrorLog /var/log/apache2/testshop-backend-error.log
    CustomLog /var/log/apache2/testshop-backend-access.log combined
    
    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/testshop-backend.brscpp.slavy.space/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/testshop-backend.brscpp.slavy.space/privkey.pem
</VirtualHost>
```

---

## Testing

### API Testing

**Test Product Catalog:**
```bash
curl https://testshop-backend.brscpp.slavy.space/api/products
curl https://testshop-backend.brscpp.slavy.space/api/products?currency=EUR
```

**Test Currency List:**
```bash
curl https://testshop-backend.brscpp.slavy.space/api/currencies
```

**Test Payment Creation:**
```bash
curl -X POST https://testshop-backend.brscpp.slavy.space/api/create-payment \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "BOOKS",
    "productName": "Programming Books Bundle",
    "price": 50.00,
    "currency": "USD",
    "network": "sepolia"
  }'
```

**Test Health Check:**
```bash
curl https://testshop-backend.brscpp.slavy.space/health
```

### Integration Testing

**Complete Flow:**
1. Fetch products in EUR
2. Verify price conversion
3. Create payment for BOOKS product
4. Verify payment URL returned
5. Check order ID format
6. Visit payment URL in browser
7. Complete payment
8. Verify payment success

---

## Troubleshooting

### Service Issues

**Service Not Starting:**
```bash
# Check logs
sudo journalctl -u brscpp-v2-testshop-backend.service -n 50

# Verify environment variables
sudo systemctl cat brscpp-v2-testshop-backend.service

# Check port availability
sudo lsof -i :3052
```

**CORS Errors:**
```bash
# Verify CORS origins in server.js
# Check frontend URL matches CORS configuration
# Ensure credentials: true in both server and client
```

### API Issues

**Exchange Rate Service Down:**
```bash
# Test API directly
curl https://open.exchangerate-api.com/v6/latest/USD

# Check cache is being used
# Monitor logs for fallback behavior
```

**BRSCPP API Errors:**
```bash
# Verify API key
echo $BRSCPP_API_KEY

# Test BRSCPP API
curl -X POST https://api.brscpp.slavy.space/api/merchant/payment-request \
  -H "Authorization: Bearer $BRSCPP_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "TEST-123",
    "amount": 10.00,
    "currency": "USD"
  }'
```

---

## Related Documentation

- [Main Project Documentation](../../README.md)
- [BRSCPP Backend API](../../backend/README.md)
- [Smart Contracts Documentation](../../blockchain/README.md)
- [TestShop Frontend](../frontend/README.md)
- [Payment Application](../../frontend/payment-app/README.md)
- [Developer Integration Guide](../../DEV_SUPPORT.md)

---

## License

MIT License

---

**Last Updated:** December 22, 2025  
**Document Version:** 2.0  
**Author:** Slavcho Ivanov

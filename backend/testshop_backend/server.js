const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
  origin: ['https://testshop.pp.slavy.space', 'http://localhost:3055'],
  credentials: true
}));
app.use(express.json());

// Configuration
const PORT = process.env.PORT || 3054;
const BRSCPP_API_KEY = process.env.BRSCPP_API_KEY;
const BRSCPP_API_URL = process.env.BRSCPP_API_URL || 'https://api.pp.slavy.space';

// Product catalog with prices in BASE currency (USD) - FIX: Dynamic Pricing
const PRODUCT_CATALOG = {
  BOOKS: {
    id: 'BOOKS',
    name: 'Premium Book Collection',
    description: 'Curated collection of bestselling books',
    image: '/images/books.jpg',
    priceUSD: 10 // ← Base price in USD
  },
  SHOES: {
    id: 'SHOES',
    name: 'Casual Canvas Shoes',
    description: 'Comfortable everyday footwear',
    image: '/images/shoes.jpg',
    priceUSD: 50
  },
  LAPTOP: {
    id: 'LAPTOP',
    name: 'Gaming Laptop RTX 50',
    description: 'High-performance gaming machine',
    image: '/images/laptop.jpg',
    priceUSD: 100
  }
};

// Supported currencies
const CURRENCIES = {
  USD: { name: 'US Dollar', symbol: '$', flag: '🇺🇸' },
  EUR: { name: 'Euro', symbol: '€', flag: '🇪🇺' },
  GBP: { name: 'British Pound', symbol: '£', flag: '🇬🇧' },
  CNY: { name: 'Chinese Yuan', symbol: '¥', flag: '🇨🇳' },
  JPY: { name: 'Japanese Yen', symbol: '¥', flag: '🇯🇵' },
  RUB: { name: 'Russian Ruble', symbol: '₽', flag: '🇷🇺' },
  INR: { name: 'Indian Rupee', symbol: '₹', flag: '🇮🇳' },
  CAD: { name: 'Canadian Dollar', symbol: 'C$', flag: '🇨🇦' },
  AUD: { name: 'Australian Dollar', symbol: 'A$', flag: '🇦🇺' },
  BRL: { name: 'Brazilian Real', symbol: 'R$', flag: '🇧🇷' },
  MXN: { name: 'Mexican Peso', symbol: '$', flag: '🇲🇽' },
  KRW: { name: 'South Korean Won', symbol: '₩', flag: '🇰🇷' }
};

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'TestShop Backend',
    timestamp: new Date().toISOString()
  });
});

// Get product catalog - FIX: Implement dynamic conversion
app.get('/api/products', async (req, res) => {
  try {
    const { currency = 'USD' } = req.query;
    
    // Fetch current exchange rates
    const ratesResponse = await axios.get('https://api.exchangerate-api.com/v4/latest/USD', {
      timeout: 5000
    });
    
    const rates = ratesResponse.data.rates;
    // Get the rate for the requested currency, default to 1 if not found or USD
    const rate = rates[currency.toUpperCase()] || 1; 
    
    // Convert prices dynamically
    const products = Object.values(PRODUCT_CATALOG).map(product => ({
      id: product.id,
      name: product.name,
      description: product.description,
      image: product.image,
      price: product.priceUSD * rate, // ← Dynamic conversion!
      priceUSD: product.priceUSD, // Include USD price for reference
      currency: currency
    }));

    res.json({
      products,
      currency,
      currencies: CURRENCIES,
      exchangeRate: rate // Include the rate for debugging/info
    });

  } catch (error) {
    console.error('Failed to fetch products or rates:', error.message);
    // Fallback to USD prices if fetching rates fails
    const products = Object.values(PRODUCT_CATALOG).map(product => ({
        id: product.id,
        name: product.name,
        description: product.description,
        image: product.image,
        price: product.priceUSD, // Fallback to USD price
        priceUSD: product.priceUSD,
        currency: 'USD'
      }));

    res.status(500).json({ 
        error: 'Failed to load products. Exchange rate service unavailable, falling back to USD.',
        products: products,
        currency: 'USD',
        currencies: CURRENCIES,
        exchangeRate: 1
    });
  }
});

// Get supported currencies
app.get('/api/currencies', (req, res) => {
  res.json({
    currencies: CURRENCIES,
    default: 'USD'
  });
});

// --- START OF UPDATED create-payment ENDPOINT ---
// Create payment request
app.post('/api/create-payment', async (req, res) => {
  try {
    // 1. Приемане на 'network' с default стойност 'sepolia'
    const { productId, productName, price, currency = 'USD', network = 'sepolia' } = req.body;

    if (!productId || !productName || !price) {
      return res.status(400).json({ 
        error: 'Missing required fields: productId, productName, price' 
      });
    }

    const orderId = `TESTSHOP-${Date.now()}-${productId}`;

    console.log('Creating payment request:', {
      orderId,
      productName,
      price,
      currency,
      network // NEW: Log network
    });

    // Create payment request via BRSCPP API
    const response = await axios.post(
      `${BRSCPP_API_URL}/api/merchant/payment-request`,
      {
        orderId: orderId,
        amount: price.toString(),
        currency: currency, 
        network: network, // 2. ИЗПРАЩАНЕ НА МРЕЖАТА КЪМ BRSCPP
        description: `Payment for ${productName}`,
        customerEmail: null
      },
      {
        headers: {
          'Authorization': `Bearer ${BRSCPP_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    console.log('Payment request created:', response.data.paymentRequest.id);
    console.log('Conversion info:', response.data.conversion);

    // 3. ВРЪЩАНЕ НА МРЕЖАТА В ОТГОВОРА
    res.json({
      success: true,
      orderId: orderId,
      paymentUrl: response.data.paymentRequest.paymentUrl,
      amount: price.toString(),
      currency: currency,
      network: network, // NEW: Return network
      conversion: response.data.conversion || null
    });

  } catch (error) {
    console.error('Payment creation error:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Failed to create payment',
      details: error.response?.data || error.message
    });
  }
});
// --- END OF UPDATED create-payment ENDPOINT ---

// Get payment status
app.get('/api/payment-status/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;

    const response = await axios.get(
      `${BRSCPP_API_URL}/api/merchant/payment-request/${orderId}`,
      {
        headers: {
          'Authorization': `Bearer ${BRSCPP_API_KEY}`
        },
        timeout: 5000
      }
    );

    res.json(response.data);

  } catch (error) {
    console.error('Status check error:', error.message);
    res.status(500).json({ error: 'Failed to check payment status' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`
========================================
🛍️  TestShop Backend
========================================
Port: ${PORT}
API URL: ${BRSCPP_API_URL}
Environment: ${process.env.NODE_ENV || 'development'}
Supported Currencies: ${Object.keys(CURRENCIES).join(', ')}
Time: ${new Date().toISOString()}
========================================
  `);
});

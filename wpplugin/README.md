# BRSCPP Crypto Payments for WooCommerce

**Version:** 1.1.0  
**Author:** Slavcho Ivanov  
**License:** GPL v2 or later  
**Status:** Production Beta (December 2025)  
**Requires WordPress:** 5.8+  
**Requires WooCommerce:** 5.0+  
**Requires PHP:** 7.4+

---

## Table of Contents

1. [Overview](#overview)
2. [Key Features](#key-features)
3. [Supported Currencies](#supported-currencies)
4. [Payment Methods](#payment-methods)
5. [Installation](#installation)
6. [Configuration](#configuration)
7. [Payment Flow](#payment-flow)
8. [Webhook Integration](#webhook-integration)
9. [Plugin Architecture](#plugin-architecture)
10. [Order Management](#order-management)
11. [Customization](#customization)
12. [Troubleshooting](#troubleshooting)
13. [API Reference](#api-reference)
14. [Security](#security)
15. [Changelog](#changelog)
16. [Links and Resources](#links-and-resources)

---

## Overview

BRSCPP Crypto Payments for WooCommerce is a unified payment gateway enabling merchants to accept cryptocurrency, credit card (Stripe), and PayPal payments through a single integration. The plugin provides a secure, hosted checkout experience where customers choose their preferred payment method.

**Core Innovation:** Non-custodial cryptocurrency payments combined with traditional Stripe and PayPal processing. Crypto payments transfer directly to merchant wallets (P2P), while fiat payments process through Stripe Connect or PayPal Commerce Platform - no intermediary custody, maximum security, instant settlement.

### Why BRSCPP?

| Benefit | Description |
|---------|-------------|
| **Unified Gateway** | Single integration for crypto + Stripe + PayPal |
| **Non-Custodial** | Crypto funds go directly to merchant wallet (P2P) |
| **Multi-Currency** | Accept payments in 12 fiat currencies |
| **Real-Time Rates** | Chainlink oracles for accurate crypto pricing |
| **Instant Settlement** | P2P transfers, no waiting periods |
| **Secure Checkout** | Hosted payment page, PCI compliant |

### Supported Networks

| Network | Type | Status |
|---------|------|--------|
| Ethereum Sepolia | Testnet | ✅ Active |
| BSC Testnet | Testnet | ✅ Active |
| Polygon Amoy | Testnet | ✅ Active |
| Ethereum Mainnet | Mainnet | 🔜 Q4 2026 |
| BSC Mainnet | Mainnet | 🔜 Q4 2026 |
| Polygon Mainnet | Mainnet | 🔜 Q4 2026 |

---

## Key Features

### Triple Payment System
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         BRSCPP PAYMENT OPTIONS                              │
├───────────────────────┬───────────────────────┬─────────────────────────────┤
│   💳 STRIPE (CARDS)   │   🅿️ PAYPAL           │      🪙 CRYPTO              │
├───────────────────────┼───────────────────────┼─────────────────────────────┤
│ Credit/Debit Cards    │ PayPal Account        │ Native: ETH, BNB, MATIC     │
│ Apple Pay/Google Pay  │ Pay Later Options     │ Stablecoins: USDC, USDT     │
│ Bank Transfers        │ Venmo (US)            │ Multi-chain support         │
├───────────────────────┼───────────────────────┼─────────────────────────────┤
│ Funds → Stripe ($)    │ Funds → PayPal ($)    │ Funds → Wallet (P2P)        │
│ Standard Stripe fees  │ Standard PayPal fees  │ 0.5% protocol fee           │
│ Stripe payout         │ PayPal payout         │ Instant settlement          │
└───────────────────────┴───────────────────────┴─────────────────────────────┘
```

### Version 1.1.0 New Features (December 2025)

- **PayPal Commerce Platform** integration
- **Three payment methods** in one checkout (Crypto, Stripe, PayPal)
- **Improved webhook handling** for all payment providers
- **Network-specific explorer links** for transactions
- **Enhanced order metadata** with provider information

### Non-Custodial Architecture

**Cryptocurrency Payments:**
- Direct peer-to-peer transfers
- Funds sent directly to merchant's blockchain wallet
- No intermediary custody or escrow
- Instant settlement on blockchain confirmation
- Smart contract enforced security

**Fiat Payments (Stripe & PayPal):**
- Processed via Stripe Connect / PayPal Commerce Platform
- Funds deposited to merchant's connected account in USD
- Standard security and compliance
- Familiar payout process

### Real-Time Currency Conversion

All payments are processed in USD internally. The system supports 12 fiat currencies with real-time conversion:
```
Customer pays €100 EUR
        ↓
Exchange rate lookup (ExchangeRate API)
        ↓
Converted to $108.70 USD
        ↓
Payment processed in USD equivalent
```

### Security Features

| Feature | Crypto | Stripe | PayPal |
|---------|--------|--------|--------|
| Non-Custodial | ✅ P2P direct | N/A | N/A |
| Smart Contract Security | ✅ Audited | N/A | N/A |
| Reentrancy Protection | ✅ OpenZeppelin | N/A | N/A |
| PCI Compliance | N/A | ✅ Level 1 | ✅ Level 1 |
| Webhook Signatures | ✅ HMAC-SHA256 | ✅ Stripe sig | ✅ PayPal sig |
| SSL/TLS | ✅ Required | ✅ Required | ✅ Required |

---

## Supported Currencies

### Fiat Currencies (12)

Customers can view prices and initiate payments in any of these currencies:

| Currency | Code | Symbol | Region |
|----------|------|--------|--------|
| US Dollar | USD | $ | United States |
| Euro | EUR | € | European Union |
| British Pound | GBP | £ | United Kingdom |
| Japanese Yen | JPY | ¥ | Japan |
| Chinese Yuan | CNY | ¥ | China |
| Russian Ruble | RUB | ₽ | Russia |
| Indian Rupee | INR | ₹ | India |
| Canadian Dollar | CAD | $ | Canada |
| Australian Dollar | AUD | $ | Australia |
| Brazilian Real | BRL | R$ | Brazil |
| Mexican Peso | MXN | $ | Mexico |
| South Korean Won | KRW | ₩ | South Korea |

### Cryptocurrencies

**Native Tokens:**

| Token | Network | Oracle |
|-------|---------|--------|
| ETH | Ethereum Sepolia | Chainlink ETH/USD |
| BNB | BSC Testnet | Chainlink BNB/USD |
| MATIC | Polygon Amoy | Chainlink MATIC/USD |

**Stablecoins (1:1 USD):**

| Token | Networks | Advantage |
|-------|----------|-----------|
| USDC | All | 310% lower gas vs native |
| USDT | All | 310% lower gas vs native |

---

## Payment Methods

### Stripe (Credit Cards)

**How it works:**
1. Customer selects "Pay with Card" on BRSCPP checkout
2. Redirected to Stripe Checkout session
3. Completes payment with card/Apple Pay/Google Pay
4. Stripe processes payment
5. Webhook confirms to WooCommerce
6. Funds deposited to merchant's Stripe account

**Requirements:**
- Merchant Stripe account connected via BRSCPP Dashboard
- Stripe Connect onboarding completed

### PayPal

**How it works:**
1. Customer selects "Pay with PayPal" on BRSCPP checkout
2. Redirected to PayPal checkout
3. Logs in and approves payment
4. PayPal processes payment
5. Webhook confirms to WooCommerce
6. Funds deposited to merchant's PayPal account

**Requirements:**
- Merchant PayPal account connected via BRSCPP Dashboard
- PayPal Commerce Platform onboarding completed

### Cryptocurrency

**How it works:**
1. Customer selects "Pay with Crypto" on BRSCPP checkout
2. Connects MetaMask wallet
3. Selects network (Ethereum/BSC/Polygon)
4. Selects token (Native or Stablecoin)
5. Chainlink oracle calculates exact amount
6. Customer confirms transaction
7. Funds transfer directly to merchant wallet (P2P)
8. Webhook confirms to WooCommerce

**Requirements:**
- Merchant wallet address configured
- Customer needs MetaMask or compatible wallet
- Sufficient token balance + gas fees

---

## Installation

### Method 1: Manual Upload

1. Download the plugin zip file
2. Navigate to WordPress Admin → Plugins → Add New
3. Click "Upload Plugin"
4. Select the zip file and click "Install Now"
5. Click "Activate Plugin"

### Method 2: FTP Upload
```bash
# Upload to plugins directory
scp brscpp-woocommerce.zip user@server:/tmp/

# SSH to server
ssh user@server

# Extract to plugins directory
cd /var/www/html/your-site/wp-content/plugins/
unzip /tmp/brscpp-woocommerce.zip
```

### Method 3: WP-CLI
```bash
cd /var/www/html/your-site
wp plugin install /path/to/brscpp-woocommerce.zip --activate
```

### Verification
```bash
# Check plugin status
wp plugin list | grep brscpp

# Expected output:
# brscpp-woocommerce    active    none    1.1.0
```

---

## Configuration

### Step 1: Access Plugin Settings

Navigate to: **WooCommerce → Settings → Payments → Crypto Payment (BRSCPP)**

### Step 2: Configure Settings

| Setting | Description | Example |
|---------|-------------|---------|
| Enable/Disable | Activate the payment gateway | ✅ Checked |
| Title | Payment method name at checkout | Pay with Crypto or Card |
| Description | Customer-facing description | Secure payment via crypto, card or PayPal |
| API URL | BRSCPP API endpoint | https://api.brscpp.slavy.space |
| API Key | Your merchant API key | brscpp_live_xxxx... |
| Webhook Secret | Secret for signature verification | your_webhook_secret |
| Test Mode | Enable testnet networks | ✅ Checked (for testing) |

### Step 3: Configure Webhook URL

Register your webhook URL in the BRSCPP Merchant Dashboard:
```
Webhook URL: https://your-store.com/wp-json/brscpp/v1/webhook
```

### Step 4: Obtain API Key

1. Login to Merchant Dashboard: https://merchant-dashboard.brscpp.slavy.space
2. Navigate to API Keys section
3. Click "Create New Key"
4. Copy the key (shown only once!)
5. Paste in plugin settings

### Step 5: Connect Payment Providers

In the BRSCPP Merchant Dashboard → Settings:

1. **Crypto:** Configure wallet address and enabled networks/tokens
2. **Stripe:** Click "Connect Stripe" and complete onboarding
3. **PayPal:** Click "Connect PayPal" and complete onboarding

---

## Payment Flow

### Customer Experience
```
┌─────────────────────────────────────────────────────────────────┐
│                      CHECKOUT FLOW                              │
└─────────────────────────────────────────────────────────────────┘

1. WOOCOMMERCE CHECKOUT
   └─► Customer fills shipping/billing info
   └─► Selects "Pay with Crypto, Card or PayPal"
   └─► Clicks "Place Order"

2. REDIRECT TO BRSCPP
   └─► Secure hosted payment page
   └─► URL: payment.brscpp.slavy.space/checkout/{orderId}

3. PAYMENT METHOD SELECTION
   ┌─────────────────────────────────────┐
   │  Choose Payment Method              │
   │                                     │
   │  [💳 Pay with Card - Stripe]        │
   │                                     │
   │  [🅿️ Pay with PayPal]               │
   │                                     │
   │  [🪙 Pay with Crypto]               │
   │     • ETH, BNB, MATIC               │
   │     • USDC, USDT                    │
   └─────────────────────────────────────┘

4a. STRIPE PATH                4b. PAYPAL PATH               4c. CRYPTO PATH
    └─► Stripe Checkout            └─► PayPal Checkout           └─► Connect MetaMask
    └─► Enter card details         └─► Login & approve           └─► Select network
    └─► Confirm payment            └─► Confirm payment           └─► Select token
    └─► Stripe processes           └─► PayPal processes          └─► Confirm in wallet
    └─► Funds → Stripe ($)         └─► Funds → PayPal ($)        └─► Funds → Wallet (P2P)

5. CONFIRMATION
   └─► Webhook sent to WooCommerce
   └─► Order status → "Processing"
   └─► Customer redirected to thank you page
   └─► Email confirmation sent
```

### Technical Flow
```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  WooCommerce │────►│  BRSCPP API  │────►│  Payment App │
│   Checkout   │ 1   │   Backend    │ 2   │   Frontend   │
└──────────────┘     └──────┬───────┘     └──────┬───────┘
                            │                     │
         ┌──────────────────┼──────────────────┐  │
         │                  │                  │  │
         ▼                  ▼                  ▼  ▼
  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
  │    Stripe    │   │    PayPal    │   │  Blockchain  │
  │   Checkout   │   │   Checkout   │   │  (MetaMask)  │
  └──────┬───────┘   └──────┬───────┘   └──────┬───────┘
         │                  │                  │
         │ 3a               │ 3b               │ 3c
         ▼                  ▼                  ▼
  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
  │   Stripe     │   │   PayPal     │   │   Merchant   │
  │   Account    │   │   Account    │   │    Wallet    │
  │    (USD)     │   │    (USD)     │   │    (P2P)     │
  └──────────────┘   └──────────────┘   └──────────────┘
         │                  │                  │
         └──────────────────┼──────────────────┘
                            │ 4
                            ▼
                     ┌──────────────┐
                     │   Webhook    │
                     │   Handler    │
                     └──────┬───────┘
                            │ 5
                            ▼
                     ┌──────────────┐
                     │    Order     │
                     │   Updated    │
                     └──────────────┘
```

---

## Webhook Integration

### Webhook Endpoint

**URL:** `https://your-store.com/wp-json/brscpp/v1/webhook`  
**Method:** POST  
**Content-Type:** application/json

### Webhook Payload (Crypto Payment)
```json
{
  "event": "payment.completed",
  "payment": {
    "id": "uuid",
    "orderId": "WC-100-7323a1aa",
    "txHash": "0x495a5af67...",
    "usdAmount": 178.50,
    "network": "bscTestnet",
    "customerAddress": "0x742d35Cc...",
    "tokenAmount": "0.2746"
  },
  "timestamp": "2025-12-24T00:02:45.123Z"
}
```

### Webhook Payload (Stripe Payment)
```json
{
  "event": "payment.completed",
  "payment": {
    "id": "uuid",
    "orderId": "WC-101-8434b2bb",
    "txHash": "pi_3abc123...",
    "usdAmount": 178.50,
    "network": "stripe"
  },
  "timestamp": "2025-12-24T00:05:12.456Z"
}
```

### Webhook Payload (PayPal Payment)
```json
{
  "event": "payment.completed",
  "payment": {
    "id": "uuid",
    "orderId": "WC-102-9545c3cc",
    "txHash": "5GP12345AB678901C",
    "usdAmount": 178.50,
    "network": "paypal"
  },
  "timestamp": "2025-12-24T00:07:33.789Z"
}
```

### Webhook Headers

| Header | Description | Example |
|--------|-------------|---------|
| X-BRSCPP-Event | Event type | payment.completed |
| X-BRSCPP-Signature | HMAC-SHA256 signature | sha256=a1b2c3d4e5... |

### Signature Verification
```php
$payload = $request->get_json_params();
$signature = $request->get_header('X-BRSCPP-Signature');
$secret = $gateway->get_option('webhook_secret');

$expected = 'sha256=' . hash_hmac('sha256', json_encode($payload), $secret);

if (!hash_equals($expected, $signature)) {
    return new WP_REST_Response(['error' => 'Invalid signature'], 401);
}
```

---

## Plugin Architecture

### File Structure
```
brscpp-woocommerce/
├── brscpp-woocommerce.php      # Main plugin file
├── includes/
│   └── class-wc-gateway-brscpp.php
└── README.md
```

### Main Components

**Plugin Initialization:**
```php
add_action('plugins_loaded', 'brscpp_init');

function brscpp_init() {
    if (!class_exists('WooCommerce')) {
        return;
    }
    require_once 'includes/class-wc-gateway-brscpp.php';
    add_filter('woocommerce_payment_gateways', function($gateways) {
        $gateways[] = 'WC_Gateway_BRSCPP';
        return $gateways;
    });
}
```

**Payment Gateway Class:**
```php
class WC_Gateway_BRSCPP extends WC_Payment_Gateway {
    
    public function __construct() {
        $this->id = 'brscpp';
        $this->method_title = 'Crypto Payment (BRSCPP)';
        $this->has_fields = false;
        $this->supports = ['products'];
    }
    
    public function process_payment($order_id) {
        // Create payment request via API
        // Redirect to hosted checkout
    }
}
```

**Webhook Handler:**
```php
add_action('rest_api_init', function() {
    register_rest_route('brscpp/v1', '/webhook', [
        'methods' => 'POST',
        'callback' => 'brscpp_handle_webhook',
        'permission_callback' => '__return_true'
    ]);
});
```

---

## Order Management

### Order Metadata

| Meta Key | Description | Example |
|----------|-------------|---------|
| _brscpp_order_id | BRSCPP order identifier | WC-100-7323a1aa |
| _brscpp_tx_hash | Transaction hash/ID | 0x495a5af67... |
| _brscpp_network | Payment network | bscTestnet / stripe / paypal |
| _brscpp_payment_provider | Provider type | crypto / stripe / paypal |
| _brscpp_amount | USD amount | 178.50 |

### Order Status Mapping

| BRSCPP Event | WooCommerce Status |
|--------------|-------------------|
| Payment Created | Pending Payment |
| payment.completed | Processing |
| payment.failed | Failed |

### Admin Order View

The plugin adds payment details to the order admin page:

**Crypto Payment:**
```
╔════════════════════════════════════════╗
║  🪙 Crypto Payment Details             ║
╠════════════════════════════════════════╣
║  Provider: Cryptocurrency              ║
║  Network: bscTestnet                   ║
║  Amount: $178.50 USD                   ║
║  TX Hash: 0x495a5a... [View on BSCScan]║
║  Settlement: Direct to wallet (P2P)    ║
╚════════════════════════════════════════╝
```

**Stripe Payment:**
```
╔════════════════════════════════════════╗
║  💳 Stripe Payment Details             ║
╠════════════════════════════════════════╣
║  Provider: Stripe                      ║
║  Amount: $178.50 USD                   ║
║  Payment Intent: pi_3abc123...         ║
║  Settlement: Stripe account            ║
╚════════════════════════════════════════╝
```

**PayPal Payment:**
```
╔════════════════════════════════════════╗
║  🅿️ PayPal Payment Details             ║
╠════════════════════════════════════════╣
║  Provider: PayPal                      ║
║  Amount: $178.50 USD                   ║
║  Transaction ID: 5GP12345AB678901C     ║
║  Settlement: PayPal account            ║
╚════════════════════════════════════════╝
```

---

## Customization

### Modify Payment Method Title
```php
add_filter('woocommerce_gateway_title', function($title, $gateway_id) {
    if ($gateway_id === 'brscpp') {
        return '💳 Card, 🅿️ PayPal or 🪙 Crypto';
    }
    return $title;
}, 10, 2);
```

### Custom Order Note
```php
add_action('brscpp_payment_completed', function($order, $payment_data) {
    $network = $payment_data['network'] ?? 'unknown';
    $order->add_order_note(
        sprintf('Payment received via %s', ucfirst($network))
    );
}, 10, 2);
```

---

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| "No API key" | API key not configured | Add API key in plugin settings |
| 404 on webhook | REST API disabled | Flush permalinks |
| Order not updating | Webhook not received | Check webhook URL in dashboard |
| "Invalid signature" | Wrong webhook secret | Match secret in both places |
| Payment method missing | Provider not connected | Connect in BRSCPP Dashboard |

### Debug Mode
```php
// wp-config.php
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);
```

### Log Entries
```bash
grep "BRSCPP" /var/www/html/wp-content/debug.log

# Example:
[24-Dec-2025 00:02:45] [BRSCPP] Webhook received: payment.completed
[24-Dec-2025 00:02:45] [BRSCPP] Order 100 marked as processing
```

---

## API Reference

### Payment Request Creation

**Endpoint:** POST /api/merchant/payment-request

**Request:**
```json
{
  "orderId": "WC-100-7323a1aa",
  "amount": 170.00,
  "currency": "EUR",
  "description": "Order #100"
}
```

**Response:**
```json
{
  "success": true,
  "orderId": "WC-100-7323a1aa",
  "paymentUrl": "https://payment.brscpp.slavy.space/checkout/WC-100-7323a1aa",
  "amountUsd": 178.50,
  "allowedMethods": ["crypto", "stripe", "paypal"]
}
```

---

## Security

### Non-Custodial Design

**Crypto Payments:**
- Smart contracts transfer funds directly to merchant wallet
- No intermediary holding or escrow
- Peer-to-peer (P2P) instant settlement

**Fiat Payments:**
- Processed by Stripe/PayPal (PCI Level 1 compliant)
- Funds deposited directly to merchant accounts
- BRSCPP never handles card/account data

### Best Practices

1. Use strong, unique webhook secrets
2. Keep API keys confidential
3. Enable HTTPS on your store
4. Regularly rotate API keys
5. Keep plugin updated

---

## Changelog

### Version 1.1.0 (December 2025)

- Added PayPal Commerce Platform integration
- Three payment methods in one checkout
- Improved webhook handling for all providers
- Network-specific explorer links
- Enhanced order metadata

### Version 1.0.0 (December 2025)

- Initial release
- Crypto + Stripe dual payment system
- Multi-currency support (12 fiat currencies)
- Multi-network support (Sepolia, BSC, Amoy)
- Webhook-based order updates
- HMAC signature verification

---

## Links and Resources

| Resource | URL |
|----------|-----|
| BRSCPP Main Site | https://brscpp.slavy.space |
| Merchant Dashboard | https://merchant-dashboard.brscpp.slavy.space |
| API Documentation | https://brscpp.slavy.space/docs |
| GitHub Repository | https://github.com/ivanovslavy/BRSCPP |
| Support | https://me.slavy.space |

---

## License

GPL v2 or later

---

**Last Updated:** December 24, 2025  
**Document Version:** 1.1.0  
**Author:** Slavcho Ivanov

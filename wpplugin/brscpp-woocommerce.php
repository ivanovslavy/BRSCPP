<?php
error_log('BRSCPP Plugin Loaded!');
/**
 * Plugin Name: BRSCPP Crypto Payments for WooCommerce
 * Plugin URI: https://brscpp.slavy.space
 * Description: Accept crypto payments (BNB, ETH, MATIC, USDC, USDT) via BRSCryptoPaymentProtocol
 * Version: 1.0.0
 * Author: Slavy
 * Author URI: https://brscpp.slavy.space
 * Requires at least: 5.8
 * Requires PHP: 7.4
 * WC requires at least: 5.0
 * WC tested up to: 8.0
 * License: GPL v2 or later
 */

if (!defined('ABSPATH')) exit;

// ============================================
// WEBHOOK ENDPOINT - Must be outside brscpp_init!
// ============================================
add_action('rest_api_init', function() {
    register_rest_route('brscpp/v1', '/webhook', [
        'methods' => 'POST',
        'callback' => 'brscpp_handle_webhook',
        'permission_callback' => '__return_true'
    ]);
});

// Check if WooCommerce is active
add_action('plugins_loaded', 'brscpp_check_woocommerce');
function brscpp_check_woocommerce() {
    if (!class_exists('WooCommerce')) {
        add_action('admin_notices', function() {
            echo '<div class="error"><p><strong>BRSCPP Crypto Payments</strong> requires WooCommerce to be installed and active.</p></div>';
        });
        return;
    }
    brscpp_init();
}

function brscpp_init() {

    // ============================================
    // PAYMENT GATEWAY
    // ============================================
    add_filter('woocommerce_payment_gateways', function($gateways) {
        $gateways[] = 'WC_Gateway_BRSCPP';
        return $gateways;
    });

    // Gateway class
    class WC_Gateway_BRSCPP extends WC_Payment_Gateway {
        
        public function __construct() {
            $this->id = 'brscpp';
            $this->method_title = 'Crypto Payment (BRSCPP)';
            $this->method_description = 'Accept BNB, ETH, MATIC, USDC, USDT payments';
            $this->has_fields = false;
            $this->supports = ['products'];

            // Block checkout support
            add_action('woocommerce_blocks_loaded', function() {
                if (class_exists('Automattic\WooCommerce\Blocks\Payments\Integrations\AbstractPaymentMethodType')) {
                    add_action('woocommerce_blocks_payment_method_type_registration', function($registry) {
                        $registry->register(new class extends \Automattic\WooCommerce\Blocks\Payments\Integrations\AbstractPaymentMethodType {
                            protected $name = 'brscpp';
                            
                            public function initialize() {}
                            
                            public function is_active() {
                                return true;
                            }
                            
                            public function get_payment_method_script_handles() {
                                return [];
                            }
                            
                            public function get_payment_method_data() {
                                $gateway = new \WC_Gateway_BRSCPP();
                                return [
                                    'title' => $gateway->title,
                                    'description' => $gateway->description,
                                    'supports' => $gateway->supports
                                ];
                            }
                        });
                    });
                }
            });
            
            $this->init_form_fields();
            $this->init_settings();
            
            $this->title = $this->get_option('title');
            $this->description = $this->get_option('description');
            $this->enabled = $this->get_option('enabled');
            $this->api_url = rtrim($this->get_option('api_url'), '/');
            $this->api_key = $this->get_option('api_key');
            $this->webhook_secret = $this->get_option('webhook_secret');
            
            add_action('woocommerce_update_options_payment_gateways_' . $this->id, [$this, 'process_admin_options']);
        }
        
        public function init_form_fields() {
            $webhook_url = rest_url('brscpp/v1/webhook');
            
            $this->form_fields = [
                'enabled' => [
                    'title' => 'Enable/Disable',
                    'type' => 'checkbox',
                    'label' => 'Enable Crypto Payments',
                    'default' => 'no'
                ],
                'title' => [
                    'title' => 'Title',
                    'type' => 'text',
                    'default' => 'Pay with Crypto',
                    'desc_tip' => true,
                    'description' => 'Title shown at checkout'
                ],
                'description' => [
                    'title' => 'Description',
                    'type' => 'textarea',
                    'default' => 'Pay securely with BNB, ETH, MATIC, USDC or USDT',
                    'desc_tip' => true
                ],
                'api_url' => [
                    'title' => 'API URL',
                    'type' => 'text',
                    'default' => 'https://api.brscpp.slavy.space',
                    'description' => 'BRSCPP API endpoint'
                ],
                'api_key' => [
                    'title' => 'API Key',
                    'type' => 'password',
                    'description' => 'Your merchant API key from BRSCPP dashboard'
                ],
                'webhook_secret' => [
                    'title' => 'Webhook Secret',
                    'type' => 'password',
                    'description' => 'Secret for verifying webhook signatures'
                ],
                'webhook_url' => [
                    'title' => 'Webhook URL',
                    'type' => 'title',
                    'description' => '<code style="background:#f0f0f0;padding:8px;display:block;margin-top:5px;">' . esc_html($webhook_url) . '</code><br>Register this URL in your BRSCPP merchant dashboard.'
                ],
                'testmode' => [
                    'title' => 'Test Mode',
                    'type' => 'checkbox',
                    'label' => 'Use testnet networks (Sepolia, BSC Testnet, Amoy)',
                    'default' => 'yes'
                ]
            ];
        }
        
        public function process_payment($order_id) {
            $order = wc_get_order($order_id);
            
            // Generate unique order ID for BRSCPP
            $brscpp_order_id = 'WC-' . $order_id . '-' . substr(md5(uniqid()), 0, 8);
            
            // Store for later reference
            $order->update_meta_data('_brscpp_order_id', $brscpp_order_id);
            $order->save();
            
            // Create payment request via API
            $response = $this->create_payment_request($order, $brscpp_order_id);
            
            if (is_wp_error($response)) {
                wc_add_notice($response->get_error_message(), 'error');
                return ['result' => 'failure'];
            }
            
            // Update order status
            $order->update_status('pending', __('Awaiting crypto payment', 'brscpp'));
            
            // Empty cart
            WC()->cart->empty_cart();
            
            // Redirect to BRSCPP payment page
            return [
                'result' => 'success',
                'redirect' => $response['paymentUrl']
            ];
        }
        
        private function create_payment_request($order, $brscpp_order_id) {
            $body = [
                'orderId' => $brscpp_order_id,
                'amount' => $order->get_total(),
                'currency' => $order->get_currency(),
                'description' => sprintf('Order #%s from %s', $order->get_id(), get_bloginfo('name'))
            ];
            
            $response = wp_remote_post($this->api_url . '/api/merchant/payment-request', [
              'headers' => [
    'Content-Type' => 'application/json',
    'Authorization' => 'Bearer ' . $this->api_key
],
                'body' => json_encode($body),
                'timeout' => 30
            ]);
            
            if (is_wp_error($response)) {
                brscpp_log('API Error: ' . $response->get_error_message());
                return new WP_Error('api_error', 'Could not connect to payment server');
            }
            
            $status_code = wp_remote_retrieve_response_code($response);
            $body = json_decode(wp_remote_retrieve_body($response), true);
            
            brscpp_log('API Response [' . $status_code . ']: ' . print_r($body, true));
            
            if ($status_code !== 201 || empty($body['paymentUrl'])) {
                $error = $body['error'] ?? 'Failed to create payment request';
                return new WP_Error('api_error', $error);
            }
            
            return $body;
        }
    }
}

// ============================================
// WEBHOOK HANDLER
// ============================================
function brscpp_handle_webhook(WP_REST_Request $request) {
    $payload = $request->get_json_params();
    $signature = $request->get_header('X-BRSCPP-Signature');
    $event_type = $request->get_header('X-BRSCPP-Event');
    $timestamp = $request->get_header('X-BRSCPP-Timestamp');
    
    brscpp_log('=== WEBHOOK RECEIVED ===');
    brscpp_log('Event: ' . $event_type);
    brscpp_log('Payload: ' . json_encode($payload));
    
    // Get webhook secret
    $gateway = new WC_Gateway_BRSCPP();
    $secret = $gateway->get_option('webhook_secret');
    
    // Verify signature
    if ($secret && $signature) {
        $expected = hash_hmac('sha256', json_encode($payload), $secret);
        if (!hash_equals($expected, $signature)) {
            brscpp_log('❌ Invalid signature!');
            return new WP_REST_Response(['error' => 'Invalid signature'], 401);
        }
        brscpp_log('Signature verified');
    }
    
    // Handle event
    $event = $payload['event'] ?? '';
    
    switch ($event) {
        case 'payment.completed':
            return brscpp_handle_payment_completed($payload);
            
        case 'payment.failed':
            return brscpp_handle_payment_failed($payload);
            
        default:
            brscpp_log('Unknown event: ' . $event);
            return new WP_REST_Response(['status' => 'ignored'], 200);
    }
}

function brscpp_handle_payment_completed($payload) {
    $payment = $payload['payment'] ?? [];
    $order_id_full = $payment['orderId'] ?? '';
    
    // Extract WooCommerce order ID: "WC-12345-abc123" -> 12345
    if (!preg_match('/^WC-(\d+)-/', $order_id_full, $matches)) {
        brscpp_log('Invalid order ID format: ' . $order_id_full);
        return new WP_REST_Response(['error' => 'Invalid order ID format'], 400);
    }
    
    $wc_order_id = intval($matches[1]);
    $order = wc_get_order($wc_order_id);
    
    if (!$order) {
        brscpp_log('Order not found: ' . $wc_order_id);
        return new WP_REST_Response(['error' => 'Order not found'], 404);
    }
    
    // Check if already processed
    if ($order->is_paid()) {
        brscpp_log('Order already paid: ' . $wc_order_id);
        return new WP_REST_Response(['status' => 'already_processed'], 200);
    }
    
    // Verify stored BRSCPP order ID matches
    $stored_brscpp_id = $order->get_meta('_brscpp_order_id');
    if ($stored_brscpp_id && $stored_brscpp_id !== $order_id_full) {
        brscpp_log('Order ID mismatch! Stored: ' . $stored_brscpp_id . ', Received: ' . $order_id_full);
        return new WP_REST_Response(['error' => 'Order ID mismatch'], 400);
    }
    
    // Extract payment details
    $tx_hash = $payment['txHash'] ?? '';
    $network = $payment['network'] ?? '';
    $payment_mode = $payment['paymentMode'] ?? '';
    $token_address = $payment['tokenAddress'] ?? '';
    $block_number = $payment['blockNumber'] ?? '';
    
    // Determine amount based on payment mode
    if ($payment_mode === 'direct') {
        $amount = $payment['amount'] ?? '';
        $merchant_amount = $payment['merchantAmount'] ?? '';
        $fee_amount = $payment['feeAmount'] ?? '';
    } else {
        $amount = $payment['tokenAmount'] ?? '';
        $merchant_amount = $payment['merchantAmount'] ?? '';
        $fee_amount = $payment['feeAmount'] ?? '';
    }
    
    // Get token symbol
    $token_symbol = brscpp_get_token_symbol($token_address, $network);
    
    // Mark as paid
    $order->payment_complete($tx_hash);
    
    // Add order note
    $order->add_order_note(sprintf(
        'Crypto payment confirmed!
Network: %s
Token: %s
Amount: %s %s
Merchant Amount: %s %s
Fee: %s %s
TX Hash: %s
Block: %s
Mode: %s',
        $network,
        $token_symbol,
        $amount, $token_symbol,
        $merchant_amount, $token_symbol,
        $fee_amount, $token_symbol,
        $tx_hash,
        $block_number,
        $payment_mode
    ));
    
    // Save payment meta
    $order->update_meta_data('_brscpp_tx_hash', $tx_hash);
    $order->update_meta_data('_brscpp_network', $network);
    $order->update_meta_data('_brscpp_token', $token_symbol);
    $order->update_meta_data('_brscpp_amount', $amount);
    $order->update_meta_data('_brscpp_payment_mode', $payment_mode);
    $order->update_meta_data('_brscpp_block_number', $block_number);
    $order->save();
    
    brscpp_log('Order ' . $wc_order_id . ' marked as paid. TX: ' . $tx_hash);
    
    return new WP_REST_Response([
        'status' => 'success',
        'order_id' => $wc_order_id,
        'message' => 'Payment processed'
    ], 200);
}

function brscpp_handle_payment_failed($payload) {
    $payment = $payload['payment'] ?? [];
    $order_id_full = $payment['orderId'] ?? '';
    
    if (!preg_match('/^WC-(\d+)-/', $order_id_full, $matches)) {
        return new WP_REST_Response(['error' => 'Invalid order ID'], 400);
    }
    
    $wc_order_id = intval($matches[1]);
    $order = wc_get_order($wc_order_id);
    
    if ($order && !$order->is_paid()) {
        $order->update_status('failed', __('Crypto payment failed', 'brscpp'));
        brscpp_log('Order ' . $wc_order_id . ' marked as failed');
    }
    
    return new WP_REST_Response(['status' => 'noted'], 200);
}

// ============================================
// HELPER FUNCTIONS
// ============================================
function brscpp_get_token_symbol($address, $network) {
    $address = strtolower($address);
    
    // Native token (zero address)
    if ($address === '0x0000000000000000000000000000000000000000') {
        $natives = [
            'sepolia' => 'ETH',
            'mainnet' => 'ETH',
            'bscTestnet' => 'BNB',
            'bsc' => 'BNB',
            'amoy' => 'MATIC',
            'polygon' => 'MATIC'
        ];
        return $natives[$network] ?? 'NATIVE';
    }
    
    // Known stablecoins (check last 4 chars for partial match)
    $known_tokens = [
        // USDC addresses
        '3e49' => 'USDC', // Sepolia
        '0fa0c4c' => 'USDC', // BSC Testnet
        '1a1bae2' => 'USDC', // Amoy
        '3606eb48' => 'USDC', // ETH Mainnet
        'd580d' => 'USDC', // BSC Mainnet
        '5c3359' => 'USDC', // Polygon
        
        // USDT addresses  
        '0eaa1' => 'USDT', // Sepolia
        '3f23d' => 'USDT', // BSC Testnet
        'f6ff2bf7dc' => 'USDT', // Amoy
        'd831ec7' => 'USDT', // ETH Mainnet
        '3197955' => 'USDT', // BSC Mainnet
        'b58e8f' => 'USDT', // Polygon
    ];
    
    foreach ($known_tokens as $suffix => $symbol) {
        if (str_ends_with($address, strtolower($suffix))) {
            return $symbol;
        }
    }
    
    return 'TOKEN';
}

function brscpp_log($message) {
    if (defined('WP_DEBUG') && WP_DEBUG) {
        error_log('[BRSCPP] ' . $message);
    }
}

// ============================================
// ADMIN: SHOW PAYMENT DETAILS IN ORDER
// ============================================
add_action('woocommerce_admin_order_data_after_billing_address', function($order) {
    $tx_hash = $order->get_meta('_brscpp_tx_hash');
    if (!$tx_hash) return;
    
    $network = $order->get_meta('_brscpp_network');
    $token = $order->get_meta('_brscpp_token');
    $amount = $order->get_meta('_brscpp_amount');
    $mode = $order->get_meta('_brscpp_payment_mode');
    
    $explorers = [
        'sepolia' => 'https://sepolia.etherscan.io/tx/',
        'mainnet' => 'https://etherscan.io/tx/',
        'bscTestnet' => 'https://testnet.bscscan.com/tx/',
        'bsc' => 'https://bscscan.com/tx/',
        'amoy' => 'https://amoy.polygonscan.com/tx/',
        'polygon' => 'https://polygonscan.com/tx/'
    ];
    
    $explorer_url = ($explorers[$network] ?? '') . $tx_hash;
    
    echo '<div class="brscpp-payment-info" style="margin-top:20px;padding:15px;background:#f8f9fa;border-left:4px solid #28a745;">';
    echo '<h3 style="margin:0 0 10px;">Crypto Payment Details</h3>';
    echo '<p><strong>Network:</strong> ' . esc_html($network) . '</p>';
    echo '<p><strong>Token:</strong> ' . esc_html($token) . '</p>';
    echo '<p><strong>Amount:</strong> ' . esc_html($amount) . ' ' . esc_html($token) . '</p>';
    echo '<p><strong>Mode:</strong> ' . esc_html($mode) . '</p>';
    echo '<p><strong>TX Hash:</strong> <a href="' . esc_url($explorer_url) . '" target="_blank">' . esc_html(substr($tx_hash, 0, 20)) . '...</a></p>';
    echo '</div>';
});

// ============================================
// ORDER EMAILS: ADD TX INFO
// ============================================
add_action('woocommerce_email_after_order_table', function($order, $sent_to_admin, $plain_text) {
    $tx_hash = $order->get_meta('_brscpp_tx_hash');
    if (!$tx_hash) return;
    
    $network = $order->get_meta('_brscpp_network');
    $token = $order->get_meta('_brscpp_token');
    $amount = $order->get_meta('_brscpp_amount');
    
    if ($plain_text) {
        echo "\n\n=== Crypto Payment ===\n";
        echo "Network: $network\n";
        echo "Token: $token\n";
        echo "Amount: $amount $token\n";
        echo "TX: $tx_hash\n";
    } else {
        echo '<h2 style="margin-top:20px;">Crypto Payment</h2>';
        echo '<table cellspacing="0" cellpadding="6" border="1" style="border-collapse:collapse;">';
        echo '<tr><td><strong>Network</strong></td><td>' . esc_html($network) . '</td></tr>';
        echo '<tr><td><strong>Token</strong></td><td>' . esc_html($token) . '</td></tr>';
        echo '<tr><td><strong>Amount</strong></td><td>' . esc_html($amount) . ' ' . esc_html($token) . '</td></tr>';
        echo '<tr><td><strong>TX Hash</strong></td><td style="word-break:break-all;">' . esc_html($tx_hash) . '</td></tr>';
        echo '</table>';
    }
}, 10, 3);

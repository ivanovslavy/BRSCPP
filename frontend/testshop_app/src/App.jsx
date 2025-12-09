import { useState, useEffect } from 'react';

const NETWORKS = {
  sepolia: { name: 'Sepolia', chain: 'Ethereum' },
  bscTestnet: { name: 'BSC Testnet', chain: 'Binance Smart Chain' }
};

export default function App() {
  const [products, setProducts] = useState([]);
  const [currencies, setCurrencies] = useState({});
  // LINE ~14: Force USD as default (ignore localStorage)
  const [selectedCurrency, setSelectedCurrency] = useState('USD'); 
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showNetworkModal, setShowNetworkModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currencyMenuOpen, setCurrencyMenuOpen] = useState(false);
  
  // LINE ~17-21: Remove localStorage loading, always start with USD, fetch products immediately
  useEffect(() => {
    // Always start with USD - don't load from localStorage
    setSelectedCurrency('USD');
    fetchCurrencies();
    fetchProducts('USD'); // Initial fetch of products in USD
  }, []);

  // LINE ~23-25: Update on currency change (removed initial fetch from here as it's now in the first useEffect)
  useEffect(() => {
    // Only fetch products if the currency changes AFTER the initial load.
    // The initial fetch is now handled in the first useEffect.
    // This hook will handle changes triggered by handleCurrencyChange.
    if (selectedCurrency !== 'USD') {
      // The product fetch logic is also in handleCurrencyChange for immediate switching.
      // Keeping this here as a fallback/standard React way, but it will be redundant
      // with the immediate fetch in handleCurrencyChange. It's safe to keep.
      fetchProducts(selectedCurrency);
    }
  }, [selectedCurrency]);

  const fetchCurrencies = async () => {
    try {
      const response = await fetch('https://backend.testshop.pp.slavy.space/api/currencies');
      const data = await response.json();
      setCurrencies(data.currencies);
      console.log('Currencies loaded:', Object.keys(data.currencies).length);
    } catch (err) {
      console.error('Failed to fetch currencies:', err);
    }
  };

  const fetchProducts = async (currency) => {
    console.log('Fetching products for currency:', currency);
    try {
      const response = await fetch(`https://backend.testshop.pp.slavy.space/api/products?currency=${currency}`);
      const data = await response.json();
      console.log('Products received:', data.products);
      setProducts(data.products);
    } catch (err) {
      console.error('Failed to fetch products:', err);
      setError('Failed to load products');
    }
  };

  // LINE ~45-48: Save to localStorage but fetch products immediately
  const handleCurrencyChange = (currency) => {
    console.log('Currency changing to:', currency);
    setSelectedCurrency(currency);
    localStorage.setItem('testshop_currency', currency);
    setCurrencyMenuOpen(false);
    // Force immediate product fetch
    fetchProducts(currency);
  };
  
  const handlePaymentClick = (product) => {
    setSelectedProduct(product);
    setShowNetworkModal(true);
  };

  const handleNetworkSelect = async (network) => {
    console.log('=== PAYMENT DEBUG ===');
    console.log('Product:', selectedProduct.name);
    console.log('Price:', selectedProduct.price, selectedCurrency);
    console.log('Network:', network);
    
    setLoading(true);
    setError('');
    setShowNetworkModal(false);

    try {
      const requestBody = {
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        price: selectedProduct.price,
        currency: selectedCurrency,
        network: network
      };
      
      console.log('Sending to backend:', JSON.stringify(requestBody, null, 2));

      const response = await fetch('https://backend.testshop.pp.slavy.space/api/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Backend error:', errorText);
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();
      console.log('Payment created:', data);
      console.log('Network in response:', data.network);

      window.location.href = data.paymentUrl;

    } catch (err) {
      console.error('Payment error:', err);
      setError(`Failed: ${err.message}`);
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    const currencyInfo = currencies[selectedCurrency];
    if (!currencyInfo) return `${price}`;

    if (selectedCurrency === 'JPY' || selectedCurrency === 'KRW') {
      return `${currencyInfo.symbol}${Math.round(price).toLocaleString()}`;
    }
    return `${currencyInfo.symbol}${price.toFixed(2)}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
      {/* Header */}
      <header className="bg-gray-800 bg-opacity-50 backdrop-blur-sm border-b border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">BRSCPP Test Shop</h1>
            <p className="text-gray-300 text-sm">Multi-currency • Multi-chain</p>
          </div>

          <div className="flex gap-3">
            {/* Currency Selector */}
            <div className="relative z-50">
              <button
                onClick={() => setCurrencyMenuOpen(!currencyMenuOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors border border-gray-600"
              >
                <span className="text-xl">{currencies[selectedCurrency]?.flag || '🌍'}</span>
                <span className="text-white font-semibold">{selectedCurrency}</span>
                <svg className={`w-4 h-4 text-gray-300 transition-transform ${currencyMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {currencyMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setCurrencyMenuOpen(false)} />
                  <div className="absolute right-0 mt-2 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
                    <div className="p-2 border-b border-gray-700">
                      <p className="text-gray-400 text-xs font-semibold">SELECT CURRENCY</p>
                    </div>
                    {Object.entries(currencies).map(([code, info]) => (
                      <button
                        key={code}
                        onClick={() => handleCurrencyChange(code)}
                        className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-700 transition-colors ${
                          selectedCurrency === code ? 'bg-blue-600 bg-opacity-20' : ''
                        }`}
                      >
                        <span className="text-xl">{info.flag}</span>
                        <div className="flex-1 text-left">
                          <p className="text-white font-semibold">{code}</p>
                          <p className="text-gray-400 text-xs">{info.name}</p>
                        </div>
                        {selectedCurrency === code && (
                          <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Error */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 mt-4">
          <div className="bg-red-500 bg-opacity-20 border border-red-500 rounded-lg p-4">
            <p className="text-red-200 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Products */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {products.map((product) => (
            <div key={product.id} className="bg-gray-800 bg-opacity-50 rounded-xl border border-gray-700 hover:border-blue-500 transition-all overflow-hidden">
              <div className="h-48 bg-gray-700 flex items-center justify-center overflow-hidden">
                <img 
                  src={product.image} 
                  alt={product.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.innerHTML = '<div class="text-6xl">📦</div>';
                  }}
                />
              </div>
              
              <div className="p-6">
                <h2 className="text-xl font-semibold text-white mb-2">{product.name}</h2>
                <p className="text-gray-400 text-sm mb-4">{product.description}</p>
                
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-3xl font-bold text-blue-400">{formatPrice(product.price)}</span>
                  <span className="text-gray-500 text-sm">{selectedCurrency}</span>
                </div>

                <button
                  onClick={() => handlePaymentClick(product)}
                  disabled={loading}
                  className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-colors"
                >
                  {loading ? 'Processing...' : 'Pay with Crypto'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Network Selection Modal */}
      {showNetworkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-75">
          <div className="bg-gray-800 rounded-xl border border-gray-700 max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Select Network</h2>
            <p className="text-gray-400 text-sm mb-6">Choose blockchain network for payment</p>
            
            <div className="space-y-3">
              {Object.entries(NETWORKS).map(([key, network]) => (
                <button
                  key={key}
                  onClick={() => handleNetworkSelect(key)}
                  className="w-full px-6 py-4 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-left border border-gray-600 hover:border-blue-500"
                >
                  <div className="text-white font-semibold text-lg">{network.name}</div>
                  <div className="text-gray-400 text-sm">{network.chain}</div>
                </button>
              ))}
            </div>
            
            <button
              onClick={() => setShowNetworkModal(false)}
              className="w-full mt-4 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-gray-800 bg-opacity-50 border-t border-gray-700 mt-12 py-6">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-gray-400 text-sm">
            Powered by <a href="https://pp.slavy.space" className="text-blue-400 hover:underline">BRSCPP</a>
          </p>
          <p className="text-gray-500 text-xs mt-2">Multi-currency • Multi-chain crypto payments</p>
        </div>
      </footer>
    </div>
  );
}

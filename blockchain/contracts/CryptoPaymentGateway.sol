// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

/**
 * @title CryptoPaymentGateway
 * @notice Decentralized payment processor with hybrid multi-oracle price validation
 * @dev Supports ETH and whitelisted ERC20 tokens with Chainlink + secondary oracle
 * @author BRSCPP Team
 */
contract CryptoPaymentGateway is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // ============ State Variables ============

    /// @notice Fee percentage in basis points (e.g., 50 = 0.5%)
    uint256 public feePercentage;
    
    /// @notice Address that receives collected fees
    address public feeCollector;
    
    /// @notice Primary price feed (Chainlink)
    mapping(address => AggregatorV3Interface) public priceFeeds;
    
    /// @notice Secondary price feed (backup oracle - API3, Pyth, etc)
    mapping(address => AggregatorV3Interface) public secondaryPriceFeeds;
    
    /// @notice Mapping of whitelisted tokens (address(0) = ETH)
    mapping(address => bool) public supportedTokens;
    
    /// @notice Enable/disable secondary oracle validation per token
    mapping(address => bool) public useSecondaryOracle;
    
    /// @notice Counter for payment IDs
    uint256 private paymentCounter;
    
    /// @notice Counter for quote IDs
    uint256 private quoteCounter;
    
    /// @notice Quote validity duration (default 60 seconds)
    uint256 public quoteValidityDuration;
    
    /// @notice Maximum acceptable price deviation between oracles (basis points)
    uint256 public maxPriceDeviation;
    
    /// @notice Maximum allowed price staleness per token (in seconds)
    mapping(address => uint256) public maxPriceStaleness;
    
    /// @notice Mapping of quoteId to PriceQuote struct
    mapping(bytes32 => PriceQuote) public priceQuotes;

    // ============ Structs ============

    /**
     * @notice Price quote structure for locked prices
     * @param token Token address (address(0) for ETH)
     * @param usdAmount USD amount in cents
     * @param tokenAmount Required token amount with decimals
     * @param tokenPriceUSD Token price in USD (8 decimals from oracle)
     * @param validUntil Timestamp until which quote is valid
     * @param isUsed Whether quote has been used for payment
     * @param createdAt Timestamp when quote was created
     */
    struct PriceQuote {
        address token;
        uint256 usdAmount;
        uint256 tokenAmount;
        uint256 tokenPriceUSD;
        uint256 validUntil;
        bool isUsed;
        uint256 createdAt;
        address creator;
    }

    // ============ Constants ============

    uint256 private constant BASIS_POINTS = 10000; // 100% = 10000 basis points
    uint256 private constant PRICE_FEED_DECIMALS = 8; // Chainlink uses 8 decimals
    address private constant ETH_ADDRESS = address(0); // ETH representation
    uint256 private constant DEFAULT_QUOTE_VALIDITY = 60; // 60 seconds
    uint256 private constant DEFAULT_MAX_DEVIATION = 500; // 5%
    uint256 private constant DEFAULT_MAX_STALENESS = 1 hours; // 1 hour default

    // ============ Events ============

    /**
     * @notice Emitted when a price quote is generated
     */
    event PriceQuoteGenerated(
        bytes32 indexed quoteId,
        address indexed token,
        uint256 usdAmount,
        uint256 tokenAmount,
        uint256 tokenPriceUSD,
        uint256 validUntil
    );

    /**
     * @notice Emitted when a payment is processed using a quote
     */
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
        uint256 timestamp
    );

    /**
     * @notice Emitted when price deviation is detected between oracles
     */
    event PriceDeviationDetected(
        address indexed token,
        uint256 primaryPrice,
        uint256 secondaryPrice,
        uint256 deviation
    );

    /**
     * @notice Emitted when oracle fallback is used
     */
    event OracleFallbackUsed(
        address indexed token,
        bool primaryFailed,
        uint256 priceUsed
    );

    /**
     * @notice Emitted when direct ETH transfer attempt is rejected
     */
    event DirectETHRejected(address indexed sender, uint256 amount);

    event FeeUpdated(uint256 oldFee, uint256 newFee);
    event FeeCollectorUpdated(address oldCollector, address newCollector);
    event TokenAdded(address indexed token, address priceFeed);
    event TokenRemoved(address indexed token);
    event SecondaryOracleAdded(address indexed token, address priceFeed);
    event SecondaryOracleRemoved(address indexed token);
    event QuoteValidityUpdated(uint256 oldDuration, uint256 newDuration);
    event MaxPriceDeviationUpdated(uint256 oldDeviation, uint256 newDeviation);
    event MaxPriceStalenessUpdated(address indexed token, uint256 maxStaleness);
    event EmergencyWithdraw(address indexed token, uint256 amount, address indexed to);

    // ============ Errors ============

    error InvalidAmount();
    error InvalidAddress();
    error InvalidFeePercentage();
    error TokenNotSupported();
    error InsufficientBalance();
    error TransferFailed();
    error PriceFeedError();
    error InvalidPriceFeed();
    error QuoteExpired();
    error QuoteAlreadyUsed();
    error QuoteNotFound();
    error InvalidQuote();
    error AmountMismatch();
    error PriceDeviationTooHigh();
    error BothOraclesFailed();
    error UnauthorizedQuoteUse();

    // ============ Constructor ============

    /**
     * @notice Initialize the payment gateway
     * @param initialOwner Address that will own the contract
     * @param _feeCollector Initial fee collector address
     * @param _initialFeePercentage Initial fee in basis points (50 = 0.5%)
     */
    constructor(
        address initialOwner,
        address _feeCollector,
        uint256 _initialFeePercentage
    ) Ownable(initialOwner) {
        if (_feeCollector == address(0)) revert InvalidAddress();
        if (_initialFeePercentage > BASIS_POINTS) revert InvalidFeePercentage();
        
        feeCollector = _feeCollector;
        feePercentage = _initialFeePercentage;
        quoteValidityDuration = DEFAULT_QUOTE_VALIDITY;
        maxPriceDeviation = DEFAULT_MAX_DEVIATION;
        
        emit FeeCollectorUpdated(address(0), _feeCollector);
        emit FeeUpdated(0, _initialFeePercentage);
    }

    // ============ Quote Generation Functions ============

    /**
     * @notice Generate a price quote for a payment (PUBLIC VIEW - called by frontend)
     * @param token Token address (address(0) for ETH)
     * @param usdAmount USD amount in cents (e.g., 10000 = $100.00)
     * @return quoteId Unique identifier for this quote
     * @return tokenAmount Required token amount
     * @return tokenPriceUSD Current price from oracle(s)
     * @return validUntil Timestamp until quote is valid
     * @dev This is a VIEW function - frontend calls it every 10-15 seconds to refresh price
     * @dev Does NOT store onchain - used only for display
     */
    function getPriceQuote(
        address token,
        uint256 usdAmount
    ) external view returns (
        bytes32 quoteId,
        uint256 tokenAmount,
        uint256 tokenPriceUSD,
        uint256 validUntil
    ) {
        if (!supportedTokens[token]) revert TokenNotSupported();
        if (usdAmount == 0) revert InvalidAmount();

        // Get current price from oracle(s) using hybrid strategy
        tokenPriceUSD = _getTokenPriceUSDView(token);
        
        // Calculate required token amount
        tokenAmount = _calculateTokenAmount(token, usdAmount, tokenPriceUSD);
        
        // Generate deterministic quote ID (for caching purposes)
        quoteId = keccak256(abi.encodePacked(
            token,
            usdAmount,
            tokenPriceUSD,
            block.timestamp / quoteValidityDuration // Rounds to validity window
        ));
        
        validUntil = block.timestamp + quoteValidityDuration;
        
        return (quoteId, tokenAmount, tokenPriceUSD, validUntil);
    }

    /**
     * @notice Lock a price quote onchain (called when user clicks "Pay Now")
     * @param token Token address
     * @param usdAmount USD amount in cents
     * @return quoteId Locked quote identifier
     * @return tokenAmount Required token amount
     * @return validUntil Expiry timestamp
     * @dev This creates an onchain record of the quote that can be used for payment
     * @dev Enhanced with block.number and gasleft() for maximum uniqueness
     */
    function lockPriceQuote(
        address token,
        uint256 usdAmount
    ) external returns (
        bytes32 quoteId,
        uint256 tokenAmount,
        uint256 validUntil
    ) {
        if (!supportedTokens[token]) revert TokenNotSupported();
        if (usdAmount == 0) revert InvalidAmount();

        // Get fresh price from oracle(s)
        uint256 tokenPriceUSD = getTokenPriceUSD(token);
        
        // Calculate required token amount
        tokenAmount = _calculateTokenAmount(token, usdAmount, tokenPriceUSD);
        
        validUntil = block.timestamp + quoteValidityDuration;
        
        // Generate unique quote ID with enhanced anti-collision
        quoteId = keccak256(abi.encodePacked(
            token,
            usdAmount,
            tokenPriceUSD,
            msg.sender,
            block.timestamp,
            block.number,        // Block number for uniqueness
            gasleft(),          // Remaining gas (quasi-random)
            quoteCounter++      // Increment counter
        ));
        
        // Store quote onchain
        priceQuotes[quoteId] = PriceQuote({
            token: token,
            usdAmount: usdAmount,
            tokenAmount: tokenAmount,
            tokenPriceUSD: tokenPriceUSD,
            validUntil: validUntil,
            isUsed: false,
            createdAt: block.timestamp,
            creator: msg.sender
        });
        
        emit PriceQuoteGenerated(
            quoteId,
            token,
            usdAmount,
            tokenAmount,
            tokenPriceUSD,
            validUntil
        );
        
        return (quoteId, tokenAmount, validUntil);
    }

    // ============ Payment Functions with Quote ============

    /**
     * @notice Process ETH payment using a locked quote
     * @param quoteId Locked quote identifier
     * @param merchant Merchant address receiving payment
     * @param orderId External order reference ID
     * @dev User must send exact ETH amount from the quote
     */
    function processETHPaymentWithQuote(
        bytes32 quoteId,
        address merchant,
        string calldata orderId
    ) external payable nonReentrant whenNotPaused {
        if (merchant == address(0)) revert InvalidAddress();
        if (msg.value == 0) revert InvalidAmount();

        // Validate and consume quote
        PriceQuote storage quote = _validateAndConsumeQuote(quoteId, ETH_ADDRESS);
        
        // Verify sent amount matches quote exactly
        if (msg.value != quote.tokenAmount) revert AmountMismatch();

        // Calculate fee and merchant amount
        uint256 feeAmount = (msg.value * feePercentage) / BASIS_POINTS;
        uint256 merchantAmount = msg.value - feeAmount;

        // Increment payment counter
        uint256 paymentId = ++paymentCounter;

        // Transfer funds (Checks-Effects-Interactions pattern)
        _transferETH(merchant, merchantAmount);
        if (feeAmount > 0) {
            _transferETH(feeCollector, feeAmount);
        }

        // Emit event for backend tracking
        emit PaymentProcessed(
            paymentId,
            quoteId,
            merchant,
            msg.sender,
            ETH_ADDRESS,
            msg.value,
            merchantAmount,
            feeAmount,
            quote.usdAmount,
            orderId,
            block.timestamp
        );
    }

    /**
     * @notice Process ERC20 token payment using a locked quote
     * @param quoteId Locked quote identifier
     * @param merchant Merchant address receiving payment
     * @param orderId External order reference ID
     * @dev User must approve exact token amount before calling
     */
    function processTokenPaymentWithQuote(
        bytes32 quoteId,
        address merchant,
        string calldata orderId
    ) external nonReentrant whenNotPaused {
        if (merchant == address(0)) revert InvalidAddress();

        // Validate and consume quote (will validate token from quote)
        PriceQuote storage quote = _validateAndConsumeQuote(quoteId, address(0));
        
        address token = quote.token;
        uint256 amount = quote.tokenAmount;

        // Verify token is not ETH
        if (token == ETH_ADDRESS) revert InvalidQuote();

        // Check customer has sufficient balance
        IERC20 tokenContract = IERC20(token);
        if (tokenContract.balanceOf(msg.sender) < amount) revert InsufficientBalance();

        // Calculate fee and merchant amount
        uint256 feeAmount = (amount * feePercentage) / BASIS_POINTS;
        uint256 merchantAmount = amount - feeAmount;

        // Increment payment counter
        uint256 paymentId = ++paymentCounter;

        // Transfer tokens from customer (Checks-Effects-Interactions pattern)
        tokenContract.safeTransferFrom(msg.sender, merchant, merchantAmount);
        if (feeAmount > 0) {
            tokenContract.safeTransferFrom(msg.sender, feeCollector, feeAmount);
        }

        // Emit event for backend tracking
        emit PaymentProcessed(
            paymentId,
            quoteId,
            merchant,
            msg.sender,
            token,
            amount,
            merchantAmount,
            feeAmount,
            quote.usdAmount,
            orderId,
            block.timestamp
        );
    }

    // ============ Hybrid Multi-Oracle System ============

    /**
     * @notice Get token price with hybrid multi-oracle validation (NON-VIEW version for state changes)
     * @param token Token address
     * @return price Final validated price in USD (8 decimals)
     * @dev This version can emit events (used in lockPriceQuote and payments)
     */
    function getTokenPriceUSD(address token) public returns (uint256 price) {
        if (!supportedTokens[token]) revert TokenNotSupported();
        
        AggregatorV3Interface primaryFeed = priceFeeds[token];
        AggregatorV3Interface secondaryFeed = secondaryPriceFeeds[token];
        
        if (address(primaryFeed) == address(0)) revert InvalidPriceFeed();
        
        // Try to get primary price (Chainlink)
        (bool primarySuccess, uint256 primaryPrice) = _tryGetPrice(primaryFeed, token);
        
        // If no secondary oracle configured or disabled, use primary only
        if (address(secondaryFeed) == address(0) || !useSecondaryOracle[token]) {
            if (!primarySuccess) revert PriceFeedError();
            return primaryPrice;
        }
        
        // Try to get secondary price
        (bool secondarySuccess, uint256 secondaryPrice) = _tryGetPrice(secondaryFeed, token);
        
        // CASE 1: Both oracles working → Validate deviation
        if (primarySuccess && secondarySuccess) {
            uint256 deviation = _calculateDeviation(primaryPrice, secondaryPrice);
            
            if (deviation > maxPriceDeviation) {
                // Prices differ too much - possible manipulation!
                emit PriceDeviationDetected(token, primaryPrice, secondaryPrice, deviation);
                revert PriceDeviationTooHigh();
            }
            
            // Both prices are close - return average for safety
            return (primaryPrice + secondaryPrice) / 2;
        }
        
        // CASE 2: Only primary working → Use primary
        if (primarySuccess && !secondarySuccess) {
            emit OracleFallbackUsed(token, false, primaryPrice);
            return primaryPrice;
        }
        
        // CASE 3: Only secondary working → Use secondary (fallback)
        if (!primarySuccess && secondarySuccess) {
            emit OracleFallbackUsed(token, true, secondaryPrice);
            return secondaryPrice;
        }
        
        // CASE 4: Both failed → Revert
        revert BothOraclesFailed();
    }

    /**
     * @notice Get token price (VIEW version for frontend queries - no events)
     * @param token Token address
     * @return price Final validated price in USD (8 decimals)
     * @dev This is a pure view function that doesn't emit events
     */
    function _getTokenPriceUSDView(address token) internal view returns (uint256 price) {
        if (!supportedTokens[token]) revert TokenNotSupported();
        
        AggregatorV3Interface primaryFeed = priceFeeds[token];
        AggregatorV3Interface secondaryFeed = secondaryPriceFeeds[token];
        
        if (address(primaryFeed) == address(0)) revert InvalidPriceFeed();
        
        // Try to get primary price (Chainlink)
        (bool primarySuccess, uint256 primaryPrice) = _tryGetPrice(primaryFeed, token);
        
        // If no secondary oracle configured or disabled, use primary only
        if (address(secondaryFeed) == address(0) || !useSecondaryOracle[token]) {
            if (!primarySuccess) revert PriceFeedError();
            return primaryPrice;
        }
        
        // Try to get secondary price
        (bool secondarySuccess, uint256 secondaryPrice) = _tryGetPrice(secondaryFeed, token);
        
        // CASE 1: Both oracles working → Validate deviation
        if (primarySuccess && secondarySuccess) {
            uint256 deviation = _calculateDeviation(primaryPrice, secondaryPrice);
            
            if (deviation > maxPriceDeviation) {
                // Prices differ too much - revert without event
                revert PriceDeviationTooHigh();
            }
            
            // Both prices are close - return average for safety
            return (primaryPrice + secondaryPrice) / 2;
        }
        
        // CASE 2: Only primary working → Use primary
        if (primarySuccess && !secondarySuccess) {
            return primaryPrice;
        }
        
        // CASE 3: Only secondary working → Use secondary (fallback)
        if (!primarySuccess && secondarySuccess) {
            return secondaryPrice;
        }
        
        // CASE 4: Both failed → Revert
        revert BothOraclesFailed();
    }

    /**
     * @notice Try to get price from an oracle without reverting
     * @param priceFeed Oracle aggregator interface
     * @param token Token address (for staleness check)
     * @return success Whether price fetch was successful
     * @return price The price (0 if failed)
     * @dev Internal helper that returns (false, 0) on failure instead of reverting
     */
    function _tryGetPrice(
    AggregatorV3Interface priceFeed,
    address token
) internal view returns (bool success, uint256 price) {
    try priceFeed.latestRoundData() returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,    // ← Explicitly name it
        uint256 updatedAt,
        uint80 answeredInRound
    ) {
        // Enhanced validation checks
        if (answer <= 0) return (false, 0);
        if (updatedAt == 0) return (false, 0);
        if (answeredInRound < roundId) return (false, 0);
        
        // Optional: Validate startedAt exists (even though we don't use it)
        if (startedAt == 0) return (false, 0);
        
        // Use token-specific staleness or default
        uint256 maxStaleness = maxPriceStaleness[token];
        if (maxStaleness == 0) {
            maxStaleness = DEFAULT_MAX_STALENESS;
        }
        
        if (block.timestamp - updatedAt > maxStaleness) return (false, 0);
        
        return (true, uint256(answer));
    } catch {
        return (false, 0);
    }
}

    /**
     * @notice Calculate percentage deviation between two prices
     * @param price1 First price
     * @param price2 Second price
     * @return deviation Deviation in basis points
     */
    function _calculateDeviation(
        uint256 price1,
        uint256 price2
    ) internal pure returns (uint256 deviation) {
        if (price1 > price2) {
            deviation = ((price1 - price2) * BASIS_POINTS) / price2;
        } else {
            deviation = ((price2 - price1) * BASIS_POINTS) / price1;
        }
        return deviation;
    }

    // ============ Internal Helper Functions ============

    /**
     * @notice Validate quote and mark as used
     * @param quoteId Quote identifier
     * @param expectedToken Expected token address (address(0) to skip check)
     * @return quote The validated quote storage reference
     */
    function _validateAndConsumeQuote(
    bytes32 quoteId,
    address expectedToken
) internal returns (PriceQuote storage quote) {
    quote = priceQuotes[quoteId];
    
    if (quote.createdAt == 0) revert QuoteNotFound();
    
    // NEW CHECK
    if (quote.creator != msg.sender) revert UnauthorizedQuoteUse();
    
    if (quote.isUsed) revert QuoteAlreadyUsed();
    
    if (block.timestamp > quote.validUntil) revert QuoteExpired();
    
    if (expectedToken != address(0) && quote.token != expectedToken) {
        revert InvalidQuote();
    }
    
    quote.isUsed = true;
    
    return quote;
}

    /**
     * @notice Calculate token amount from USD amount and price
     * @param token Token address
     * @param usdAmount USD amount in cents
     * @param tokenPriceUSD Token price from oracle (8 decimals)
     * @return tokenAmount Required token amount with proper decimals
     */
    function _calculateTokenAmount(
        address token,
        uint256 usdAmount,
        uint256 tokenPriceUSD
    ) internal view returns (uint256) {
        uint8 decimals;
        if (token == ETH_ADDRESS) {
            decimals = 18;
        } else {
            decimals = IERC20Metadata(token).decimals();
        }
        
        // Formula: tokenAmount = (usdAmount * 10^decimals * 10^8) / (tokenPriceUSD * 100)
        // usdAmount is in cents, so divide by 100 to get dollars
        // tokenPriceUSD has 8 decimals from Chainlink
        return (usdAmount * 10**decimals * 10**PRICE_FEED_DECIMALS) / (tokenPriceUSD * 100);
    }

    /**
     * @notice Internal function to safely transfer ETH
     * @param to Recipient address
     * @param amount Amount to transfer
     */
    function _transferETH(address to, uint256 amount) internal {
        (bool success, ) = to.call{value: amount}("");
        if (!success) revert TransferFailed();
    }

    // ============ Admin Functions - Token Management ============

    /**
     * @notice Add or update a supported token with primary price feed
     * @param token Token address (address(0) for ETH)
     * @param priceFeed Chainlink price feed address
     * @dev Only owner can call this function
     */
    function addSupportedToken(address token, address priceFeed) external onlyOwner {
        if (priceFeed == address(0)) revert InvalidAddress();
        
        supportedTokens[token] = true;
        priceFeeds[token] = AggregatorV3Interface(priceFeed);
        
        emit TokenAdded(token, priceFeed);
    }

    /**
     * @notice Remove a token from supported list
     * @param token Token address to remove
     * @dev Only owner can call this function
     */
    function removeSupportedToken(address token) external onlyOwner {
        supportedTokens[token] = false;
        delete priceFeeds[token];
        delete secondaryPriceFeeds[token];
        delete useSecondaryOracle[token];
        delete maxPriceStaleness[token];
        
        emit TokenRemoved(token);
    }

    /**
     * @notice Add secondary oracle for a token
     * @param token Token address
     * @param secondaryFeed Secondary oracle address (API3, Pyth, etc)
     * @dev Only owner can call this function
     */
    function addSecondaryOracle(
        address token,
        address secondaryFeed
    ) external onlyOwner {
        if (secondaryFeed == address(0)) revert InvalidAddress();
        if (!supportedTokens[token]) revert TokenNotSupported();
        
        secondaryPriceFeeds[token] = AggregatorV3Interface(secondaryFeed);
        useSecondaryOracle[token] = true;
        
        emit SecondaryOracleAdded(token, secondaryFeed);
    }

    /**
     * @notice Remove secondary oracle for a token
     * @param token Token address
     * @dev Only owner can call this function
     */
    function removeSecondaryOracle(address token) external onlyOwner {
        delete secondaryPriceFeeds[token];
        useSecondaryOracle[token] = false;
        
        emit SecondaryOracleRemoved(token);
    }

    /**
     * @notice Enable/disable secondary oracle validation for a token
     * @param token Token address
     * @param enabled True to enable, false to disable
     * @dev Only owner can call this function
     */
    function setUseSecondaryOracle(
        address token,
        bool enabled
    ) external onlyOwner {
        useSecondaryOracle[token] = enabled;
    }

    /**
     * @notice Set maximum price staleness for a specific token
     * @param token Token address
     * @param maxStaleness Maximum staleness in seconds (0 = use default 1 hour)
     * @dev Only owner can call this function
     */
    function setMaxPriceStaleness(
        address token,
        uint256 maxStaleness
    ) external onlyOwner {
        if (!supportedTokens[token]) revert TokenNotSupported();
        if (maxStaleness > 24 hours) revert InvalidAmount(); // Max 24 hours
        
        maxPriceStaleness[token] = maxStaleness;
        emit MaxPriceStalenessUpdated(token, maxStaleness);
    }

    // ============ Admin Functions - Fee Management ============

    /**
     * @notice Update fee percentage
     * @param newFeePercentage New fee in basis points (max 10000 = 100%)
     * @dev Only owner can call this function
     */
    function updateFeePercentage(uint256 newFeePercentage) external onlyOwner {
        if (newFeePercentage > BASIS_POINTS) revert InvalidFeePercentage();
        
        uint256 oldFee = feePercentage;
        feePercentage = newFeePercentage;
        
        emit FeeUpdated(oldFee, newFeePercentage);
    }

    /**
     * @notice Update fee collector address
     * @param newFeeCollector New fee collector address
     * @dev Only owner can call this function
     */
    function updateFeeCollector(address newFeeCollector) external onlyOwner {
        if (newFeeCollector == address(0)) revert InvalidAddress();
        
        address oldCollector = feeCollector;
        feeCollector = newFeeCollector;
        
        emit FeeCollectorUpdated(oldCollector, newFeeCollector);
    }

    // ============ Admin Functions - Oracle Configuration ============

    /**
     * @notice Update quote validity duration
     * @param newDuration New duration in seconds (30-300 range)
     * @dev Only owner can call this function
     */
    function updateQuoteValidity(uint256 newDuration) external onlyOwner {
        if (newDuration < 30 || newDuration > 300) revert InvalidAmount();
        
        uint256 oldDuration = quoteValidityDuration;
        quoteValidityDuration = newDuration;
        
        emit QuoteValidityUpdated(oldDuration, newDuration);
    }

    /**
     * @notice Update maximum acceptable price deviation between oracles
     * @param newDeviation New deviation in basis points (e.g., 500 = 5%)
     * @dev Only owner can call this function. Max 20% deviation allowed
     */
    function updateMaxPriceDeviation(uint256 newDeviation) external onlyOwner {
        if (newDeviation > 2000) revert InvalidAmount(); // Max 20%
        
        uint256 oldDeviation = maxPriceDeviation;
        maxPriceDeviation = newDeviation;
        
        emit MaxPriceDeviationUpdated(oldDeviation, newDeviation);
    }

    // ============ Admin Functions - Emergency ============

    /**
     * @notice Pause the contract (stops all payments)
     * @dev Only owner can call this function
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause the contract (resumes payments)
     * @dev Only owner can call this function
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Emergency withdraw stuck tokens or ETH (only when paused)
     * @param token Token address (address(0) for ETH)
     * @param amount Amount to withdraw
     * @param to Recipient address
     * @dev Only owner can call this function and only when contract is paused
     * @dev Used to recover accidentally sent tokens or in emergency situations
     */
    // contracts/CryptoPaymentGateway.sol: ~833
    function emergencyWithdraw(
    address token,
    uint256 amount,
    address to
    ) external onlyOwner whenPaused {
    if (to == address(0)) revert InvalidAddress();
    if (amount == 0) revert InvalidAmount();

    if (token == ETH_ADDRESS) {
        if (address(this).balance < amount) revert InsufficientBalance();

        emit EmergencyWithdraw(token, amount, to); 

        _transferETH(to, amount);
    } else {
        IERC20 tokenContract = IERC20(token);
        if (tokenContract.balanceOf(address(this)) < amount) revert InsufficientBalance();

        tokenContract.safeTransfer(to, amount); // ➡️ INTERACTION
    }

    // Премахнете старото emit EmergencyWithdraw(token, amount, to); от края
    }

    // ============ Receive Function ============

    /**
     * @notice Reject direct ETH transfers with event logging
     * @dev All ETH payments must go through processETHPaymentWithQuote
     * @dev This prevents accidental ETH loss but logs attempts for monitoring
     */
    receive() external payable {
        emit DirectETHRejected(msg.sender, msg.value);
        revert("Use processETHPaymentWithQuote function");
    }
}

/**
 * @notice Interface for ERC20 tokens with decimals function
 */
interface IERC20Metadata is IERC20 {
    function decimals() external view returns (uint8);
}

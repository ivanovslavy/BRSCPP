// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/utils/Address.sol";

/*
 * @title CryptoPaymentGateway v2 (Hybrid Block/Timestamp Logic - CORRECTED)
 * @notice Decentralized payment processor with hybrid multi-oracle price validation
 * @dev Supports ETH and whitelisted ERC20 tokens with Chainlink + secondary oracle
 * @dev Whitelist fee discounts and direct 1:1 stablecoin payments
 * @dev HYBRID LOGIC: Quote validity uses block.number, Oracle staleness uses timestamp
 * @author Slavcho Ivanov https://me.slavy.space
 * @github https://github.com/ivanovslavy/brscpp
 * @brscpp infrastructure: https://pp.slavy.space
 */
contract CryptoPaymentGateway is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;
    using Address for address;
    
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
    /// @notice Quote validity duration in blocks (default 5 blocks, ~60 seconds)
    uint256 public quoteValidityDurationBlocks;
    /// @notice Maximum acceptable price deviation between oracles (basis points)
    uint256 public maxPriceDeviation;
    /// @notice Maximum allowed price staleness per token in SECONDS (for Chainlink timestamps)
    mapping(address => uint256) public maxPriceStalenessSeconds;
    /// @notice Mapping of quoteId to PriceQuote struct
    mapping(bytes32 => PriceQuote) public priceQuotes;
    /// @notice Whitelist for fee discounts (basis points)
    mapping(address => uint256) public whitelistDiscount;
    /// @notice Tokens that bypass quote system (1:1 USD pegged stablecoins)
    mapping(address => bool) public directPaymentTokens;

// ============ Structs ============

    /**
     * @notice Price quote structure for locked prices
     * @param token Token address (address(0) for ETH)
     * @param usdAmount USD amount in cents
     * @param tokenAmount Required token amount with decimals
     * @param tokenPriceUSD Token price in USD (8 decimals from oracle)
     * @param validUntilBlock Block number until which quote is valid
     * @param isUsed Whether quote has been used for payment
     * @param createdAtBlock Block number when quote was created
     * @param creator Address who locked the quote (for validation)
     */
    struct PriceQuote {
        address token;
        uint256 usdAmount;
        uint256 tokenAmount;
        uint256 tokenPriceUSD;
        uint256 validUntilBlock;
        bool isUsed;
        uint256 createdAtBlock;
        address creator;
    }

// ============ Constants ============

    uint256 constant BASIS_POINTS = 10000;
    address constant ETH_ADDRESS = address(0);
    uint256 constant DEFAULT_QUOTE_VALIDITY_BLOCKS = 5; // ~60 seconds on Ethereum
    uint256 constant DEFAULT_MAX_DEVIATION = 500; // 5%
    uint256 constant DEFAULT_MAX_STALENESS_SECONDS = 3600; // 1 hour for Chainlink
    uint256 constant BLOCK_NUMBER_TOLERANCE = 5; // ~60 seconds on Ethereum

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
        uint256 validUntilBlock
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
        uint256 blockNumber
    );
    /**
     * @notice Emitted when a direct 1:1 payment is processed (no quote)
     */
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
    event QuoteValidityUpdated(uint256 oldDurationBlocks, uint256 newDurationBlocks);
    event MaxPriceDeviationUpdated(uint256 oldDeviation, uint256 newDeviation);
    event MaxPriceStalenessUpdatedSeconds(address indexed token, uint256 maxStalenessSeconds);
    event EmergencyWithdraw(address indexed token, uint256 amount, address indexed to);
    event WhitelistUpdated(address indexed user, uint256 discountBps);
    event WhitelistRemoved(address indexed user);
    event DirectPaymentTokenAdded(address indexed token);
    event DirectPaymentTokenRemoved(address indexed token);
    /**
     * @notice Emitted when price data is fetched from an oracle (for debugging/logging)
     */
    event OraclePriceFetched(
        address indexed token,
        bool isPrimary,
        uint80 roundId,
        int256 price,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    );

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
    error PriceStale();

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
    ) Ownable(initialOwner) 
    {
        if (_feeCollector == address(0)) revert InvalidAddress();
        if (_initialFeePercentage > BASIS_POINTS) revert InvalidFeePercentage();
        feeCollector = _feeCollector;
        feePercentage = _initialFeePercentage;
        quoteValidityDurationBlocks = DEFAULT_QUOTE_VALIDITY_BLOCKS;
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
     * @return validUntilBlock Block number until quote is valid
     * @dev This is a VIEW function - frontend calls it every ~60 seconds (or 5 blocks) to refresh price
     * @dev Does NOT store onchain - used only for display
     */
    function getPriceQuote(
        address token,
        uint256 usdAmount
    ) external view returns (
        bytes32 quoteId,
        uint256 tokenAmount,
        uint256 tokenPriceUSD,
        uint256 validUntilBlock
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
            block.number / BLOCK_NUMBER_TOLERANCE
        ));
        validUntilBlock = block.number + quoteValidityDurationBlocks;
        
        return (quoteId, tokenAmount, tokenPriceUSD, validUntilBlock);
    }

    /**
     * @notice Lock a price quote on-chain (customer commits to price)
     * @param token Token address (address(0) for ETH)
     * @param usdAmount USD amount in cents
     * @return quoteId Unique identifier for locked quote
     * @return tokenAmount Required token amount at locked price
     * @return validUntilBlock Expiration block number
     * @dev Customer calls this when ready to pay at displayed price
     * @dev Creates on-chain record to prevent price manipulation
     */
    function lockPriceQuote(
        address token,
        uint256 usdAmount
    ) external nonReentrant whenNotPaused returns (
        bytes32 quoteId,
        uint256 tokenAmount,
        uint256 validUntilBlock
    ) {
        if (!supportedTokens[token]) revert TokenNotSupported();
        if (usdAmount == 0) revert InvalidAmount();

        // Get current price from oracle(s)
        uint256 tokenPriceUSD = _getTokenPriceUSD(token);
        // Calculate required token amount
        tokenAmount = _calculateTokenAmount(token, usdAmount, tokenPriceUSD);
        // Generate unique quote ID
        quoteId = keccak256(abi.encodePacked(
            ++quoteCounter,
            msg.sender,
            token,
            usdAmount,
            tokenPriceUSD,
            block.number
        ));
        validUntilBlock = block.number + quoteValidityDurationBlocks;
        
        // Store quote on-chain
        priceQuotes[quoteId] = PriceQuote({
            token: token,
            usdAmount: usdAmount,
            tokenAmount: tokenAmount,
            tokenPriceUSD: tokenPriceUSD,
            validUntilBlock: validUntilBlock,
            isUsed: false,
            createdAtBlock: block.number,
            creator: msg.sender
        });

        emit PriceQuoteGenerated(
            quoteId,
            token,
            usdAmount,
            tokenAmount,
            tokenPriceUSD,
            validUntilBlock
        );

        return (quoteId, tokenAmount, validUntilBlock);
    }

// ============ Payment Processing Functions ============

    /**
     * @notice Process ETH payment using a locked quote
     * @param quoteId Quote identifier from lockPriceQuote
     * @param merchant Merchant receiving payment
     * @param orderId Unique order identifier from merchant
     * @return paymentId Unique payment identifier
     * @dev Customer sends exact ETH amount specified in quote
     * @dev Quote must be valid and not expired
     */
    function processETHPaymentWithQuote(
        bytes32 quoteId,
        address merchant,
        string calldata orderId
    ) external payable nonReentrant whenNotPaused returns (uint256 paymentId) {
        PriceQuote storage quote = priceQuotes[quoteId];

        // ============ CHECKS ============
        if (quote.createdAtBlock == 0) revert QuoteNotFound();
        if (quote.isUsed) revert QuoteAlreadyUsed();
        if (block.number > quote.validUntilBlock) revert QuoteExpired();
        if (quote.token != ETH_ADDRESS) revert InvalidQuote();
        if (quote.creator != msg.sender) revert UnauthorizedQuoteUse();
        if (merchant == address(0)) revert InvalidAddress();

        uint256 tokenAmount = quote.tokenAmount;
        if (msg.value != tokenAmount) revert AmountMismatch();
        
        uint256 feeAmount = _calculateFee(tokenAmount, merchant);
        uint256 merchantAmount = tokenAmount - feeAmount;

        // ============ EFFECTS (State Changes) - CEI Pattern ============
        quote.isUsed = true;
        paymentId = ++paymentCounter;
        
        // Emit event BEFORE external calls
        emit PaymentProcessed(
            paymentId,
            quoteId,
            merchant,
            msg.sender,
            ETH_ADDRESS,
            tokenAmount,
            merchantAmount,
            feeAmount,
            quote.usdAmount,
            orderId,
            block.number
        );

        // ============ INTERACTIONS (External Calls) ============
        // Transfer ETH to merchant
        _transferETH(merchant, merchantAmount);
        // Transfer fee to collector
        if (feeAmount > 0) {
            _transferETH(feeCollector, feeAmount);
        }
        
        return paymentId;
    }

    /**
     * @notice Process ERC20 token payment using a locked quote
     * @param quoteId Quote identifier from lockPriceQuote
     * @param merchant Merchant receiving payment
     * @param orderId Unique order identifier from merchant
     * @return paymentId Unique payment identifier
     * @dev Customer must approve contract for token amount before calling
     * @dev Transfers tokens from customer to merchant (minus fee)
     */
    function processTokenPaymentWithQuote(
        bytes32 quoteId,
        address merchant,
        string calldata orderId
    ) external nonReentrant whenNotPaused returns (uint256 paymentId) {
        PriceQuote storage quote = priceQuotes[quoteId];

        // ============ CHECKS ============
        if (quote.createdAtBlock == 0) revert QuoteNotFound();
        if (quote.isUsed) revert QuoteAlreadyUsed();
        if (block.number > quote.validUntilBlock) revert QuoteExpired();
        if (quote.token == ETH_ADDRESS) revert InvalidQuote();
        if (quote.creator != msg.sender) revert UnauthorizedQuoteUse();
        if (merchant == address(0)) revert InvalidAddress();

        address token = quote.token;
        uint256 tokenAmount = quote.tokenAmount;
        IERC20 tokenContract = IERC20(token);
        
        uint256 feeAmount = _calculateFee(tokenAmount, merchant);
        uint256 merchantAmount = tokenAmount - feeAmount;

        // ============ EFFECTS (State Changes) - CEI Pattern ============
        quote.isUsed = true;
        paymentId = ++paymentCounter;

        // Emit event BEFORE external calls
        emit PaymentProcessed(
            paymentId,
            quoteId,
            merchant,
            msg.sender,
            token,
            tokenAmount,
            merchantAmount,
            feeAmount,
            quote.usdAmount,
            orderId,
            block.number
        );

        // ============ INTERACTIONS (External Calls) ============
        // Transfer tokens from customer to merchant
        tokenContract.safeTransferFrom(msg.sender, merchant, merchantAmount);
        // Transfer fee to collector
        if (feeAmount > 0) {
            tokenContract.safeTransferFrom(msg.sender, feeCollector, feeAmount);
        }
        
        return paymentId;
    }

    /**
     * @notice Process direct 1:1 stablecoin payment without quote
     * @param token Token address (must be in directPaymentTokens)
     * @param amount Token amount (e.g., 100e6 USDC = $100.00)
     * @param merchant Merchant receiving payment
     * @param orderId Unique order identifier
     * @return paymentId Unique payment identifier
     * @dev Used for USDC/USDT where 1 token = $1 exactly
     * @dev No price oracle needed, respects whitelist fee discounts
     */
    function processDirectPayment(
        address token,
        uint256 amount,
        address merchant,
        string calldata orderId
    ) external nonReentrant whenNotPaused returns (uint256 paymentId) {

        // ============ CHECKS ============
        if (!directPaymentTokens[token]) revert TokenNotSupported();
        if (amount == 0) revert InvalidAmount();
        if (merchant == address(0)) revert InvalidAddress();

        IERC20 tokenContract = IERC20(token);
        // Check allowance
        if (tokenContract.allowance(msg.sender, address(this)) < amount) {
            revert InsufficientBalance();
        }
        
        uint256 feeAmount = _calculateFee(amount, merchant);
        uint256 merchantAmount = amount - feeAmount;

        // ============ EFFECTS (State Changes) - CEI Pattern ============
        paymentId = ++paymentCounter;

        // Emit event BEFORE external calls
        emit DirectPaymentProcessed(
            paymentId,
            merchant,
            msg.sender,
            token,
            amount,
            merchantAmount,
            feeAmount,
            orderId,
            block.number
        );

        // ============ INTERACTIONS (External Calls) ============
        // Transfer from customer to merchant
        tokenContract.safeTransferFrom(msg.sender, merchant, merchantAmount);
        // Transfer fee to collector
        if (feeAmount > 0) {
            tokenContract.safeTransferFrom(msg.sender, feeCollector, feeAmount);
        }
        
        return paymentId;
    }

// ============ Internal Helper Functions ============

    /**
     * @notice Calculate required token amount for USD value
     * @param token Token address
     * @param usdAmount USD amount in cents
     * @param tokenPriceUSD Token price from oracle (8 decimals)
     * @return Token amount with proper decimals
     */
    function _calculateTokenAmount(
        address token,
        uint256 usdAmount,
        uint256 tokenPriceUSD
    ) internal view returns (uint256) {
        uint8 decimals = token == ETH_ADDRESS ? 18 : IERC20Metadata(token).decimals();
        uint256 CONSTANT_8 = 100_000_000; 
        return (usdAmount * (10 ** decimals) * CONSTANT_8) / (tokenPriceUSD * 100);
    }
    
    /**
     * @notice Calculate fee amount for a payment (respects whitelist)
     * @param amount Total payment amount
     * @param payer Address of the payer
     * @return Fee amount to deduct
     */
    function _calculateFee(uint256 amount, address payer) internal view returns (uint256) {
        uint256 effectiveFee = getEffectiveFee(payer);
        return (amount * effectiveFee) / BASIS_POINTS;
    }

// ============ Oracle Price Helper Functions ============

    /**
     * @notice Try to get price from primary oracle (Chainlink)
     * @param token Token address
     * @return failed True if primary check failed
     * @return price Token price in USD (8 decimals)
     * @dev Uses TIMESTAMP-based staleness check (not block.number)
     */
    function _tryGetPrimaryPrice(address token)
        internal
        returns (bool failed, uint256 price)
    {
        AggregatorV3Interface priceFeed = priceFeeds[token];
        if (address(priceFeed) == address(0)) return (true, 0);
        
        try priceFeed.latestRoundData() returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        ) {
            // CHECK #1: Chainlink best practice - ensure data is from current round
            if (answeredInRound < roundId) {
                emit OraclePriceFetched(token, true, roundId, answer, startedAt, updatedAt, answeredInRound);
                return (true, 0); 
            }
            
            // CHECK #2: Validate answer is positive
            if (answer <= 0) {
                emit OraclePriceFetched(token, true, roundId, answer, startedAt, updatedAt, answeredInRound);
                return (true, 0);
            }
            
            // CHECK #3: TIMESTAMP-based staleness (Chainlink returns timestamps, not block numbers)
            uint256 maxStalenessSeconds = maxPriceStalenessSeconds[token];
            if (maxStalenessSeconds == 0) maxStalenessSeconds = DEFAULT_MAX_STALENESS_SECONDS;
            

            // Safe: Chainlink updatedAt is timestamp, comparing with reasonable staleness threshold
            if (block.timestamp > updatedAt + maxStalenessSeconds) {
                emit OraclePriceFetched(token, true, roundId, answer, startedAt, updatedAt, answeredInRound);
                revert PriceStale();
            }

            // Success
            emit OraclePriceFetched(token, true, roundId, answer, startedAt, updatedAt, answeredInRound);
            return (false, uint256(answer));
        } catch {
            return (true, 0);
        }
    }

    /**
     * @notice Try to get price from secondary oracle
     * @param token Token address
     * @return failed True if secondary check failed or not enabled
     * @return price Token price in USD (8 decimals)
     * @dev Uses TIMESTAMP-based staleness check (not block.number)
     */
    function _tryGetSecondaryPrice(address token)
        internal
        returns (bool failed, uint256 price)
    {
        if (!useSecondaryOracle[token]) return (true, 0);
        
        AggregatorV3Interface secondaryFeed = secondaryPriceFeeds[token];
        if (address(secondaryFeed) == address(0)) return (true, 0);
        
        try secondaryFeed.latestRoundData() returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        ) {
            // CHECK #1: Chainlink best practice
            if (answeredInRound < roundId) {
                emit OraclePriceFetched(token, false, roundId, answer, startedAt, updatedAt, answeredInRound);
                return (true, 0); 
            }

            // CHECK #2: Validate answer
            if (answer <= 0) {
                emit OraclePriceFetched(token, false, roundId, answer, startedAt, updatedAt, answeredInRound);
                return (true, 0);
            }
            
            // CHECK #3: TIMESTAMP-based staleness
            uint256 maxStalenessSeconds = maxPriceStalenessSeconds[token];
            if (maxStalenessSeconds == 0) maxStalenessSeconds = DEFAULT_MAX_STALENESS_SECONDS;
            

            // Safe: Chainlink updatedAt is timestamp, comparing with reasonable staleness threshold
            if (block.timestamp > updatedAt + maxStalenessSeconds) {
                emit OraclePriceFetched(token, false, roundId, answer, startedAt, updatedAt, answeredInRound);
                revert PriceStale();
            }

            // Success
            emit OraclePriceFetched(token, false, roundId, answer, startedAt, updatedAt, answeredInRound);
            return (false, uint256(answer));
        } catch {
            return (true, 0);
        }
    }

    /**
     * @notice Selects the best price based on primary/secondary results
     * @dev Emits events for failures and deviations
     */
    function _selectBestPrice(
        address token,
        bool primaryFailed,
        uint256 primaryPrice,
        bool secondaryFailed,
        uint256 secondaryPrice
    ) internal returns (uint256) {
        
        if (!primaryFailed && secondaryFailed) {
            // Primary only
            return primaryPrice;
        } 
        
        if (primaryFailed && !secondaryFailed) {
            // Fallback to secondary
            emit OracleFallbackUsed(token, true, secondaryPrice);
            return secondaryPrice;
        } 
        
        if (!primaryFailed && !secondaryFailed) {
            // Both available - validate deviation
            uint256 deviation = _calculateDeviation(primaryPrice, secondaryPrice);
            if (deviation > maxPriceDeviation) {
                emit PriceDeviationDetected(token, primaryPrice, secondaryPrice, deviation);
                revert PriceDeviationTooHigh();
            }
            return primaryPrice;
        }
        
        // Both failed
        revert BothOraclesFailed();
    } 

    /**
     * @notice Get token price from oracle(s) - state-changing version
     * @param token Token address
     * @return price Token price in USD (8 decimals)
     * @dev Emits events for failures and deviations
     */
    function _getTokenPriceUSD(address token) internal returns (uint256 price) {
        (bool primaryFailed, uint256 primaryPrice) = _tryGetPrimaryPrice(token);
        (bool secondaryFailed, uint256 secondaryPrice) = _tryGetSecondaryPrice(token);
        return _selectBestPrice(token, primaryFailed, primaryPrice, secondaryFailed, secondaryPrice);
    }

    /**
     * @notice Checks secondary oracle price and validates deviation (view function)
     * @param token Token address
     * @param primaryPrice Price from primary oracle
     * @dev Helper function for _getTokenPriceUSDView to reduce cyclomatic complexity
     */
    function _validateSecondaryOracleView(address token, uint256 primaryPrice) internal view {
        if (!useSecondaryOracle[token]) return;
        AggregatorV3Interface secondaryFeed = secondaryPriceFeeds[token];
        if (address(secondaryFeed) == address(0)) return; 
        
        try secondaryFeed.latestRoundData() returns (
            uint80 roundId2, 
            int256 secondaryPrice,
            uint256 startedAt2,
            uint256 updatedAt2,
            uint80 answeredInRound2
        ) {

            if (startedAt2 == 0 || updatedAt2 == 0) {} // Acknowledge variables
            
            // Check best practices
            if (answeredInRound2 < roundId2) return;
            if (secondaryPrice <= 0) return;
            
            // If secondary price is valid, check deviation
            uint256 deviation = _calculateDeviation(primaryPrice, uint256(secondaryPrice));
            if (deviation > maxPriceDeviation) revert PriceDeviationTooHigh();
            
        } catch {
            // Secondary oracle failed, silent fail in view function
        }
    }

    /**
     * @notice Get token price from oracle(s) - view function
     * @param token Token address
     * @return price Token price in USD (8 decimals)
     * @dev View version for getPriceQuote (no state changes, no events)
     */
    function _getTokenPriceUSDView(address token) internal view returns (uint256 price) {
        AggregatorV3Interface priceFeed = priceFeeds[token];
        if (address(priceFeed) == address(0)) revert InvalidPriceFeed();
        
        uint256 primaryPrice = 0;
        
        // Try Primary Oracle
        try priceFeed.latestRoundData() returns (
            uint80 roundId, 
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        ) {

            if (startedAt == 0 || updatedAt == 0) {} // Acknowledge variables
            
            // Check best practices
            if (answeredInRound < roundId) revert PriceFeedError();
            if (answer <= 0) revert PriceFeedError();

            primaryPrice = uint256(answer);

        } catch {
            revert PriceFeedError();
        }

        price = primaryPrice;
        
        // Validate against secondary oracle if enabled
        _validateSecondaryOracleView(token, primaryPrice);
        
        return price;
    }

    /**
     * @notice Calculate percentage deviation between two prices
     * @param price1 First price
     * @param price2 Second price
     * @return Deviation in basis points
     */
    function _calculateDeviation(
        uint256 price1,
        uint256 price2
    ) internal pure returns (uint256) {
        uint256 diff = price1 > price2 ? price1 - price2 : price2 - price1;
        uint256 avg = (price1 + price2) / 2;
        return (diff * BASIS_POINTS) / avg;
    }

    /**
     * @notice Internal function to safely transfer ETH
     * @param to Recipient address
     * @param amount Amount to transfer
     */
    function _transferETH(address to, uint256 amount) internal {
        Address.sendValue(payable(to), amount);
    }

// ============ Admin Functions - Whitelist Management ============

    /**
     * @notice Add user to whitelist with custom fee discount
     * @param user User address to whitelist
     * @param discountBps Discount in basis points (10000 = 100% discount = no fee)
     * @dev Only owner can call. Examples: 5000 = 50% off, 10000 = free
     */
    function setWhitelistDiscount(address user, uint256 discountBps) external onlyOwner {
        if (user == address(0)) revert InvalidAddress();
        if (discountBps > BASIS_POINTS) revert InvalidFeePercentage();
        
        whitelistDiscount[user] = discountBps;
        emit WhitelistUpdated(user, discountBps);
    }

    /**
     * @notice Remove user from whitelist
     * @param user User address to remove
     */
    function removeFromWhitelist(address user) external onlyOwner {
        delete whitelistDiscount[user];
        emit WhitelistRemoved(user);
    }

    /**
     * @notice Calculate effective fee for a user (considers whitelist)
     * @param user User address
     * @return effectiveFee Fee in basis points after discount
     */
    function getEffectiveFee(address user) public view returns (uint256) {
        uint256 discount = whitelistDiscount[user];
        if (discount == 0) return feePercentage;
        if (discount >= BASIS_POINTS) return 0;
        
        return (feePercentage * (BASIS_POINTS - discount)) / BASIS_POINTS;
    }

// ============ Admin Functions - Direct Payment Management ============

    /**
     * @notice Enable 1:1 direct payments for a stablecoin
     * @param token Token address (must be already supported)
     * @dev Use for USDC, USDT, DAI where 1 token = $1.00 exactly
     */
    function enableDirectPayment(address token) external onlyOwner {
        if (!supportedTokens[token]) revert TokenNotSupported();
        if (token == ETH_ADDRESS) revert InvalidAddress();
        
        directPaymentTokens[token] = true;
        emit DirectPaymentTokenAdded(token);
    }

    /**
     * @notice Disable direct payments for a token
     * @param token Token address
     */
    function disableDirectPayment(address token) external onlyOwner {
        directPaymentTokens[token] = false;
        emit DirectPaymentTokenRemoved(token);
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
        delete maxPriceStalenessSeconds[token];
        delete directPaymentTokens[token];
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
     * @notice Set maximum price staleness for a specific token (in SECONDS)
     * @param token Token address
     * @param maxStalenessSeconds Maximum staleness in seconds (0 = use default 3600s)
     * @dev Only owner can call this function
     * @dev Uses timestamp-based staleness for Chainlink oracles
     */
    function setMaxPriceStalenessSeconds(
        address token,
        uint256 maxStalenessSeconds
    ) external onlyOwner {
        if (!supportedTokens[token]) revert TokenNotSupported();
        if (maxStalenessSeconds > 86400) revert InvalidAmount(); // Max 24 hours
        
        maxPriceStalenessSeconds[token] = maxStalenessSeconds;
        emit MaxPriceStalenessUpdatedSeconds(token, maxStalenessSeconds);
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
     * @notice Update quote validity duration in BLOCKS
     * @param newDurationBlocks New duration in blocks (e.g., 5-30 range)
     * @dev Only owner can call this function
     */
    function updateQuoteValidity(uint256 newDurationBlocks) external onlyOwner {
        if (newDurationBlocks < 2 || newDurationBlocks > 500) revert InvalidAmount();
        uint256 oldDuration = quoteValidityDurationBlocks;
        quoteValidityDurationBlocks = newDurationBlocks;
        
        emit QuoteValidityUpdated(oldDuration, newDurationBlocks);
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
            emit EmergencyWithdraw(token, amount, to);
            tokenContract.safeTransfer(to, amount); 
        }
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

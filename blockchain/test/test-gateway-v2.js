const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CryptoPaymentGateway v2 - Complete Test Suite", function () {
    let gateway;
    let usdc, usdt;
    let nativeFeed, stableFeed;
    let owner, feeCollector, merchant, customer, unauthorized;

    // Константи
    const ETH_ADDRESS = "0x0000000000000000000000000000000000000000";
    const INITIAL_FEE = 100; // 1%
    const USDC_DECIMALS = 6;
    const USDT_DECIMALS = 6;

    // Price feeds
    const ETH_PRICE = ethers.parseUnits("2500", 8); // $2500
    const STABLE_PRICE = ethers.parseUnits("1", 8);  // $1.00

    before(async function () {
        [owner, feeCollector, merchant, customer, unauthorized] = await ethers.getSigners();

        console.log("\n=== SETUP ===");
        console.log("Owner:", owner.address);
        console.log("Fee Collector:", feeCollector.address);
        console.log("Merchant:", merchant.address);
        console.log("Customer:", customer.address);

        // Deploy mock tokens
        console.log("\nDeploying Mock Tokens...");
        const MockToken = await ethers.getContractFactory("MockERC20");

        usdc = await MockToken.deploy("USD Coin", "USDC", USDC_DECIMALS);
        await usdc.waitForDeployment();
        console.log("USDC:", usdc.target);

        usdt = await MockToken.deploy("Tether USD", "USDT", USDT_DECIMALS);
        await usdt.waitForDeployment();
        console.log("USDT:", usdt.target);

        // Deploy mock price feeds
        console.log("\nDeploying Mock Price Feeds...");
        const MockFeed = await ethers.getContractFactory("MockV3Aggregator");

        nativeFeed = await MockFeed.deploy(8, ETH_PRICE);
        await nativeFeed.waitForDeployment();
        console.log("ETH/USD Feed:", nativeFeed.target);

        stableFeed = await MockFeed.deploy(8, STABLE_PRICE);
        await stableFeed.waitForDeployment();
        console.log("USD/USD Feed:", stableFeed.target);

        // Deploy gateway
        console.log("\nDeploying Gateway...");
        const Gateway = await ethers.getContractFactory("CryptoPaymentGateway");
        gateway = await Gateway.deploy(owner.address, feeCollector.address, INITIAL_FEE);
        await gateway.waitForDeployment();
        console.log("Gateway:", gateway.target);

        // Configure gateway
        console.log("\nConfiguring Gateway...");
        await gateway.addSupportedToken(ETH_ADDRESS, nativeFeed.target);
        console.log("Added ETH");

        await gateway.addSupportedToken(usdc.target, stableFeed.target);
        console.log("Added USDC");

        await gateway.addSupportedToken(usdt.target, stableFeed.target);
        console.log("Added USDT");

        // Enable direct payments for stablecoins
        await gateway.enableDirectPayment(usdc.target);
        console.log("Enabled USDC direct payment");

        await gateway.enableDirectPayment(usdt.target);
        console.log("Enabled USDT direct payment");

        // Mint tokens to customer
        console.log("\nMinting Tokens to Customer...");
        await usdc.mint(customer.address, ethers.parseUnits("10000", USDC_DECIMALS));
        await usdt.mint(customer.address, ethers.parseUnits("10000", USDT_DECIMALS));
        console.log("Customer USDC:", ethers.formatUnits(await usdc.balanceOf(customer.address), USDC_DECIMALS));
        console.log("Customer USDT:", ethers.formatUnits(await usdt.balanceOf(customer.address), USDT_DECIMALS));

        console.log("\n=== SETUP COMPLETE ===\n");
    });

    describe("1. ADMIN FUNCTIONS", function () {

        it("Should update fee percentage", async function () {
            console.log("\nTEST: Update Fee Percentage");

            const newFee = 50; // 0.5%
            await gateway.updateFeePercentage(newFee);

            expect(await gateway.feePercentage()).to.equal(newFee);
            console.log("SUCCESS: Fee updated to", newFee, "basis points");
        });

        it("Should reject invalid fee percentage", async function () {
            console.log("\nTEST: Reject Invalid Fee (>100%)");

            await expect(
                gateway.updateFeePercentage(10001)
            ).to.be.reverted;

            console.log("SUCCESS: Rejected fee > 100%");
        });

        it("Should update fee collector", async function () {
            console.log("\nTEST: Update Fee Collector");

            const newCollector = unauthorized.address;
            await gateway.updateFeeCollector(newCollector);

            expect(await gateway.feeCollector()).to.equal(newCollector);
            console.log("SUCCESS: Fee collector updated");

            // Reset
            await gateway.updateFeeCollector(feeCollector.address);
        });

        it("Should reject unauthorized admin calls", async function () {
            console.log("\nTEST: Reject Unauthorized Admin");

            await expect(
                gateway.connect(unauthorized).updateFeePercentage(100)
            ).to.be.revertedWithCustomError(gateway, "OwnableUnauthorizedAccount");

            console.log("SUCCESS: Unauthorized call rejected");
        });
    });

    describe("2. WHITELIST SYSTEM", function () {

        it("Should add user to whitelist with 50% discount", async function () {
            console.log("\nTEST: Add to Whitelist (50% discount)");

            const discount = 5000; // 50%
            await gateway.setWhitelistDiscount(customer.address, discount);

            const effectiveFee = await gateway.getEffectiveFee(customer.address);
            const baseFee = await gateway.feePercentage();
            const expectedFee = (baseFee * 5000n) / 10000n; // 50% of base fee

            expect(effectiveFee).to.equal(expectedFee);
            console.log("Base Fee:", baseFee.toString(), "bps");
            console.log("Effective Fee:", effectiveFee.toString(), "bps");
            console.log("SUCCESS: 50% discount applied");
        });

        it("Should add user with 100% discount (free)", async function () {
            console.log("\nTEST: Add to Whitelist (100% discount - free)");

            await gateway.setWhitelistDiscount(merchant.address, 10000);

            const effectiveFee = await gateway.getEffectiveFee(merchant.address);
            expect(effectiveFee).to.equal(0);

            console.log("SUCCESS: 100% discount = 0 fee");
        });

        it("Should remove user from whitelist", async function () {
            console.log("\nTEST: Remove from Whitelist");

            await gateway.removeFromWhitelist(customer.address);

            const effectiveFee = await gateway.getEffectiveFee(customer.address);
            const baseFee = await gateway.feePercentage();

            expect(effectiveFee).to.equal(baseFee);
            console.log("SUCCESS: User removed, back to base fee");
        });

        it("Should reject invalid discount percentage", async function () {
            console.log("\nTEST: Reject Invalid Discount");

            await expect(
                gateway.setWhitelistDiscount(customer.address, 10001)
            ).to.be.revertedWithCustomError(gateway, "InvalidFeePercentage");

            console.log("SUCCESS: Invalid discount rejected");
        });
    });

    describe("3. NATIVE TOKEN PAYMENT (ETH with Quote)", function () {
        let quoteId, tokenAmount;
        const usdAmount = 1000; // $10.00

        it("Should lock price quote for ETH payment", async function () {
            console.log("\nTEST: Lock ETH Price Quote");
            console.log("USD Amount:", usdAmount / 100, "USD");

            const tx = await gateway.connect(customer).lockPriceQuote(ETH_ADDRESS, usdAmount);
            const receipt = await tx.wait();

            const event = receipt.logs.find(log => {
                try {
                    return gateway.interface.parseLog(log).name === "PriceQuoteGenerated";
                } catch {
                    return false;
                }
            });

            const parsed = gateway.interface.parseLog(event);
            quoteId = parsed.args.quoteId;
            tokenAmount = parsed.args.tokenAmount;

            console.log("Quote ID:", quoteId);
            console.log("Token Amount:", ethers.formatEther(tokenAmount), "ETH");
            console.log("SUCCESS: Quote locked");
        });

        it("Should process ETH payment with quote", async function () {
            console.log("\nTEST: Process ETH Payment");

            const merchantBalanceBefore = await ethers.provider.getBalance(merchant.address);
            const feeCollectorBalanceBefore = await ethers.provider.getBalance(feeCollector.address);

            const tx = await gateway.connect(customer).processETHPaymentWithQuote(
                quoteId,
                merchant.address,
                "ORDER-ETH-001",
                { value: tokenAmount }
            );

            await tx.wait();

            const merchantBalanceAfter = await ethers.provider.getBalance(merchant.address);
            const feeCollectorBalanceAfter = await ethers.provider.getBalance(feeCollector.address);

            const merchantReceived = merchantBalanceAfter - merchantBalanceBefore;
            const feeReceived = feeCollectorBalanceAfter - feeCollectorBalanceBefore;

            console.log("Merchant Received:", ethers.formatEther(merchantReceived), "ETH");
            console.log("Fee Collected:", ethers.formatEther(feeReceived), "ETH");
            console.log("SUCCESS: ETH payment processed");

            expect(merchantReceived + feeReceived).to.equal(tokenAmount);
        });

        it("Should reject expired quote", async function () {
            console.log("\nTEST: Reject Expired Quote");

            // Create new quote
            const tx = await gateway.connect(customer).lockPriceQuote(ETH_ADDRESS, usdAmount);
            const receipt = await tx.wait();
            const event = receipt.logs.find(log => {
                try {
                    return gateway.interface.parseLog(log).name === "PriceQuoteGenerated";
                } catch {
                    return false;
                }
            });
            const parsed = gateway.interface.parseLog(event);
            const newQuoteId = parsed.args.quoteId;
            const newTokenAmount = parsed.args.tokenAmount;

            // Wait for quote to expire
            await ethers.provider.send("evm_increaseTime", [120]); // 2 minutes
            await ethers.provider.send("evm_mine");

            await expect(
                gateway.connect(customer).processETHPaymentWithQuote(
                    newQuoteId,
                    merchant.address,
                    "ORDER-EXPIRED",
                    { value: newTokenAmount }
                )
            ).to.be.revertedWithCustomError(gateway, "QuoteExpired");

            console.log("SUCCESS: Expired quote rejected");
        });

        it("Should reject reused quote", async function () {
            console.log("\nTEST: Reject Reused Quote");

            await expect(
                gateway.connect(customer).processETHPaymentWithQuote(
                    quoteId,
                    merchant.address,
                    "ORDER-REUSE",
                    { value: tokenAmount }
                )
            ).to.be.revertedWithCustomError(gateway, "QuoteAlreadyUsed");

            console.log("SUCCESS: Reused quote rejected");
        });
    });

    describe("4. ERC20 PAYMENT WITH QUOTE (USDC) - Allowance Check Logic", function () {
        let quoteId, tokenAmount;
        const usdAmount = 5000; // $50.00 (5000 стотинки)

        it("Should lock price quote for USDC payment", async function () {
            console.log("\nTEST: Lock USDC Price Quote");
            console.log("USD Amount:", usdAmount / 100, "USD");

            const tx = await gateway.connect(customer).lockPriceQuote(usdc.target, usdAmount);
            const receipt = await tx.wait();

            const event = receipt.logs.find(log => {
                try {
                    return gateway.interface.parseLog(log).name === "PriceQuoteGenerated";
                } catch {
                    return false;
                }
            });

            const parsed = gateway.interface.parseLog(event);
            quoteId = parsed.args.quoteId;
            tokenAmount = parsed.args.tokenAmount;

            console.log("Quote ID:", quoteId);
            console.log("Token Amount:", ethers.formatUnits(tokenAmount, USDC_DECIMALS), "USDC");
            console.log("SUCCESS: Quote locked");
        });

        it("Should process USDC payment by checking allowance (scenario 1: approve needed)", async function () {
            console.log("\nTEST: Process USDC (Approve Needed)");

            const requiredAmount = tokenAmount;

            // *** ЛОГИКА ЗА ПРОВЕРКА НА ALLOWANCE ***
            const currentAllowance = await usdc.allowance(customer.address, gateway.target);
            console.log(`Current Allowance: ${ethers.formatUnits(currentAllowance, USDC_DECIMALS)} USDC`);

            if (currentAllowance < requiredAmount) {
                console.log("Approval needed. Approving required amount...");
                await usdc.connect(customer).approve(gateway.target, requiredAmount);
                console.log("New Approval granted.");
            } else {
                console.log("Current allowance is sufficient. Skipping approval.");
            }
            // *** КРАЙ НА ЛОГИКАТА ЗА ПРОВЕРКА НА ALLOWANCE ***

            const merchantBalanceBefore = await usdc.balanceOf(merchant.address);
            const feeCollectorBalanceBefore = await usdc.balanceOf(feeCollector.address);

            const tx = await gateway.connect(customer).processTokenPaymentWithQuote(
                quoteId,
                merchant.address,
                "ORDER-USDC-QUOTE-001"
            );

            await tx.wait();

            const merchantBalanceAfter = await usdc.balanceOf(merchant.address);
            const feeCollectorBalanceAfter = await usdc.balanceOf(feeCollector.address);

            const merchantReceived = merchantBalanceAfter - merchantBalanceBefore;
            const feeReceived = feeCollectorBalanceAfter - feeCollectorBalanceBefore;

            console.log("Merchant Received:", ethers.formatUnits(merchantReceived, USDC_DECIMALS), "USDC");
            console.log("Fee Collected:", ethers.formatUnits(feeReceived, USDC_DECIMALS), "USDC");
            console.log("SUCCESS: USDC payment with quote processed");

            expect(merchantReceived + feeReceived).to.equal(tokenAmount);
        });

        // Допълнителен тест за демонстриране на "пропускане на approve"
        it("Should process USDC payment without re-approving (scenario 2: skip approve)", async function () {
            console.log("\nTEST: Process USDC (Skip Approve)");

            const smallUsdAmount = 1000; // $10.00 (малка сума)

            // Генериране на нова котировка за по-малка сума
            const tx = await gateway.connect(customer).lockPriceQuote(usdc.target, smallUsdAmount);
            const receipt = await tx.wait();
            const event = receipt.logs.find(log => {
                try {
                    return gateway.interface.parseLog(log).name === "PriceQuoteGenerated";
                } catch {
                    return false;
                }
            });
            const parsed = gateway.interface.parseLog(event);
            const smallQuoteId = parsed.args.quoteId;
            const smallTokenAmount = parsed.args.tokenAmount;

            const requiredAmount = smallTokenAmount;
            const currentAllowance = await usdc.allowance(customer.address, gateway.target);

            console.log(`Current Allowance: ${ethers.formatUnits(currentAllowance, USDC_DECIMALS)} USDC`);
            console.log(`Required Amount: ${ethers.formatUnits(requiredAmount, USDC_DECIMALS)} USDC`);

            if (currentAllowance < requiredAmount) {
                // Този блок трябва да бъде пропуснат, защото Approval от горния тест е по-голям
                console.log("Approval needed. Approving...");
                await usdc.connect(customer).approve(gateway.target, requiredAmount);
            } else {
                console.log("Current allowance is sufficient. Skipping approval (EXPECTED).");
            }

            // Транзакцията трябва да мине без ново approve
            await expect(
                gateway.connect(customer).processTokenPaymentWithQuote(
                    smallQuoteId,
                    merchant.address,
                    "ORDER-USDC-QUOTE-002"
                )
            ).to.not.be.reverted;

            console.log("SUCCESS: Payment processed without re-approving");
        });
    });

    describe("5. DIRECT 1:1 STABLECOIN PAYMENT (No Quote)", function () {

        it("Should process direct USDC payment (1:1)", async function () {
            console.log("\nTEST: Direct USDC Payment (1:1)");

            const amount = ethers.parseUnits("100", USDC_DECIMALS); // $100
            console.log("Payment Amount:", ethers.formatUnits(amount, USDC_DECIMALS), "USDC");

            // *** ЛОГИКА ЗА ПРОВЕРКА НА ALLOWANCE ***
            const currentAllowance = await usdc.allowance(customer.address, gateway.target);
            if (currentAllowance < amount) {
                await usdc.connect(customer).approve(gateway.target, amount);
                console.log("Approval needed and granted.");
            } else {
                console.log("Approval sufficient. Skipping.");
            }
            // *** КРАЙ НА ЛОГИКАТА ЗА ПРОВЕРКА НА ALLOWANCE ***

            const merchantBalanceBefore = await usdc.balanceOf(merchant.address);
            const feeCollectorBalanceBefore = await usdc.balanceOf(feeCollector.address);

            const tx = await gateway.connect(customer).processDirectPayment(
                usdc.target,
                amount,
                merchant.address,
                "ORDER-DIRECT-USDC-001"
            );

            await tx.wait();
            // ... (останалата част от проверката)
            const merchantBalanceAfter = await usdc.balanceOf(merchant.address);
            const feeCollectorBalanceAfter = await usdc.balanceOf(feeCollector.address);

            const merchantReceived = merchantBalanceAfter - merchantBalanceBefore;
            const feeReceived = feeCollectorBalanceAfter - feeCollectorBalanceBefore;

            console.log("Merchant Received:", ethers.formatUnits(merchantReceived, USDC_DECIMALS), "USDC");
            console.log("Fee Collected:", ethers.formatUnits(feeReceived, USDC_DECIMALS), "USDC");
            console.log("SUCCESS: Direct payment processed (no quote needed)");

            expect(merchantReceived + feeReceived).to.equal(amount);
        });

        it("Should process direct USDT payment (1:1)", async function () {
            console.log("\nTEST: Direct USDT Payment (1:1)");

            const amount = ethers.parseUnits("200", USDT_DECIMALS); // $200
            console.log("Payment Amount:", ethers.formatUnits(amount, USDT_DECIMALS), "USDT");

            // *** ЛОГИКА ЗА ПРОВЕРКА НА ALLOWANCE ***
            const currentAllowance = await usdt.allowance(customer.address, gateway.target);
            if (currentAllowance < amount) {
                await usdt.connect(customer).approve(gateway.target, amount);
                console.log("Approval needed and granted.");
            } else {
                console.log("Approval sufficient. Skipping.");
            }
            // *** КРАЙ НА ЛОГИКАТА ЗА ПРОВЕРКА НА ALLOWANCE ***

            const merchantBalanceBefore = await usdt.balanceOf(merchant.address);

            const tx = await gateway.connect(customer).processDirectPayment(
                usdt.target,
                amount,
                merchant.address,
                "ORDER-DIRECT-USDT-001"
            );

            await tx.wait();

            const merchantBalanceAfter = await usdt.balanceOf(merchant.address);
            const merchantReceived = merchantBalanceAfter - merchantBalanceBefore;

            console.log("Merchant Received:", ethers.formatUnits(merchantReceived, USDT_DECIMALS), "USDT");
            console.log("SUCCESS: Direct USDT payment processed");
        });

        it("Should reject direct payment for non-enabled token", async function () {
            console.log("\nTEST: Reject Direct Payment for ETH (not enabled)");

            await expect(
                gateway.connect(customer).processDirectPayment(
                    ETH_ADDRESS,
                    ethers.parseEther("1"),
                    merchant.address,
                    "ORDER-INVALID"
                )
            ).to.be.revertedWithCustomError(gateway, "TokenNotSupported");

            console.log("SUCCESS: Direct payment rejected for non-enabled token");
        });

        it("Should apply whitelist discount to direct payment", async function () {
            console.log("\nTEST: Direct Payment with Whitelist Discount");

            // Add customer to whitelist with 100% discount
            await gateway.setWhitelistDiscount(customer.address, 10000);

            const amount = ethers.parseUnits("50", USDC_DECIMALS);

            // *** ЛОГИКА ЗА ПРОВЕРКА НА ALLOWANCE ***
            const currentAllowance = await usdc.allowance(customer.address, gateway.target);
            if (currentAllowance < amount) {
                await usdc.connect(customer).approve(gateway.target, amount);
            }
            // *** КРАЙ НА ЛОГИКАТА ЗА ПРОВЕРКА НА ALLOWANCE ***

            const merchantBalanceBefore = await usdc.balanceOf(merchant.address);
            const feeCollectorBalanceBefore = await usdc.balanceOf(feeCollector.address);

            await gateway.connect(customer).processDirectPayment(
                usdc.target,
                amount,
                merchant.address,
                "ORDER-WHITELISTED"
            );

            const merchantBalanceAfter = await usdc.balanceOf(merchant.address);
            const feeCollectorBalanceAfter = await usdc.balanceOf(feeCollector.address);

            const merchantReceived = merchantBalanceAfter - merchantBalanceBefore;
            const feeReceived = feeCollectorBalanceAfter - feeCollectorBalanceBefore;

            console.log("Merchant Received:", ethers.formatUnits(merchantReceived, USDC_DECIMALS), "USDC");
            console.log("Fee Collected:", ethers.formatUnits(feeReceived, USDC_DECIMALS), "USDC");

            expect(feeReceived).to.equal(0);
            expect(merchantReceived).to.equal(amount);
            console.log("SUCCESS: 100% discount applied, no fee charged");

            // Reset whitelist
            await gateway.removeFromWhitelist(customer.address);
        });
    });

    describe("6. REJECTION TESTS", function () {

        it("Should reject unsupported token", async function () {
            console.log("\nTEST: Reject Unsupported Token");

            const randomToken = unauthorized.address;

            await expect(
                gateway.connect(customer).lockPriceQuote(randomToken, 1000)
            ).to.be.revertedWithCustomError(gateway, "TokenNotSupported");

            console.log("SUCCESS: Unsupported token rejected");
        });

        it("Should reject direct ETH transfer to contract", async function () {
            console.log("\nTEST: Reject Direct ETH Transfer");

            await expect(
                customer.sendTransaction({
                    to: gateway.target,
                    value: ethers.parseEther("1")
                })
            ).to.be.reverted;

            console.log("SUCCESS: Direct ETH transfer rejected");
        });

        // ПРОВАЛЯЩИЯТ СЕ ТЕСТ: Променена е usdAmount на 50000 ($500.00)
        it("Should reject payment with insufficient approval (FORCED REVERT TEST)", async function () {
            console.log("\nTEST: Reject Insufficient Approval (FORCED REVERT)");

            // Използваме по-голяма сума, за да гарантираме, че tokenAmount е значимо число
            const LARGE_USD_AMOUNT = 50000; // $500.00
            console.log("Requesting quote for $500.00...");
            const tx = await gateway.connect(customer).lockPriceQuote(usdc.target, LARGE_USD_AMOUNT);
            const receipt = await tx.wait();
            const event = receipt.logs.find(log => {
                try {
                    return gateway.interface.parseLog(log).name === "PriceQuoteGenerated";
                } catch {
                    return false;
                }
            });
            const parsed = gateway.interface.parseLog(event);
            const quoteId = parsed.args.quoteId;
            const tokenAmount = parsed.args.tokenAmount;
            console.log(`Required token amount: ${ethers.formatUnits(tokenAmount, USDC_DECIMALS)} USDC`);


            // *** Стъпка 1: Нулиране, за да сме сигурни, че няма остатъчен approval ***
            await usdc.connect(customer).approve(gateway.target, 0);

            // *** Стъпка 2: Одобряване само на половината (недостатъчно) ***
            const insufficientAmount = tokenAmount / 2n;
            await usdc.connect(customer).approve(gateway.target, insufficientAmount);
            console.log(`Approved amount (insufficient): ${ethers.formatUnits(insufficientAmount, USDC_DECIMALS)} USDC`);


            // *** Стъпка 3: Очакваме ERC20 да се провали ***
            await expect(
                gateway.connect(customer).processTokenPaymentWithQuote(
                    quoteId,
                    merchant.address,
                    "ORDER-INSUFFICIENT"
                )
            ).to.be.revertedWith("ERC20: insufficient allowance");

            console.log("SUCCESS: Insufficient approval rejected");
        });

        it("Should reject quote used by different user", async function () {
            console.log("\nTEST: Reject Quote Used by Different User");

            const tx = await gateway.connect(customer).lockPriceQuote(ETH_ADDRESS, 1000);
            const receipt = await tx.wait();
            const event = receipt.logs.find(log => {
                try {
                    return gateway.interface.parseLog(log).name === "PriceQuoteGenerated";
                } catch {
                    return false;
                }
            });
            const parsed = gateway.interface.parseLog(event);
            const quoteId = parsed.args.quoteId;
            const tokenAmount = parsed.args.tokenAmount;

            await expect(
                gateway.connect(unauthorized).processETHPaymentWithQuote(
                    quoteId,
                    merchant.address,
                    "ORDER-STOLEN",
                    { value: tokenAmount }
                )
            ).to.be.revertedWithCustomError(gateway, "UnauthorizedQuoteUse");

            console.log("SUCCESS: Unauthorized quote use rejected");
        });
    });

    describe("7. PAUSE FUNCTIONALITY", function () {

        it("Should pause contract", async function () {
            console.log("\nTEST: Pause Contract");

            await gateway.pause();
            expect(await gateway.paused()).to.be.true;

            console.log("SUCCESS: Contract paused");
        });

        it("Should reject payments when paused", async function () {
            console.log("\nTEST: Reject Payments When Paused");

            await expect(
                gateway.connect(customer).lockPriceQuote(ETH_ADDRESS, 1000)
            ).to.be.revertedWithCustomError(gateway, "EnforcedPause");

            console.log("SUCCESS: Payment rejected while paused");
        });

        it("Should unpause contract", async function () {
            console.log("\nTEST: Unpause Contract");

            await gateway.unpause();
            expect(await gateway.paused()).to.be.false;

            console.log("SUCCESS: Contract unpaused");
        });
    });

    describe("8. VIEW FUNCTIONS", function () {

        it("Should get price quote view", async function () {
            console.log("\nTEST: Get Price Quote (View)");

            const usdAmount = 10000; // $100
            const result = await gateway.getPriceQuote(ETH_ADDRESS, usdAmount);

            console.log("USD Amount:", usdAmount / 100, "USD");
            console.log("Token Amount:", ethers.formatEther(result.tokenAmount), "ETH");
            console.log("Token Price:", ethers.formatUnits(result.tokenPriceUSD, 8), "USD");
            console.log("Valid Until:", new Date(Number(result.validUntil) * 1000).toISOString());
            console.log("SUCCESS: Price quote retrieved");
        });

        it("Should check effective fee for user", async function () {
            console.log("\nTEST: Check Effective Fee");

            const normalFee = await gateway.getEffectiveFee(customer.address);
            const baseFee = await gateway.feePercentage();

            console.log("Base Fee:", baseFee.toString(), "basis points");
            console.log("Customer Effective Fee:", normalFee.toString(), "basis points");

            expect(normalFee).to.equal(baseFee);
            console.log("SUCCESS: Effective fee checked");
        });

        it("Should check token support status", async function () {
            console.log("\nTEST: Check Token Support");

            const ethSupported = await gateway.supportedTokens(ETH_ADDRESS);
            const usdcSupported = await gateway.supportedTokens(usdc.target);
            const randomSupported = await gateway.supportedTokens(unauthorized.address);

            console.log("ETH Supported:", ethSupported);
            console.log("USDC Supported:", usdcSupported);
            console.log("Random Token Supported:", randomSupported);

            expect(ethSupported).to.be.true;
            expect(usdcSupported).to.be.true;
            expect(randomSupported).to.be.false;
            console.log("SUCCESS: Token support checked");
        });

        it("Should check direct payment enabled", async function () {
            console.log("\nTEST: Check Direct Payment Status");

            const usdcDirect = await gateway.directPaymentTokens(usdc.target);
            const ethDirect = await gateway.directPaymentTokens(ETH_ADDRESS);

            console.log("USDC Direct Payment:", usdcDirect);
            console.log("ETH Direct Payment:", ethDirect);

            expect(usdcDirect).to.be.true;
            expect(ethDirect).to.be.false;
            console.log("SUCCESS: Direct payment status checked");
        });
    });

    after(function () {
        console.log("\n=== ALL TESTS COMPLETE ===\n");
    });
});

// contracts/MaliciousAttacker.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ICryptoPaymentGateway {
    function processETHPaymentWithQuote(
        bytes32 quoteId,
        address merchant,
        string calldata orderId
    ) external payable;
    
    function lockPriceQuote(
        address token,
        uint256 usdAmount
    ) external returns (bytes32, uint256, uint256);
    
    function processTokenPaymentWithQuote(
        bytes32 quoteId,
        address merchant,
        string calldata orderId
    ) external;
}

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
}

/**
 * @title MaliciousAttacker
 * @notice Contract designed to test reentrancy and other attack vectors
 */
contract MaliciousAttacker {
    ICryptoPaymentGateway public gateway;
    address public owner;
    bool public attacking;
    uint256 public attackCount;
    bytes32 public storedQuoteId;
    address public storedMerchant;
    
    event AttackStarted(bytes32 quoteId, address merchant);
    event AttackStopped();
    event ReceivedETH(address from, uint256 amount);
    event WithdrewETH(address to, uint256 amount);
    event WithdrewERC20(address token, address to, uint256 amount);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    constructor(address _gateway) {
        gateway = ICryptoPaymentGateway(_gateway);
        owner = msg.sender;
    }
    
    // Receive ETH
    receive() external payable {
        emit ReceivedETH(msg.sender, msg.value);
        
        // Reentrancy attack logic
        if (attacking && attackCount < 3) {
            attackCount++;
            try gateway.processETHPaymentWithQuote(
                storedQuoteId,
                storedMerchant,
                "REENTRY-ATTACK"
            ) {
                // Attack succeeded
            } catch {
                // Attack blocked - good!
            }
        }
    }
    
    // Attack 1: Reentrancy on receive
    function attackReentrancy(
        bytes32 quoteId,
        address merchant
    ) external payable onlyOwner {
        attacking = true;
        attackCount = 0;
        storedQuoteId = quoteId;
        storedMerchant = merchant;
        
        emit AttackStarted(quoteId, merchant);
        
        gateway.processETHPaymentWithQuote{value: msg.value}(
            quoteId,
            merchant,
            "INITIAL-ATTACK"
        );
    }
    
    // Attack 2: Try to steal someone else's quote
    function attackFrontRun(
        bytes32 victimQuoteId,
        address selfAsMerchant
    ) external payable onlyOwner {
        gateway.processETHPaymentWithQuote{value: msg.value}(
            victimQuoteId,
            selfAsMerchant,
            "FRONTRUN-ATTACK"
        );
    }
    
    // Attack 3: Try to replay a quote
    function attackReplay(
        bytes32 quoteId,
        address merchant
    ) external payable onlyOwner {
        // Use same quote twice
        gateway.processETHPaymentWithQuote{value: msg.value}(
            quoteId,
            merchant,
            "REPLAY-ATTACK-1"
        );
        
        // Try again
        gateway.processETHPaymentWithQuote{value: msg.value}(
            quoteId,
            merchant,
            "REPLAY-ATTACK-2"
        );
    }
    
    // Attack 4: ERC20 attack without approval
    function attackERC20WithoutApproval(
        bytes32 quoteId,
        address merchant
    ) external onlyOwner {
        gateway.processTokenPaymentWithQuote(
            quoteId,
            merchant,
            "NO-APPROVAL-ATTACK"
        );
    }
    
    // Attack 5: ERC20 with malicious callback
    function attackERC20Reentrancy(
        address token,
        bytes32 quoteId,
        address merchant,
        uint256 amount
    ) external onlyOwner {
        attacking = true;
        attackCount = 0;
        storedQuoteId = quoteId;
        storedMerchant = merchant;
        
        // Approve
        IERC20(token).approve(address(gateway), amount);
        
        // Attack
        gateway.processTokenPaymentWithQuote(
            quoteId,
            merchant,
            "ERC20-REENTRY"
        );
    }
    
    // Stop attacking
    function stopAttacking() external onlyOwner {
        attacking = false;
        emit AttackStopped();
    }
    
    // Withdraw ETH
    function withdrawETH(address payable to, uint256 amount) external onlyOwner {
        require(address(this).balance >= amount, "Insufficient balance");
        (bool success, ) = to.call{value: amount}("");
        require(success, "ETH transfer failed");
        emit WithdrewETH(to, amount);
    }
    
    // Withdraw all ETH
    function withdrawAllETH(address payable to) external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No ETH to withdraw");
        (bool success, ) = to.call{value: balance}("");
        require(success, "ETH transfer failed");
        emit WithdrewETH(to, balance);
    }
    
    // Withdraw ERC20
    function withdrawERC20(
        address token,
        address to,
        uint256 amount
    ) external onlyOwner {
        require(IERC20(token).transfer(to, amount), "Transfer failed");
        emit WithdrewERC20(token, to, amount);
    }
    
    // Withdraw all ERC20
    function withdrawAllERC20(address token, address to) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        require(balance > 0, "No tokens to withdraw");
        require(IERC20(token).transfer(to, balance), "Transfer failed");
        emit WithdrewERC20(token, to, balance);
    }
    
    // Check balances
    function getETHBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    function getERC20Balance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }
    
    // Emergency: transfer ownership
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }
}

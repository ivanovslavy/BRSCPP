// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title TokenFaucet
 * @notice Public faucet for distributing test USDC/USDT
 */
contract TokenFaucet is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdc;
    IERC20 public immutable usdt;
    
    // 10,000 tokens (assuming 6 decimals)
    uint256 public faucetAmount = 10000 * 10**6; 
    
    uint256 public cooldown = 1 days;
    
    mapping(address => mapping(address => uint256)) public lastClaim; // user => token => timestamp
    
    event TokensClaimed(address indexed user, address indexed token, uint256 amount);
    event FaucetAmountUpdated(uint256 newAmount);
    event CooldownUpdated(uint256 newCooldown);
    
    constructor(address _usdc, address _usdt) Ownable(msg.sender) {
        usdc = IERC20(_usdc);
        usdt = IERC20(_usdt);
    }
    
    /**
     * @notice Claim USDC from faucet
     */
    function claimUSDC() external {
        _claim(address(usdc));
    }
    
    /**
     * @notice Claim USDT from faucet
     */
    function claimUSDT() external {
        _claim(address(usdt));
    }
    
    /**
     * @notice Claim both USDC and USDT
     */
    function claimBoth() external {
        _claim(address(usdc));
        _claim(address(usdt));
    }
    
    /**
     * @notice Internal claim logic
     */
    function _claim(address token) internal {
        require(
            block.timestamp >= lastClaim[msg.sender][token] + cooldown,
            "Cooldown active"
        );
        
        lastClaim[msg.sender][token] = block.timestamp;
        
        IERC20(token).safeTransfer(msg.sender, faucetAmount); 
        
        emit TokensClaimed(msg.sender, token, faucetAmount);
    }
    
    /**
     * @notice Check seconds until next claim
     */
    function timeUntilNextClaim(address user, address token) external view returns (uint256) {
        uint256 last = lastClaim[user][token];
        if (last == 0) return 0;
        
        uint256 next = last + cooldown;
        if (block.timestamp >= next) return 0;
        
        return next - block.timestamp;
    }
    
    /**
     * @notice Owner: Update faucet amount (in smallest units, e.g., $10000 \times 10^6$)
     */
    function setFaucetAmount(uint256 newAmount) external onlyOwner {
        require(newAmount > 0, "Amount must be greater than zero"); 
        
        faucetAmount = newAmount;
        emit FaucetAmountUpdated(newAmount);
    }
    
    /**
     * @notice Owner: Update cooldown period
     */
    function setCooldown(uint256 newCooldown) external onlyOwner {
        require(newCooldown >= 1 hours, "Cooldown must be at least 1 hour"); 
        
        cooldown = newCooldown;
        emit CooldownUpdated(newCooldown);
    }
    
    /**
     * @notice Owner: Withdraw tokens
     */
    function withdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(owner(), amount); 
    }
    
    /**
     * @notice Fund faucet by calling safeTransferFrom (requires prior allowance)
     */
    function fundFaucet(address token, uint256 amount) external nonReentrant {
        // Now using safeTransferFrom for maximum robustness
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount); 
    }
}

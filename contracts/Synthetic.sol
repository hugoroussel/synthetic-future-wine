pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";


contract Synthetic is ERC20 {

    ERC20 public ibt;
    ERC20 public usdc;
    mapping(address => uint256) public underlyingBalances;

    constructor(address _ibt, address _usdc) ERC20("Synthetic", "SYN") {
        ibt = ERC20(_ibt);
        usdc = ERC20(_usdc);
    }

    function setOracle () public {
        ibt.transferFrom(msg.sender, address(this), 1000000);
    }

    function mint(uint256 usdcAmount) public {
        usdc.transferFrom(msg.sender, address(this), usdcAmount);
        uint256 fytAmount = computeAmountOfFyt(usdcAmount);
        underlyingBalances[msg.sender] += usdcAmount;
        _mint(msg.sender, fytAmount);
    }

    function balanceOf(address user) public view override returns (uint256){
        return underlyingBalances[user]/fytOracle();
    }

    function computeAmountOfFyt(uint256 usdcAmount) public view returns (uint256) {
        return usdcAmount/fytOracle();
    }

    function fytOracle() public view returns (uint256){
        uint256 accruedInterest = (ibt.balanceOf(address(this))-1000000);
        return accruedInterest;
    }
}
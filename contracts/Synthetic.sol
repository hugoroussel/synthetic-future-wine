// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";


contract Synthetic is ERC20, Ownable {

    ERC20 public ibt;
    ERC20 public usdc;

    mapping(address => uint256) public underlyingBalances;

    constructor(address _ibt, address _usdc) ERC20("Synthetic", "SYN") {
        ibt = ERC20(_ibt);
        usdc = ERC20(_usdc);
    }

    function setOracle () public onlyOwner {
        ibt.transferFrom(msg.sender, address(this), 1000000);
    }

    function mint(uint256 usdcAmount) public {
        usdc.transferFrom(msg.sender, address(this), usdcAmount);
        uint256 fytAmount = computeAmountOfFyt(usdcAmount);
        _mint(msg.sender, fytAmount);
    }

    function redeem(uint256 fytAmount) public {
        uint256 usdcAmount = computeAmountOfUsdc(fytAmount);
        _burn(msg.sender, fytAmount);
        usdc.transfer(msg.sender, usdcAmount);
    }

    function _beforeTokenTransfer(address from, address to, uint256 amount) internal override {
        uint256 usdcAmount = computeAmountOfUsdc(amount);
        if(from != address(0)) {
            underlyingBalances[from] -= usdcAmount;
        }
        if(to != address(0)) {
            underlyingBalances[to] += usdcAmount;
        }
    }

    function balanceOf(address user) public view override returns (uint256){
        return underlyingBalances[user]/fytOracle();
    }

    function computeAmountOfFyt(uint256 usdcAmount) public view returns (uint256) {
        return usdcAmount/fytOracle();
    }

    function computeAmountOfUsdc(uint256 fytAmount) public view returns (uint256) {
        return fytOracle()*fytAmount;
    }

    // Warning : someone could send us some ibt which would break the oracle correctness
    function fytOracle() public view returns (uint256){
        uint256 accruedInterest = (ibt.balanceOf(address(this))-1000000);
        if(accruedInterest<=0) {
            revert("Interest is negative");
        } else {
            return accruedInterest;
        }
    }
}
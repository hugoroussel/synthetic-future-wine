// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

abstract contract Lido is ERC20 {
    function submit(address _referral) external payable virtual returns (uint256);
}
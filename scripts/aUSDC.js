// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");

async function increaseTime(value) {
  if (!ethers.BigNumber.isBigNumber(value)) {
    value = ethers.BigNumber.from(value);
  }
  await ethers.provider.send("evm_increaseTime", [value.toNumber()]);
  await ethers.provider.send("evm_mine");
}

async function main() {
  // aUSDC
  let aTokenAddress = "0x9bA00D6856a4eDF4665BcA2C2309936572473B7E";
  let impersonatedAccount = "0xe8d3090D4D0BA443A073bA97E99c328070bd2f4a";

  const impersonatedSigner = await ethers.getImpersonatedSigner(
    impersonatedAccount
  );
  const [owner, otherAccount] = await ethers.getSigners();

  let ERC20 = await ethers.getContractFactory("IBT");
  let aIBT = await ERC20.attach(aTokenAddress);

  let USDC = await ethers.getContractFactory("USDC");
  let usdc = await USDC.deploy();
  console.log("usdc address", usdc.address);

  // get balance of the account
  let balance = await aIBT.balanceOf(impersonatedAccount);
  console.log("aIBT balance impersonated account", balance.toString());

  // deploy the synthetic contract
  let SYN = await ethers.getContractFactory("Synthetic");
  let syn = await SYN.deploy(aTokenAddress, usdc.address);
  console.log("synthetic deployed to:", syn.address);

  // deposit aUSDC into the contract to use as oracle
  await aIBT.connect(impersonatedSigner).approve(syn.address, 1000000);
  await syn.connect(impersonatedSigner).setOracle();

  // get balance of the account
  let balance2 = await aIBT.balanceOf(syn.address);
  console.log("balance of synthetic contract", balance2.toString());

  // one day
  await increaseTime(86400);

  let balance3 = await aIBT.balanceOf(syn.address);
  console.log("balance of synthetic contract", balance3.toString());

  let balanceOfOwner = await usdc.balanceOf(owner.address);
  console.log("balance usdc of owner", balanceOfOwner.toString());
  // let's try to mint some synthetic fyt tokens
  let amount = 1000000;
  await usdc.approve(syn.address, amount);
  await syn.mint(amount);

  // check sfyt balance
  let balance4 = await syn.balanceOf(owner.address);
  console.log("balance of sfyt of owner", balance4.toString());

  // 4 days
  await increaseTime(86400 * 4);

  // check sfyt balance
  let balance5 = await syn.balanceOf(owner.address);
  console.log("balance of sfyt of owner", balance5.toString());
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

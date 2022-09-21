const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");


async function increaseTime(value) {
  if (!ethers.BigNumber.isBigNumber(value)) {
    value = ethers.BigNumber.from(value);
  }
  await ethers.provider.send("evm_increaseTime", [value.toNumber()]);
  await ethers.provider.send("evm_mine");
}

describe("Synthetic aUSDC FYT", function () {

  // constants addresses
  const aTokenAddress = "0x9bA00D6856a4eDF4665BcA2C2309936572473B7E";
  const impersonatedAccount = "0xe8d3090D4D0BA443A073bA97E99c328070bd2f4a";

  // accounts 
  let impersonatedSigner;
  let owner;
  let alice;

  // contracts
  let aIBT;
  let usdc;
  let syn; 

  it("should setup the accounts", async function () {
    impersonatedSigner = await ethers.getImpersonatedSigner(impersonatedAccount);
    expect(impersonatedSigner.address).to.be.equal(impersonatedAccount);
    let signers =  await ethers.getSigners();
    owner = signers[0];
    alice = signers[1];
  });

  it("should deploy the ibt (aUSDC)", async function () {
    let ERC20 = await ethers.getContractFactory("IBT");
    aIBT = await ERC20.attach(aTokenAddress);
    expect(aIBT.address).to.be.equal(aTokenAddress);
    let balanceIBT = await aIBT.balanceOf(impersonatedSigner.address);
    expect(balanceIBT).to.be.gt(0);
  });

  it("should deploy the underlying (USDC)", async function () {
    let ERC20 = await ethers.getContractFactory("USDC");
    usdc = await ERC20.deploy();
    expect(usdc.address).to.be.properAddress;
    let balanceUSDC = await usdc.balanceOf(owner.address);
    expect(balanceUSDC).to.be.gt(0);
  });

  it("should deploy the synthetic contract", async function () {
    let SYN = await ethers.getContractFactory("Synthetic");
    syn = await SYN.deploy(aTokenAddress, usdc.address);
    expect(syn.address).to.be.properAddress;
  });

  it("should setup the oracle", async function () {
    await aIBT.connect(impersonatedSigner).transfer(owner.address, 1000000);
    await aIBT.connect(owner).approve(syn.address, 1000000);
    await syn.setOracle();
    let balanceOracle = await aIBT.balanceOf(syn.address);
    expect(balanceOracle).to.be.gt(0);
    // 1 day
    await increaseTime(86400);
    let fytOracle = await syn.fytOracle();
    expect(fytOracle).to.be.gt(0);
  });

  it("should be able to mint some sfyt", async function () {
    let balanceSynBefore = await syn.balanceOf(owner.address);
    expect(balanceSynBefore).to.be.equal(0);
    // 10$
    let amount = 100*10**6;
    await usdc.approve(syn.address, amount);
    await syn.mint(amount);
    let balanceSynAfter = await syn.balanceOf(owner.address);
    expect(balanceSynAfter).to.be.gt(0);
  });

  it("should be able to transfer sfyt", async function () {
    let balanceSynBefore = await syn.balanceOf(owner.address);
    expect(balanceSynBefore).to.be.gt(0);
    await syn.transfer(alice.address, balanceSynBefore);
    let balanceSynAfter = await syn.balanceOf(owner.address);
    expect(balanceSynAfter).to.be.equal(0);
  });

  it("alice should be able to redeem the underlying usdc after a month", async function () {
    await increaseTime(86400*30);
    let balanceSynBefore = await syn.balanceOf(alice.address);
    expect(balanceSynBefore).to.be.gt(0);
    let balanceUSDCBefore = await usdc.balanceOf(alice.address);
    expect(balanceUSDCBefore).to.be.equal(0);
    await syn.connect(alice).redeem(balanceSynBefore);
    let balanceSynAfter = await syn.balanceOf(alice.address);
    expect(balanceSynAfter).to.be.equal(0);
    let balanceUSDCAfter = await usdc.balanceOf(alice.address);
    console.log("alice redeemed", balanceUSDCAfter/10**6, "usdc");
    expect(balanceUSDCAfter).to.be.gt(0);
  });


});


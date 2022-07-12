const { getNamedAccounts, ethers, network } = require("hardhat");
const { developmentChains } = require("../../helper-hardhat-config");
const { assert } = require("chai");

developmentChains.includes(network.name)
  ? describe.skip
  : describe("FundMe", async () => {
      let fundMe;
      let deployer;
      const sendValue = ethers.utils.parseEther("0.1");

      beforeEach(async () => {
        deployer = (await getNamedAccounts()).deployer;
        console.log("Deploying contract...");
        fundMe = await ethers.getContract("FundMe", deployer);
        console.log("Contract deployed!");
      });

      it("allows people to fund and withdraw", async () => {
        console.log(`Fund the contract with ${sendValue} wei`);
        await fundMe.fund({ value: sendValue });
        console.log("Withdrawing the funds");
        await fundMe.withdraw();
        const endingBalance = await fundMe.provider.getBalance(fundMe.address);
        assert.equal(endingBalance.toString(), "0");
      });
    });

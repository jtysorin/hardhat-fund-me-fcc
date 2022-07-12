const { deployments, getNamedAccounts, ethers } = require("hardhat");
const { developmentChains } = require("../../helper-hardhat-config");
const { assert, expect } = require("chai");

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("FundMe", async () => {
      let fundMe;
      let deployer;
      let mockV3Aggregator;
      const sendValue = ethers.utils.parseEther("1"); // 1 ETH

      beforeEach(async () => {
        // const accounts = await ethers.getSigners();
        // const accountZero = accounts[0];
        // OR
        deployer = (await getNamedAccounts()).deployer;

        await deployments.fixture(["all"]); // ruleaza toate fisierele de deploy care au tag-ul "all"
        fundMe = await ethers.getContract("FundMe", deployer); // din contractele deployate iau contractul "FundMe"
        mockV3Aggregator = await ethers.getContract(
          "MockV3Aggregator",
          deployer
        ); // din contractele deployate iau contractul "MockV3Aggregator"
      });

      describe("constructor", async () => {
        it("Sets the aggregator address correctly", async () => {
          const response = await fundMe.getPriceFeed();
          assert.equal(response, mockV3Aggregator.address);
        });
      });

      describe("fund", async () => {
        it("Fails if you don't send enough ETH", async () => {
          await expect(fundMe.fund()).to.be.revertedWith("Didn't send enough!");
        });

        it("Updated the amount funded data structure", async () => {
          await fundMe.fund({ value: sendValue });
          const response = await fundMe.getAddressToAmountFunded(deployer);
          assert.equal(response.toString(), sendValue.toString());
        });

        it("Adds funder to array of funders", async () => {
          await fundMe.fund({ value: sendValue });
          const funder = await fundMe.getFunder(0);
          assert.equal(funder, deployer);
        });
      });

      describe("withdraw", async () => {
        beforeEach(async () => {
          await fundMe.fund({ value: sendValue });
        });

        it("Withdraw ETH from a single founder", async () => {
          const startingFundMeBalance = await fundMe.provider.getBalance(
            fundMe.address
          );
          const startingDeployerBalance = await fundMe.provider.getBalance(
            deployer
          );

          const transactionResponse = await fundMe.withdraw();
          const transactionReceipt = await transactionResponse.wait(1);
          const { gasUsed, effectiveGasPrice } = transactionReceipt;
          const gasCost = gasUsed.mul(effectiveGasPrice);

          const endingFundMeBalance = await fundMe.provider.getBalance(
            fundMe.address
          );
          const endingDeployerBalance = await fundMe.provider.getBalance(
            deployer
          );

          assert.equal(endingFundMeBalance, 0);
          assert.equal(
            endingDeployerBalance.add(gasCost),
            startingDeployerBalance.add(startingFundMeBalance).toString()
          );
        });

        it("Allows us to withdraw with multiple funders", async () => {
          const accounts = await ethers.getSigners();
          for (let i = 1; i < 6; i++) {
            const fundMeConnectedContract = await fundMe.connect(accounts[i]);
            await fundMeConnectedContract.fund({ value: sendValue });
          }

          const startingFundMeBalance = await fundMe.provider.getBalance(
            fundMe.address
          );
          const startingDeployerBalance = await fundMe.provider.getBalance(
            deployer
          );

          const transactionResponse = await fundMe.withdraw();
          const transactionReceipt = await transactionResponse.wait(1);
          const { gasUsed, effectiveGasPrice } = transactionReceipt;
          const gasCost = gasUsed.mul(effectiveGasPrice);

          const endingFundMeBalance = await fundMe.provider.getBalance(
            fundMe.address
          );
          const endingDeployerBalance = await fundMe.provider.getBalance(
            deployer
          );

          assert.equal(endingFundMeBalance, 0);
          assert.equal(
            endingDeployerBalance.add(gasCost),
            startingDeployerBalance.add(startingFundMeBalance).toString()
          );

          await expect(fundMe.getFunder(0)).to.be.reverted;

          for (let i = 1; i < 6; i++) {
            assert.equal(
              await fundMe.getAddressToAmountFunded(accounts[i].address),
              0
            );
          }
        });

        it("Only allows the owner to withdraw", async () => {
          const accounts = await ethers.getSigners();
          const attacker = accounts[1];
          const attackerConnectedContract = await fundMe.connect(attacker);

          await expect(attackerConnectedContract.withdraw()).to.be.revertedWith(
            "FundMe__NotOwner"
          );
        });

        it("Only allows the owner to cheaper withdraw", async () => {
          const accounts = await ethers.getSigners();
          const attacker = accounts[1];
          const attackerConnectedContract = await fundMe.connect(attacker);

          await expect(
            attackerConnectedContract.cheaperWithdraw()
          ).to.be.revertedWith("FundMe__NotOwner");
        });

        it("Allows us to cheaper withdraw with multiple funders", async () => {
          const accounts = await ethers.getSigners();
          for (let i = 1; i < 6; i++) {
            const fundMeConnectedContract = await fundMe.connect(accounts[i]);
            await fundMeConnectedContract.fund({ value: sendValue });
          }

          const startingFundMeBalance = await fundMe.provider.getBalance(
            fundMe.address
          );
          const startingDeployerBalance = await fundMe.provider.getBalance(
            deployer
          );

          const transactionResponse = await fundMe.cheaperWithdraw();
          const transactionReceipt = await transactionResponse.wait(1);
          const { gasUsed, effectiveGasPrice } = transactionReceipt;
          const gasCost = gasUsed.mul(effectiveGasPrice);

          const endingFundMeBalance = await fundMe.provider.getBalance(
            fundMe.address
          );
          const endingDeployerBalance = await fundMe.provider.getBalance(
            deployer
          );

          assert.equal(endingFundMeBalance, 0);
          assert.equal(
            endingDeployerBalance.add(gasCost),
            startingDeployerBalance.add(startingFundMeBalance).toString()
          );

          await expect(fundMe.getFunder(0)).to.be.reverted;

          for (let i = 1; i < 6; i++) {
            assert.equal(
              await fundMe.getAddressToAmountFunded(accounts[i].address),
              0
            );
          }
        });
      });
    });

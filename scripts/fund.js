const { getNamedAccounts, ethers, network } = require("hardhat");

async function main() {
  deployer = (await getNamedAccounts()).deployer;
  fundMe = await ethers.getContract("FundMe", deployer);
  console.log("Funding Contract...");
  const transactionResponse = await fundMe.fund({
    value: ethers.utils.parseEther("10"),
  });
  await transactionResponse.wait(1);
  console.log("Funded!");

  let accounts = await ethers.getSigners();
  let balance = await ethers.provider.getBalance(accounts[0].address);
  console.log(accounts[0].address);
  console.log(`Balance left: ${(balance / 1e18).toString()}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

const hre = require("hardhat");

async function main() {
  console.log("Deploying CarbonCreditRegistry contract...");

  // Get the deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Check balance
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH");

  if (balance === 0n) {
    throw new Error("Not enough ETH in the account to deploy the contract");
  }

  // Get the contract factory
  const CarbonCreditRegistry = await hre.ethers.getContractFactory("CarbonCreditRegistry");

  // Deploy the contract
  console.log("Deploying contract...");
  const carbonCreditRegistry = await CarbonCreditRegistry.deploy();

  // Wait for deployment to complete
  await carbonCreditRegistry.waitForDeployment();

  const contractAddress = await carbonCreditRegistry.getAddress();

  console.log("CarbonCreditRegistry deployed to:", contractAddress);
  console.log("Contract deployed on network:", hre.network.name);

  // Verify contract on Etherscan if on Sepolia
  if (hre.network.name === "sepolia") {
    console.log("Waiting for block confirmations...");
    await carbonCreditRegistry.deploymentTransaction().wait(6);
    
    try {
      await hre.run("verify:verify", {
        address: contractAddress,
        constructorArguments: [],
      });
      console.log("Contract verified on Etherscan");
    } catch (error) {
      console.log("Verification failed:", error.message);
    }
  }

  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    contractAddress: contractAddress,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    blockNumber: await hre.ethers.provider.getBlockNumber(),
  };

  console.log("Deployment completed successfully!");
  console.log("Deployment info:", JSON.stringify(deploymentInfo, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

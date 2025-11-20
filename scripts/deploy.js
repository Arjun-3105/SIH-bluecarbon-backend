/* eslint-disable no-console */
require('dotenv').config();

const hre = require('hardhat');

async function main() {
	const [deployer] = await hre.ethers.getSigners();
	console.log('Deployer:', deployer.address);

	// Deploy BlueCarbon token
	const BlueCarbon = await hre.ethers.getContractFactory('BlueCarbon');
	const blueCarbon = await BlueCarbon.deploy();
	await blueCarbon.waitForDeployment();
	const blueCarbonAddress = await blueCarbon.getAddress();
	console.log('BlueCarbon deployed at:', blueCarbonAddress);

	// Deploy CarbonCreditRegistry with token address
	const CarbonCreditRegistry = await hre.ethers.getContractFactory('CarbonCreditRegistry');
	const registry = await CarbonCreditRegistry.deploy(blueCarbonAddress);
	await registry.waitForDeployment();
	const registryAddress = await registry.getAddress();
	console.log('CarbonCreditRegistry deployed at:', registryAddress);

	// Grant MINTER_ROLE to registry on token
	const MINTER_ROLE = await blueCarbon.MINTER_ROLE();
	const grantTx = await blueCarbon.grantRole(MINTER_ROLE, registryAddress);
	await grantTx.wait();
	console.log('Granted MINTER_ROLE to registry');

	// Persist deployment info
	const fs = require('fs');
	const path = require('path');
	const network = hre.network.name;
	const outFile = path.join(__dirname, `../deployments/${network}.json`);
	const data = {
		network,
		deployer: deployer.address,
		blueCarbonToken: {
			address: blueCarbonAddress,
			name: 'BlueCarbon',
			symbol: 'BCARB'
		},
		carbonCreditRegistry: {
			address: registryAddress,
			name: 'Carbon Credit Registry',
			symbol: 'CCR'
		},
		roles: {
			registryHasMinterRole: true
		},
		timestamp: new Date().toISOString()
	};

	fs.mkdirSync(path.dirname(outFile), { recursive: true });
	fs.writeFileSync(outFile, JSON.stringify(data, null, 2));
	console.log('Saved deployment to:', outFile);
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});



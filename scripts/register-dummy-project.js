/* eslint-disable no-console */
require('dotenv').config();
const hre = require('hardhat');
const fs = require('fs');
const path = require('path');

// Default owner (MetaMask) fallback if not provided via --owner or OWNER env
const DEFAULT_OWNER = process.env.DEFAULT_OWNER || '0xD60BE0d8fAcC911CfBFf11CC112987227Ed0aac2';

function toBytes32FromString(input) {
	const hex = hre.ethers.hexlify(hre.ethers.toUtf8Bytes(input));
	return hre.ethers.zeroPadValue(hex, 32);
}

function getArg(name) {
	const flag = `--${name}`;
	const idx = process.argv.indexOf(flag);
	if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1];
	const envKey = name.toUpperCase();
	return process.env[envKey];
}

async function main() {
	const network = hre.network.name;
	const deploymentsPath = path.join(__dirname, `../deployments/${network}.json`);
	if (!fs.existsSync(deploymentsPath)) {
		throw new Error(`No deployment found for network ${network}. Run scripts/deploy.js first.`);
	}
	const deployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));

	const registryAddr = deployments.carbonCreditRegistry.address;
	const tokenAddr = deployments.blueCarbonToken.address;

	const [sender] = await hre.ethers.getSigners();
	const providedOwner = getArg('owner') || DEFAULT_OWNER;
	if (!hre.ethers.isAddress(providedOwner)) {
		throw new Error(`Invalid owner address: ${providedOwner}`);
	}
	const projectOwner = providedOwner;
	console.log('Sender (tx signer):', sender.address);
	console.log('Project owner (recipient):', projectOwner);
	console.log('Registry:', registryAddr);
	console.log('Token:', tokenAddr);

	const registry = await hre.ethers.getContractAt('CarbonCreditRegistry', registryAddr);
	const token = await hre.ethers.getContractAt('BlueCarbon', tokenAddr);

	// Dummy project details
	const projectId = `DUMMY_${Date.now()}`;
	const credits = 1000; // mints 1000 * 1e18 BCARB to owner
	const ipfsHash32 = toBytes32FromString('dummy-ipfs-hash');

	console.log('Registering project:', { projectId, credits });
	const tx = await registry.registerProject(projectId, credits, projectOwner, ipfsHash32);
	const receipt = await tx.wait();

	// Find ProjectRegistered event
	let tokenId = null;
	for (const log of receipt.logs) {
		try {
			const parsed = registry.interface.parseLog(log);
			if (parsed && parsed.name === 'ProjectRegistered') {
				tokenId = parsed.args.tokenId.toString();
				break;
			}
		} catch (_) {}
	}

	// Token balance
	const balance = await token.balanceOf(projectOwner);
	console.log('Token ID:', tokenId ?? '(not parsed)');
	console.log('Owner BCARB balance:', hre.ethers.formatUnits(balance, 18));
	console.log('BCARB token address:', tokenAddr);

	console.log('Done. You can import BCARB into MetaMask using token address above.');
}

main().catch((err) => {
	console.error(err);
	process.exitCode = 1;
});



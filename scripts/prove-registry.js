/* eslint-disable no-console */
require('dotenv').config();
const hre = require('hardhat');
const fs = require('fs');
const path = require('path');

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
	const d = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));

	const tokenAddr = d.blueCarbonToken.address;
	const regAddr = d.carbonCreditRegistry.address;
	const owner = getArg('owner') || process.env.DEFAULT_OWNER;

	const token = await hre.ethers.getContractAt('BlueCarbon', tokenAddr);
	const reg = await hre.ethers.getContractAt('CarbonCreditRegistry', regAddr);

	console.log('Network:', network);
	console.log('Token:', tokenAddr);
	console.log('Registry:', regAddr);
	if (owner) console.log('Owner to check:', owner);

	// 1) MINTER_ROLE check
	const MINTER_ROLE = await token.MINTER_ROLE();
	const hasRole = await token.hasRole(MINTER_ROLE, regAddr);
	console.log('Registry has MINTER_ROLE on token:', hasRole);

	// 2) Latest ProjectRegistered event
	const regFilter = reg.filters.ProjectRegistered();
	const regLogs = await reg.queryFilter(regFilter, 0, 'latest');
	if (regLogs.length === 0) {
		console.log('No ProjectRegistered events found.');
	} else {
		const last = regLogs[regLogs.length - 1];
		const { tokenId, projectId, projectOwner, carbonCredits } = last.args;
		console.log('Last ProjectRegistered:', {
			tokenId: tokenId.toString(),
			projectId,
			projectOwner,
			carbonCredits: carbonCredits.toString()
		});
	}

	// 3) Latest ERC20CreditsMinted event
	const mintFilter = reg.filters.ERC20CreditsMinted();
	const mintLogs = await reg.queryFilter(mintFilter, 0, 'latest');
	if (mintLogs.length === 0) {
		console.log('No ERC20CreditsMinted events found.');
	} else {
		const lastM = mintLogs[mintLogs.length - 1];
		const { tokenId, amount, to } = lastM.args;
		console.log('Last ERC20CreditsMinted:', {
			tokenId: tokenId.toString(),
			amount: amount.toString(),
			recipient: to
		});
	}

	// 4) Owner BCARB balance (if provided)
	if (owner) {
		const bal = await token.balanceOf(owner);
		console.log('Owner BCARB balance:', hre.ethers.formatUnits(bal, 18));
	}

	// 5) tokenURI for the last project (if exists)
	if (regLogs?.length) {
		const last = regLogs[regLogs.length - 1];
		const tokenIdStr = last.args.tokenId.toString();
		const uri = await reg.tokenURI(tokenIdStr);
		console.log('tokenURI of last project:', uri);
	}
}

main().catch((err) => {
	console.error(err);
	process.exitCode = 1;
});



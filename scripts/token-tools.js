/* eslint-disable no-console */
require('dotenv').config();
const hre = require('hardhat');
const fs = require('fs');
const path = require('path');

function getArg(name, defaultValue) {
  const flag = `--${name}`;
  const idx = process.argv.indexOf(flag);
  if (idx !== -1 && process.argv[idx + 1]) {
    return process.argv[idx + 1];
  }
  const envKey = name.toUpperCase();
  if (process.env[envKey]) {
    return process.env[envKey];
  }
  return defaultValue;
}

function loadDeployments(network) {
  const deploymentsPath = path.join(__dirname, `../deployments/${network}.json`);
  if (!fs.existsSync(deploymentsPath)) {
    throw new Error(
      `Deployment file not found for network "${network}". Run scripts/deploy.js first.`
    );
  }
  return JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
}

async function checkBalance(address, tokenAddress) {
  if (!hre.ethers.isAddress(address)) {
    throw new Error(`Invalid address: ${address}`);
  }

  const token = await hre.ethers.getContractAt('BlueCarbon', tokenAddress);
  const balance = await token.balanceOf(address);

  console.log('Token:', tokenAddress);
  console.log('Wallet:', address);
  console.log('Balance (wei):', balance.toString());
  console.log('Balance (BCARB):', hre.ethers.formatUnits(balance, 18));
}

async function retireTokens(tokenId, amount, reason, registryAddress, signerIndex = 0) {
  if (!tokenId) {
    throw new Error('Missing --tokenId');
  }
  if (!amount) {
    throw new Error('Missing --amount');
  }

  const parsedAmount = Number(amount);
  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    throw new Error(`Invalid amount: ${amount}`);
  }

  const signers = await hre.ethers.getSigners();
  const signer = signers[Number(signerIndex) || 0];

  const registry = await hre.ethers.getContractAt(
    'CarbonCreditRegistry',
    registryAddress,
    signer
  );

  console.log('Registry:', registryAddress);
  console.log('Signer:', signer.address);
  console.log('Retiring amount:', parsedAmount);
  console.log('Reason:', reason);

  const tx = await registry.retireCredits(tokenId, parsedAmount, reason);
  console.log('Transaction sent:', tx.hash);
  const receipt = await tx.wait();

  console.log('✔ Credits retired');
  console.log('Block:', receipt.blockNumber);
  console.log('Gas used:', receipt.gasUsed.toString());
}

async function main() {
  const network = hre.network.name;
  const deployments = loadDeployments(network);

  const action = getArg('action');
  if (!action) {
    throw new Error('Specify --action balance|retire');
  }

  if (action === 'balance') {
    const address = getArg('address');
    if (!address) {
      throw new Error('Provide --address for balance check');
    }
    await checkBalance(address, deployments.blueCarbonToken.address);
    return;
  }

  if (action === 'retire') {
    const tokenId = getArg('tokenId');
    const amount = getArg('amount');
    const reason = getArg('reason', 'Retired via CLI');
    const signerIndex = getArg('signer');
    await retireTokens(
      tokenId,
      amount,
      reason,
      deployments.carbonCreditRegistry.address,
      signerIndex
    );
    return;
  }

  throw new Error(`Unknown action: ${action}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});



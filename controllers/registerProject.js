// registerProject.js
require("dotenv").config();
const { create } = require("ipfs-http-client");
const { ethers } = require("ethers");

// ------------------- CONFIG -------------------
const registryABI = require("./artifacts/CarbonRegistry.json").abi;
const registryAddress = "0xYourContractAddress"; // <-- update this

const provider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:8545"); // or Infura/Alchemy
const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const registry = new ethers.Contract(registryAddress, registryABI, signer);

// Setup IPFS client (Infura)
const projectId = process.env.INFURA_IPFS_PROJECT_ID;
const projectSecret = process.env.INFURA_IPFS_PROJECT_SECRET;
const auth =
  "Basic " + Buffer.from(projectId + ":" + projectSecret).toString("base64");

const ipfs = create({
  host: "ipfs.infura.io",
  port: 5001,
  protocol: "https",
  headers: { authorization: auth },
});

// ------------------- MAIN FUNCTION -------------------
async function streamProjectToBlockchain(project) {
  try {
    // 1️⃣ Extract essentials
    const { projectId, co2Estimate, status, evidenceHash, ...rest } = project;

    // 2️⃣ Prepare metadata (remove Mongo stuff)
    const metadata = {
      timestampISO: project.timestampISO,
      gps: project.gps,
      photos: project.photos,
      videos: project.videos,
      ecosystemType: project.ecosystemType,
      seagrassData: project.seagrassData,
      soilCores: project.soilCores,
      co2Estimate: project.co2Estimate,
      submittedAt: project.submittedAt,
    };

    // 3️⃣ Upload metadata to IPFS
    console.log("Uploading metadata to IPFS...");
    const { cid } = await ipfs.add(JSON.stringify(metadata));
    const ipfsCID = cid.toString();
    console.log("✅ Metadata CID:", ipfsCID);

    // 4️⃣ Convert to contract params
    const carbonCredits = Math.floor(Number(co2Estimate) / 1e12); // scale
    if (carbonCredits <= 0 || carbonCredits > 65535) {
      throw new Error("Carbon credits out of uint16 range after scaling");
    }

    const statusMap = { PENDING: 0, APPROVED: 1, REJECTED: 2 };
    const enumStatus = statusMap[status];

    const ipfsHash = ethers.utils.keccak256(
      ethers.utils.toUtf8Bytes(ipfsCID)
    );

    // 5️⃣ Register on blockchain
    console.log("Registering project on blockchain...");
    const tx = await registry.registerProject(
      projectId,
      carbonCredits,
      enumStatus,
      ipfsHash
    );
    const receipt = await tx.wait();

    console.log("✅ Project registered!");
    console.log("Tx hash:", receipt.transactionHash);
    console.log("Stored IPFS CID (off-chain):", ipfsCID);
  } catch (err) {
    console.error("❌ Error:", err.message);
  }
}

// ------------------- SAMPLE RUN -------------------
const sampleProject = {
  _id: "68d0716b1ced7bec143bbf22",
  projectId: "1",
  timestampISO: "2025-09-21T21:43:07.647Z",
  gps: {
    latitude: 28.4427567233807,
    longitude: 77.50569673016288,
    precision: 5,
    _id: "68d0716b1ced7bec143bbf23",
  },
  photos: ["Lab_6.pdf", "Screenshot 2025-08-04 000048.png"],
  videos: [],
  ecosystemType: "seagrass",
  seagrassData: {
    species: ["Cymodocea serrulata"],
    meadowAreaM2: 1212,
    shootDensity: 312312,
    biomassKgPerM2: 0,
    _id: "68d0716b1ced7bec143bbf24",
  },
  soilCores: [],
  co2Estimate: 21469036069284.08,
  evidenceHash:
    "fc47d9be9ebad3edaac533faea8bbd2f49b54f327d3625b174a3dc2a4aa4b804",
  status: "PENDING",
  submittedAt: "2025-09-21T21:43:07.696Z",
  __v: 0,
};


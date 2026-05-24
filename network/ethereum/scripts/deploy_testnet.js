const fs = require("fs");
const path = require("path");
const { ethers, network } = require("hardhat");

const SHARED_DIR = process.env.SHARED_DIR || "/shared";

function parseUniversityAddresses(envValue) {
  if (!envValue) return [];
  return envValue
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

async function main() {
  const [admin] = await ethers.getSigners();
  console.log("[deploy_testnet] network:", network.name);
  console.log("[deploy_testnet] admin:", admin.address);
  const balance = await ethers.provider.getBalance(admin.address);
  console.log("[deploy_testnet] admin balance:", ethers.formatEther(balance), "ETH");

  if (balance === 0n) {
    throw new Error(
      "admin account has 0 balance; fund it from a faucet before deploying",
    );
  }

  const NotaryContract = await ethers.getContractFactory("NotaryContract");
  const notary = await NotaryContract.deploy();
  await notary.waitForDeployment();
  const contractAddress = await notary.getAddress();
  console.log("[deploy_testnet] NotaryContract deployed at:", contractAddress);

  const addresses = parseUniversityAddresses(process.env.UNIVERSITY_ADDRESSES);
  if (addresses.length === 0) {
    console.log(
      "[deploy_testnet] UNIVERSITY_ADDRESSES not set; skipping addUniversity calls",
    );
    console.log(
      "[deploy_testnet] call notary.addUniversity(<addr>) manually before each university can submit",
    );
  } else {
    for (const addr of addresses) {
      const checksummed = ethers.getAddress(addr);
      const tx = await notary.addUniversity(checksummed);
      await tx.wait();
      console.log(`[deploy_testnet] addUniversity(${checksummed}) ok`);
    }
    const k = await notary.globalK();
    const n = await notary.universityCount();
    console.log(`[deploy_testnet] consensus K-of-N = ${k}-of-${n}`);
  }

  if (fs.existsSync(SHARED_DIR) && process.env.SKIP_SHARED_WRITE !== "1") {
    fs.writeFileSync(
      path.join(SHARED_DIR, "ethereum.env"),
      `NOTARY_CONTRACT_ADDRESS=${contractAddress}\n`,
    );
    console.log(`[deploy_testnet] wrote ${SHARED_DIR}/ethereum.env`);
  }

  console.log(`\nNOTARY_CONTRACT_ADDRESS=${contractAddress}`);
  console.log("\nDistribuir aquesta adreça a cada universitat juntament amb:");
  console.log("  - DEMOCHAIN_APP_ID (de l'AlgoKit deploy a TestNet)");
  console.log("  - ETHEREUM_RPC_URL (per defecte un endpoint de Sepolia)");
  console.log("  - UNI_ETH_PRIVATE_KEY (la clau privada de la pròpia universitat)");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

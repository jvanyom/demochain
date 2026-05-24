const fs = require("fs");
const path = require("path");
const { ethers } = require("hardhat");

const SHARED_DIR = process.env.SHARED_DIR || "/shared";

async function main() {
  const [admin] = await ethers.getSigners();
  console.log("[deploy_localnet] admin:", admin.address);

  const NotaryContract = await ethers.getContractFactory("NotaryContract");
  const notary = await NotaryContract.deploy();
  await notary.waitForDeployment();
  const contractAddress = await notary.getAddress();
  console.log("[deploy_localnet] NotaryContract deployed at:", contractAddress);

  const universityKeys = [
    { id: "UIB", key: process.env.UIB_ETH_PRIVATE_KEY },
    { id: "UPC", key: process.env.UPC_ETH_PRIVATE_KEY },
    { id: "UAB", key: process.env.UAB_ETH_PRIVATE_KEY },
  ];

  for (const uni of universityKeys) {
    if (!uni.key) {
      console.log(`[deploy_localnet] skipping ${uni.id}: no private key in env`);
      continue;
    }
    const wallet = new ethers.Wallet(uni.key);
    const tx = await notary.addUniversity(wallet.address);
    await tx.wait();
    console.log(`[deploy_localnet] addUniversity(${uni.id}=${wallet.address}) ok`);
  }

  const k = await notary.globalK();
  const n = await notary.universityCount();
  console.log(`[deploy_localnet] consensus K-of-N = ${k}-of-${n}`);

  if (!fs.existsSync(SHARED_DIR)) {
    fs.mkdirSync(SHARED_DIR, { recursive: true });
  }
  fs.writeFileSync(
    path.join(SHARED_DIR, "ethereum.env"),
    `NOTARY_CONTRACT_ADDRESS=${contractAddress}\n`,
  );
  console.log(`[deploy_localnet] wrote ${SHARED_DIR}/ethereum.env`);
  console.log(`NOTARY_CONTRACT_ADDRESS=${contractAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

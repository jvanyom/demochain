const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Desplegant NotaryContract amb:", deployer.address);

  const NotaryContract = await ethers.getContractFactory("NotaryContract");
  const notary = await NotaryContract.deploy();
  await notary.waitForDeployment();

  const address = await notary.getAddress();
  console.log("NotaryContract desplegat a:", address);
  console.log("\nAfegeix al fitxer .env:");
  console.log("  NOTARY_CONTRACT_ADDRESS=" + address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

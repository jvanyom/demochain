const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("NotaryContract", function () {
  let notary;
  let admin, uni1, uni2, uni3, uni4, stranger;

  beforeEach(async function () {
    [admin, uni1, uni2, uni3, uni4, stranger] = await ethers.getSigners();
    const NotaryContract = await ethers.getContractFactory("NotaryContract");
    notary = await NotaryContract.deploy();
  });

  describe("addUniversity", function () {
    it("afegeix una universitat i emet UniversityAdded", async function () {
      await expect(notary.addUniversity(uni1.address))
        .to.emit(notary, "UniversityAdded")
        .withArgs(uni1.address);
      expect(await notary.whitelist(uni1.address)).to.be.true;
      expect(await notary.universityCount()).to.equal(1);
    });

    it("recalcula K correctament en afegir universitats", async function () {
      await notary.addUniversity(uni1.address);   // N=1 → K=1
      expect(await notary.globalK()).to.equal(1);
      await notary.addUniversity(uni2.address);   // N=2 → K=2
      expect(await notary.globalK()).to.equal(2);
      await notary.addUniversity(uni3.address);   // N=3 → K=2
      expect(await notary.globalK()).to.equal(2);
      await notary.addUniversity(uni4.address);   // N=4 → K=3
      expect(await notary.globalK()).to.equal(3);
    });

    it("rebutja una adreça zero", async function () {
      await expect(notary.addUniversity(ethers.ZeroAddress))
        .to.be.revertedWith("NotaryContract: zero address");
    });

    it("rebutja una universitat ja registrada", async function () {
      await notary.addUniversity(uni1.address);
      await expect(notary.addUniversity(uni1.address))
        .to.be.revertedWith("NotaryContract: already whitelisted");
    });

    it("rebutja crides de no-admin", async function () {
      await expect(notary.connect(uni1).addUniversity(uni2.address))
        .to.be.revertedWith("NotaryContract: not admin");
    });
  });

  describe("removeUniversity", function () {
    beforeEach(async function () {
      await notary.addUniversity(uni1.address);
      await notary.addUniversity(uni2.address);
      await notary.addUniversity(uni3.address);  // N=3, K=2
    });

    it("elimina una universitat i emet UniversityRemoved", async function () {
      await expect(notary.removeUniversity(uni3.address))
        .to.emit(notary, "UniversityRemoved")
        .withArgs(uni3.address);
      expect(await notary.whitelist(uni3.address)).to.be.false;
      expect(await notary.universityCount()).to.equal(2);
    });

    it("recalcula K correctament en eliminar universitats", async function () {
      await notary.removeUniversity(uni3.address);  // N=2 → K=2
      expect(await notary.globalK()).to.equal(2);
      await notary.removeUniversity(uni2.address);  // N=1 → K=1
      expect(await notary.globalK()).to.equal(1);
      await notary.removeUniversity(uni1.address);  // N=0 → K=0
      expect(await notary.globalK()).to.equal(0);
    });

    it("rebutja eliminar una universitat no registrada", async function () {
      await expect(notary.removeUniversity(stranger.address))
        .to.be.revertedWith("NotaryContract: not whitelisted");
    });
  });

  describe("openElection", function () {
    beforeEach(async function () {
      await notary.addUniversity(uni1.address);
      await notary.addUniversity(uni2.address);
      await notary.addUniversity(uni3.address);  // N=3, K=2
    });

    it("obre una elecció i emet ElectionOpened amb la instantània correcta", async function () {
      await expect(notary.openElection("proposta-1"))
        .to.emit(notary, "ElectionOpened")
        .withArgs("proposta-1", 2, 3);
    });

    it("rebutja obrir la mateixa elecció dues vegades", async function () {
      await notary.openElection("proposta-1");
      await expect(notary.openElection("proposta-1"))
        .to.be.revertedWith("NotaryContract: election already open");
    });

    it("rebutja obrir una elecció sense universitats registrades", async function () {
      const NotaryContract = await ethers.getContractFactory("NotaryContract");
      const buit = await NotaryContract.deploy();
      await expect(buit.openElection("proposta-1"))
        .to.be.revertedWith("NotaryContract: no universities registered");
    });

    it("la instantània de K és independent dels canvis globals posteriors", async function () {
      await notary.openElection("proposta-1");  // instantània K=2
      await notary.addUniversity(uni4.address); // globalK ara és 3
      const HASH = ethers.keccak256(ethers.toUtf8Bytes("resultat"));
      await notary.connect(uni1).submitHash("proposta-1", HASH);
      await expect(notary.connect(uni2).submitHash("proposta-1", HASH))
        .to.emit(notary, "ResultAnchored");  // ancora amb K=2, no K=3
    });
  });

  describe("submitHash", function () {
    const ELECTION = "proposta-1";
    const HASH_A = ethers.keccak256(ethers.toUtf8Bytes("resultat_a"));
    const HASH_B = ethers.keccak256(ethers.toUtf8Bytes("resultat_b"));

    beforeEach(async function () {
      await notary.addUniversity(uni1.address);
      await notary.addUniversity(uni2.address);
      await notary.addUniversity(uni3.address);
      await notary.openElection(ELECTION);
    });

    it("accepta una submissió vàlida i emet HashSubmitted", async function () {
      await expect(notary.connect(uni1).submitHash(ELECTION, HASH_A))
        .to.emit(notary, "HashSubmitted")
        .withArgs(ELECTION, HASH_A, uni1.address);
    });

    it("registra correctament la submissió", async function () {
      await notary.connect(uni1).submitHash(ELECTION, HASH_A);
      expect(await notary.getSubmission(ELECTION, uni1.address)).to.equal(HASH_A);
    });

    it("rebutja una submissió d'una adreça no autoritzada", async function () {
      await expect(notary.connect(stranger).submitHash(ELECTION, HASH_A))
        .to.be.revertedWith("NotaryContract: not authorized");
    });

    it("rebutja una submissió per a una elecció no oberta", async function () {
      await expect(notary.connect(uni1).submitHash("desconeguda", HASH_A))
        .to.be.revertedWith("NotaryContract: election not open");
    });

    it("rebutja una submissió duplicada del mateix node", async function () {
      await notary.connect(uni1).submitHash(ELECTION, HASH_A);
      await expect(notary.connect(uni1).submitHash(ELECTION, HASH_A))
        .to.be.revertedWith("NotaryContract: already submitted");
    });

    it("rebutja un hash zero", async function () {
      await expect(notary.connect(uni1).submitHash(ELECTION, ethers.ZeroHash))
        .to.be.revertedWith("NotaryContract: zero hash");
    });

    it("emet ResultAnchored quan K nodes envien el mateix hash", async function () {
      await notary.connect(uni1).submitHash(ELECTION, HASH_A);
      await expect(notary.connect(uni2).submitHash(ELECTION, HASH_A))
        .to.emit(notary, "ResultAnchored")
        .withArgs(ELECTION, HASH_A, 2);
      expect(await notary.isElectionAnchored(ELECTION)).to.be.true;
    });

    it("no ancora si els hashes no coincideixen", async function () {
      await notary.connect(uni1).submitHash(ELECTION, HASH_A);
      await notary.connect(uni2).submitHash(ELECTION, HASH_B);
      expect(await notary.isElectionAnchored(ELECTION)).to.be.false;
    });

    it("rebutja submissions després que l'elecció ja està ancorada", async function () {
      await notary.connect(uni1).submitHash(ELECTION, HASH_A);
      await notary.connect(uni2).submitHash(ELECTION, HASH_A);  // ancora
      await expect(notary.connect(uni3).submitHash(ELECTION, HASH_A))
        .to.be.revertedWith("NotaryContract: already anchored");
    });

    it("permet eleccions múltiples de forma independent", async function () {
      await notary.openElection("proposta-2");
      await notary.connect(uni1).submitHash(ELECTION,     HASH_A);
      await notary.connect(uni1).submitHash("proposta-2", HASH_B);
      expect(await notary.isElectionAnchored(ELECTION)).to.be.false;
      expect(await notary.isElectionAnchored("proposta-2")).to.be.false;
    });
  });
});

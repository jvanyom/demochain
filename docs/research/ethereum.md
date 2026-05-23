# Ethereum - Fonaments i rol en el projecte

**ID de la tasca**: E1-US2-T3
**Data**: 2026-05-01

---

## 1. Fonaments d'Ethereum

### 1.1. Costos de _gas_

A Ethereum, cada operació computacional consumeix una quantitat de **_gas_**, la unitat de mesura del cost de càlcul. El preu del _gas_ es denomina en _gwei_ (un miliardèsim d'ETH) i varia dinàmicament en funció de la demanda de la xarxa: quan hi ha congestió, el cost pot multiplicar-se per deu o per cent en qüestió de minuts.

Amb EIP-1559 (desplegat l'agost de 2021), la tarifa es divideix en dues parts. Una **_base fee_** determinada automàticament per la xarxa i cremada per sempre (destruïda, no va a cap miner). Un **_priority fee_** (o _tip_) que el remitent afegeix voluntàriament per incentivar els validadors a incloure la seva transacció aviat.

Una transacció senzilla d'ETH costa 21.000 unitats de _gas_. Una crida a un _smart contract_ complex pot costar entre 100.000 i diversos milions. A preu de _gas_ alt (50-200 _gwei_), operacions habituals com la verificació d'una prova zk-SNARK poden costar entre 1 € i 50 € per transacció. Per a un sistema de votació amb milions de vots, aquest cost fa inviable executar la lògica electoral directament a la L1 d'Ethereum.

### 1.2. Temps de bloc i finalització

Ethereum produeix un bloc cada **12 segons** (des de la Merge, setembre de 2022). Però un bloc confirmat no és un bloc final: la cadena pot reorganitzar-se si es produeix una bifurcació temporal.

La **finalitat** a Ethereum es produeix amb el protocol **Gasper** (LMD-GHOST + Casper FFG). Un _checkpoint_ (cada 32 blocs, uns 6,4 minuts) es considera finalment "justificat" quan dos terços dels validadors hi estan d'acord, i "finalitzat" al següent _checkpoint_. La finalitat econòmica completa tarda entre **12 i 15 minuts** des que s'inclou una transacció.

Comparat amb Algorand, que finalitza cada bloc en **~3,5 segons** amb finalitat immediata i irreversible (cap reorganització possible), el temps de finalitat d'Ethereum és entre 200 i 250 vegades superior. Per a un procés electoral on cada vot ha de quedar confirmat de manera definitiva, aquesta latència és acceptable per a l'ancoratge ocasional, però no per al flux de vots en temps real.

### 1.3. Cadenes públiques vs. privades

| Dimensió | Cadena pública (Ethereum/Algorand) | Cadena privada (permissionada) |
|---|---|---|
| Control d'accés | Obert, qualsevol pot llegir i escriure | Restringit a membres del consorci |
| Verificació independent | Immediata, sense permís | Requereix accés al consorci |
| Cost d'atac al consens | Milers de milions d'euros (L1) | Pressió política sobre uns pocs nodes |
| Manteniment | Inexistent (la xarxa ja existeix) | Continu i costós |
| Transparència | Total i pública | Limitada als membres |
| Finalitat | Determinada pel protocol (de 3,5 s a 15 min) | Configurada pel consorci |

Ethereum, com a cadena pública, ofereix el màxim de transparència i la verificació independent sense barreres. Qualsevol organisme internacional pot comprovar qualsevol transacció sense demanar permís a ningú. El preu d'aquest avantatge és el cost del _gas_ i la latència de finalitat.

---

## 2. Per què el projecte utilitza Ethereum únicament per a l'ancoratge

### 2.1. La decisió central: Algorand per a la votació, Ethereum per al rastre

El projecte adopta **Algorand** com a capa d'execució de tota la lògica electoral (vots, _nullifiers_, agregació homomòrfica, verificació de proves zk-SNARK, desxifrat dels _trustees_). La justificació detallada es desenvolupa a l'ADR 002. En resum: Algorand ofereix finalitat en 3,5 s, comissions de l'ordre de 0,001 ALGO (~0,0002 €), i les primitives criptogràfiques BN254 necessàries per a Groth16.

Ethereum entra en escena per a una funció molt concreta i diferent: **ancorar proves d'integritat** dels resultats electorals en una xarxa de màxima difusió i reconeixement institucional global.

### 2.2. Quin és el rol de l'ancoratge

Quan una elecció es tanca i el recompte queda definitiu, es genera un **_digest_ criptogràfic** (un _hash_ SHA-256 o Poseidon) de tot l'estat electoral: els _ciphertexts_ agregats, les _shares_ dels _trustees_, el resultat en clar, i el guanyador. Aquest _digest_ s'envia en una transacció cap a un contracte d'Ethereum (o simplement a l'espai de dades d'una transacció normal).

El resultat: existeix un registre permanent a Ethereum que diu, essencialment, "el dia D a l'hora H, l'elecció amb ID X tenia aquest _hash_ de resultat". Ningú pot alterar l'estat d'Algorand retroactivament per fabricar un resultat diferent sense que el _hash_ d'Ethereum deixi de coincidir.

### 2.3. Per què no tornem a executar l'elecció a Ethereum

Executar la lògica completa de votació a Ethereum és inviable per cinc raons estructurals:

**Cost de _gas_ prohibitiu.** La verificació d'una prova Groth16 a Ethereum costa al voltant de 250.000 unitats de _gas_. A 50 _gwei_ i 3.000 $/ETH, cada vot costaria ~37,50 $. Per 100.000 votants: 3.750.000 $. Per als mateixos votants a Algorand: ~20 $. La diferència és de sis ordres de magnitud.

**Latència de finalitat inadequada.** Una elecció ha d'oferir als votants confirmació immediata que el seu vot s'ha registrat. A Ethereum, la finalitat econòmica tarda 12-15 minuts. A Algorand, 3,5 segons. Durant una finestra electoral de 24 hores amb pics de trànsit, la cua de confirmació d'Ethereum es convertiria en un coll d'ampolla.

**Primitives criptogràfiques.** Algorand té opcodes natius per a BN254 (la corba que necessita Groth16). Ethereum també té precompilats BN254 (EIP-197), però la integració amb les _boxes_ de gestió de _nullifiers_ i el _fee pooling_ atòmic per als _sponsors_ és molt més natural al model d'Algorand.

**Cost d'infraestructura per als votants.** A Ethereum, cada votant hauria de pagar _gas_ directament (el mecanisme de patrocini atòmic d'Algorand no existeix a Ethereum de manera equivalent i simple). Delegar el pagament a un _relayer_ introdueix un intermediari de confiança addicional.

**Sobirania electoral i risc de regulació.** Ethereum és la xarxa _smart contract_ més gran del món i, per tant, la més exposada a pressions regulatòries de grans potències. La dependència d'Ethereum per a l'execució de la lògica electoral concentraria el risc polític en un actor únic. Per a l'ancoratge, aquest risc és acceptable: un _hash_ és immutable un cop escrit, i si Ethereum patís una crisi, el registre ja existeix.

### 2.4. L'ancoratge com a pont de confiança institucional

Hi ha una raó no tècnica però important: **la reconeixibilitat institucional d'Ethereum**. Quan una elecció produeix un resultat i l'ancora a Ethereum, qualsevol auditor extern, fins i tot sense conèixer Algorand, pot verificar el _hash_ a Etherscan o a qualsevol explorador públic. La verificació del resultat es torna accessible a actors que no formin part de l'ecosistema Algorand.

Algorand és la infraestructura tècnicament superior per a l'execució. Ethereum és el registre notarial global que el món institucional reconeix. El disseny aprofita el millor de cada cadena sense duplicar els costos de cap.

---

## Resum

| Aspecte | Ethereum (ancoratge) | Algorand (execució) |
|---|---|---|
| Funció en el sistema | Registre notarial de resultats finals | Execució completa de la lògica electoral |
| Cost per operació | 1–50 € (per ancoratge ocasional: acceptable) | ~0,0002 € (per cada vot: negligible) |
| Temps de finalitat | 12-15 minuts | 3,5 segons |
| Operacions per elecció | 1 (ancorar el _digest_ final) | Milions (un per vot) |
| Primitives zk-SNARK | Precompilats BN254 (EIP-197) | Opcodes BN254 natius |
| Reconeixibilitat institucional | Màxima (global) | Alta però menor |

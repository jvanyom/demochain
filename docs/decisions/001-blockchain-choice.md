# ADR 001 — Elecció de la plataforma _blockchain_

**ID de l'_spike_**: E1-SP1
**Data**: 2026-05-01
**Estat**: Acceptada

---

## Context

Hem de triar sobre quina plataforma _blockchain_ construir el MVP d'un sistema de votació descentralitzada, permissionada, de baix cost i alt rendiment. Els requisits principals que guien la decisió:

- **Equip petit d'estudiants** amb un horitzó de 3 mesos per al MVP, tots amb experiència en Python però sense experiència prèvia en _blockchain_.
- **Baix cost per transacció**: cada vot ha de tenir un cost negligible o zero per al votant.
- **Alt rendiment**: cal poder processar desenes o centenars de milers de vots sense saturar la xarxa.
- **_Smart contracts_ programables en Python**: l'equip treballa en Python i no vol introduir un segon llenguatge per als contractes.
- **_Smart contracts_ verificables**: el sistema ha de poder executar lògica de verificació de proves criptogràfiques (zk-SNARKs) directament en cadena.
- **Finalitat ràpida i irreversible**: un vot confirmat no ha de poder ser revertit.
- **Ecosistema i documentació accessibles** per a un equip sense experiència prèvia en _blockchain_.

Les plataformes candidates analitzades:

1. **Algorand**
2. **Ethereum L1**
3. **Ethereum L2** (Arbitrum, Optimism, zkSync, Polygon)
4. **Polkadot**
5. **Solana**

---

## Opcions analitzades

### Opció A — Algorand

Algorand és una _blockchain_ de capa 1 que utilitza el protocol de consens _Pure Proof-of-Stake_ (PPoS). Els seus trets diferencials:

- **Finalitat de bloc en ~3,5 segons**, sense possibilitat de reorganització de la cadena. Un vot confirmat no es pot revertir mai.
- **Comissió mínima de 0,001 ALGO** per transacció (~0,0001 € a preus de 2026), amb mecanisme nadiu de _fee pooling_ que permet esponsoritzar les comissions del votant dins un grup de transaccions atòmiques. El votant pot votar de manera gratuïta.
- **PyTEAL i AVM (Algorand Virtual Machine)**: el llenguatge de _smart contracts_ és de baix nivell però ben documentat, amb eines com AlgoKit que abstrauen bona part de la complexitat.
- **Operacions BN254 natives a l'AVM**: la màquina virtual d'Algorand incorpora operacions específiques per verificar zk-SNARKs Groth16 sobre la corba BN254, requisit crític per al nostre sistema de privacitat criptogràfica.
- **_Boxes_ (emmagatzematge de clau-valor per contracte)**: Algorand ofereix un mecanisme estàndard d'emmagatzematge persistent per als _smart contracts_, adequat per guardar _nullifiers_ i _ciphertexts_ de vots individuals.
- **Capacitat de ~6.000 tr/s** a la xarxa pública; suficient per a eleccions d'escala mitjana.
- **AlgoKit**: conjunt d'eines oficial d'Algorand Foundation que permet muntar un entorn de desenvolupament local (_LocalNet_) en minuts i genera _scaffolding_ de projectes amb tests integrats.

### Opció B — Ethereum L1

Ethereum és la _blockchain_ de _smart contracts_ més madura i amb l'ecosistema més gran.

- **Finalitat de bloc**: tècnicament garantida al cap de ~15 minuts (dues _epochs_ de Casper). Fins llavors hi ha probabilitat de reorganització. Per a un sistema de votació que vol certesa immediata, és un inconvenient.
- **Comissions (_gas_)**: extremadament variables i elevades en períodes de congestió. Una transacció complexa amb verificació de zk-SNARK pot costar 10–50 € en moments d'alta activitat. Completament inviable per a un sistema on el votant no ha de pagar.
- **Ecosistema**: molt madur. Solidity és el llenguatge més documentat. Hi ha biblioteques específiques per a sistemes de votació (OpenZeppelin, etc.).
- **Primitives ZK**: Ethereum EIP-196/197 suporten la corba BN254 i verificació de Groth16. El suport tècnic existeix, però el cost en _gas_ de la verificació és prohibitiu a L1.

### Opció C — Ethereum L2

Les solucions de capa 2 (Arbitrum, Optimism, zkSync, Polygon zkEVM) executen transaccions fora de la cadena principal i periòdicament publiquen proves o _batches_ a Ethereum L1.

- **Comissions molt reduïdes**: de l'ordre de cèntims o fraccions de cèntim per transacció, comparables a Algorand.
- **Finalitat**: les transaccions en L2 es confirmen ràpidament (segons), però la "finalitat definitiva" que hereta la seguretat d'Ethereum L1 pot trigar minuts o hores, depenent del tipus de L2 (_optimistic rollup_ vs. _zk-rollup_).
- **Ecosistema fragmentat**: hi ha múltiples L2 incompatibles entre si. Cal escollir-ne una concretament, amb el risc que quedi obsoleta o que la liquiditat es concentri en una altra.
- **Complexitat afegida**: un equip petit que ha d'aprendre l'ecosistema Ethereum, _Solidity_, i a més les particularitats d'una L2 específica, acumula molta superfície d'aprenentatge per a un MVP de 3 mesos.
- **_Bridging_ i liquiditat**: les eines per finançar comptes de votants a una L2 específica afegeixen fricció operativa.

### Opció D — Polkadot

Polkadot és un ecosistema de _relay chain_ amb _parachains_ especialitzades.

- **Model de _parachain_**: per desplegar-hi un sistema propi caldria o bé llogar una _parachain_ (costos elevats i procés complex) o bé usar una _parachain_ existent com _Moonbeam_ (compatible EVM) o _Astar_.
- **Comissions i rendiment**: variables segons la _parachain_ triada. En general adequades, però afegeixen una capa d'abstracció addicional.
- **Curva d'aprenentatge molt alta**: Substrate/Rust per a _parachains_ pròpies, o bé la complexitat de l'ecosistema Polkadot per a _parachains_ de tercers. No adequat per a un equip petit amb 3 mesos.
- **Finalitat de bloc**: comparable a Ethereum (~12-60 segons per a finalitat definitiva al _relay chain_).
- **Suport per a zk-SNARKs**: inexistent de manera nativa. Caldria implementar-lo al nivell de la _parachain_, cosa que escapa clarament de l'abast d'un MVP.

### Opció E — Solana

Solana és una _blockchain_ L1 de molt alt rendiment.

- **Rendiment**: ~65.000 tr/s teòriques, unes 2.000-3.000 en producció real. El millor de les opcions analitzades.
- **Comissions molt baixes**: de l'ordre de 0,000005 SOL per transacció (~0,001 € a preus de 2026).
- **Finalitat de bloc**: ~0,4 segons per confirmació optimista, finalitat probabilística. Solana ha patit diverses aturades de la xarxa en producció (2021-2023), cosa que no és acceptable per a un sistema electoral.
- **Model de programació (_Sealevel_, Rust/Anchor)**: molt diferent de l'EVM i d'Algorand. La corba d'aprenentatge és alta per a un equip sense experiència en Solana. El model de comptes és complex.
- **Suport per a zk-SNARKs**: no hi ha suport natiu equivalent al BN254 d'Algorand. Caldria implementar la verificació dins el programa Solana, amb limitacions d'instruccions per transacció (_compute units_).
- **Historial de fiabilitat**: les aturades de xarxa (almenys 5 majors documentades) fan que no sigui una base adequada per a infraestructura electoral crítica.

---

## Anàlisi comparativa

| Dimensió | Algorand | Ethereum L1 | Ethereum L2 | Polkadot | Solana |
|---|---|---|---|---|---|
| Comissió per vot | ~0,0001 € | ~0,35 € | ~0,001 € | Variable | ~0,001 € |
| _Fee sponsorship_ natiu | Sí (atòmic) | No | No | No | No |
| Finalitat de bloc | ~3,5 s (definitiva) | ~15 min | Segons / hores | ~12-60 s | ~0,4 s (no definitiva) |
| zk-SNARK BN254 natiu | Sí (a l'AVM) | Sí (EIP-196/197) | Sí (hereta Ethereum) | No | No |
| Historial de fiabilitat | Alt | Molt alt | Alt | Alt | Baix (aturades) |
| Corba d'aprenentatge equip petit | Moderada (AlgoKit) | Alta (Solidity) | Molt alta (L2 + Solidity) | Molt alta (Substrate) | Alta (Anchor/Rust) |
| Eines per a MVP ràpid | Molt bones (AlgoKit) | Bones (Hardhat) | Bones però complexes | Pobres | Moderades (Anchor) |
| Rendiment (tr/s) | ~6.000 | ~15 | ~1.000–10.000 | Variable | ~2.000–3.000 |
| Risc de xarxa per a electoral | Molt baix | Molt baix | Baix | Baix | Alt |

---

## Factors decisius

### 1. Finalitat immediata i irreversible

Un sistema de votació exigeix la màxima certesa possible que un vot no es pugui revertir o reorganitzar. Algorand és l'única plataforma de les analitzades que ofereix **finalitat de bloc definitiva i immediata (~3,5 s)** per disseny del protocol. Ethereum L1 requereix esperar 15 minuts. Les L2 _optimistic rollups_ (Arbitrum, Optimism) afegeixen un període de 7 dies de possible disputació. Solana no té finalitat determinista provada en producció.

### 2. _Fee sponsorship_ natiu per a vot gratuït

El requisit de que el votant no pagui comissions és crític. Algorand és l'única plataforma amb un mecanisme **natiu i atòmic** per esponsoritzar comissions: el _fee pooling_ dins grups de transaccions atòmiques permet que una entitat patrocinadora cobreixi les comissions de la transacció del votant sense que el votant ni tan sols sàpiga que existeix la _blockchain_. A cap altra plataforma analitzada existeix un mecanisme equivalent amb les mateixes garanties d'atomicitat.

### 3. zk-SNARK BN254 natiu a l'AVM

El sistema de privacitat requereix verificació de proves Groth16 sobre BN254 directament en cadena. Algorand ha incorporat les operacions `ec_add`, `ec_scalar_mul` i `ec_pairing` sobre BN254 com a _opcodes_ natius de l'AVM, cosa que fa factible la verificació dins el _smart contract_ sense costos prohibitius. Ethereum L1 té suport equivalent via EIP-196/197, però el cost en _gas_ és prohibitiu. Polkadot i Solana no disposen de suport natiu equivalent.

### 4. Velocitat de desenvolupament del MVP

AlgoKit proporciona: generació de projectes amb _scaffolding_, entorn _LocalNet_ configurable en minuts, client TypeScript autogenerat, i tests d'integració sobre _LocalNet_ amb Pytest. Per a un equip petit amb 3 mesos, aquesta productivitat és decisiva. Cap altra plataforma ofereix un ecosistema de desenvolupament comparable per a MVP ràpids de _smart contracts_.

### 5. Fiabilitat per a infraestructura electoral

Algorand no ha patit cap aturada de xarxa documentada des de la seva posada en marxa el 2019. Solana ha patit almenys 5 aturades majors documentades. La fiabilitat és un requisit no negociable per a un sistema electoral.

---

## Decisió

**S'adopta Algorand com a plataforma _blockchain_ per al MVP del sistema de votació.**

Els arguments definitius:

1. És l'única plataforma que compleix simultàniament: finalitat de bloc definitiva, _fee sponsorship_ natiu, i suport BN254 natiu per a zk-SNARKs.
2. L'ecosistema AlgoKit minimitza el temps fins al primer MVP funcional, crític per a un equip petit.
3. El seu historial de fiabilitat és el millor de les opcions considerades.
4. El cost operatiu per a unes eleccions de desenes de milers de votants és pràcticament zero.

---

## Conseqüències

### Positives

- Es pot construir el MVP en 3 mesos amb un equip petit gràcies a AlgoKit.
- Els vots dels ciutadans son gratuïts gràcies al _fee sponsorship_ atòmic.
- La privacitat criptogràfica és factible gràcies al suport BN254 natiu.
- La finalitat immediata garanteix la irreversibilitat dels vots sense esperes.

### Negatives i riscos

- **Dependència d'Algorand Inc.**: el protocol és obert i es pot fer _fork_, però les actualitzacions depenen de la Fundació Algorand. Mitigació: el codi és obert.
- **Ecosistema menys madur que Ethereum**: menys biblioteques de tercers, menys talent disponible, menys tutorials. Mitigació: AlgoKit i la documentació oficial cobreixen els casos d'ús del MVP.
- **Escalabilitat limitada per a eleccions nacionals** (milions de votants en un sol dia). Mitigació: documentada a l'ADR 002 (_sharding_ per circumscripció i _zk-rollups_ com a evolució futura).


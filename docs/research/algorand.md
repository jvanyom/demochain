# Algorand — Resum tècnic d'incorporació
> **Tasca:** E1-US1-T3 · **Font:** [dev.algorand.co](https://dev.algorand.co)  

---

## 1. Smart Contracts

Un smart contract és un programa desplegat a la blockchain que rep un **Application ID** únic. Un cop desplegat, qualsevol client el pot cridar per aquest ID. És el concepte central al voltant del qual giren la resta d'elements d'aquest document.

Tot contracte té sempre dos programes:

- **ApprovalProgram** — gestiona totes les crides (`NoOp`, `OptIn`, `CloseOut`, `Update`, `Delete`). Ha de retornar un valor no zero per aprovar.
- **ClearStateProgram** — gestiona `ClearState`. **Sempre s'executa** encara que falli, i elimina l'estat local de l'account incondicionalment.

En Algorand Python, s'escriu estenent `ARC4Contract`. El compilador **PuyaPy** genera el routing i ambdós programes automàticament. Els mètodes públics s'anoten amb `@abimethod`; els interns amb `@subroutine`.

```python
from algopy import ARC4Contract, GlobalState, UInt64
from algopy.arc4 import abimethod

class Counter(ARC4Contract):
    def __init__(self) -> None:
        self.count = GlobalState(UInt64(0))

    @abimethod
    def increment(self) -> None:
        self.count.value += UInt64(1)
```

### Lifecycle

| Acció | OnComplete | Notes |
|---|---|---|
| **Create** | `NoOp` sense AppId | Assigna Application ID; defineix els schemas d'storage. |
| **NoOp** | `NoOp` | Crida genèrica, executa la lògica. |
| **OptIn** | `OptIn` | Un account comença a participar; activa l'storage local. |
| **CloseOut** | `CloseOut` | Sortida ordenada; pot fallar si el contracte ho rebutja. |
| **ClearState** | `ClearState` | Sempre té èxit; elimina l'estat local de l'account. |
| **Update** | `UpdateApplication` | Substitueix Approval i Clear per una versió nova. |
| **Delete** | `DeleteApplication` | Elimina el contracte. Cal esborrar totes les boxes abans o el MBR queda bloquejat. |

---

## 2. Comptes (Accounts)

Un **compte d'Algorand** és una entitat que pot mantenir saldos, signar transaccions i interactuar amb smart contracts. Es basa en un parell de claus criptogràfiques Ed25519:

- **Clau privada** — s'ha de mantenir secreta; s'usa per signar transaccions.
- **Clau pública / adreça** — cadena de 58 caràcters compartida públicament.

### Tipus de comptes

| Tipus | Descripció |
|---|---|
| **Standalone** | Parell adreça/clau privada no persistent a disc; representat com a mnemònic de 25 paraules. |
| **KMD (Key Management Daemon)** | Procés del node que gestiona wallets i permet derivar múltiples comptes d'una master key. No recomanat per a producció. |
| **HD Wallet (ARC-0052)** | Wallet Hierarchical Deterministic: múltiples comptes des d'una sola seed. |
| **Compte de contracte** | Adreça derivada d'un smart contract desplegat. Rep i envia Algos com qualsevol altre compte. |
| **Multisig** | Requereix `M de N` signatures per autoritzar transaccions. |

Per defecte, els comptes estan **offline** (no participen en el consens). Per participar i optar als staking rewards (a partir de la v4.0), cal generar una clau de participació i enviar una transacció especial de registre, incloent una comissió de 2 Algos.

---

## 3. Transaccions

Totes les transaccions tenen la mateixa comissió mínima base: **1.000 microAlgos**, independent del tipus.

| Tipus | Codi | Ús principal |
|---|---|---|
| **Payment** | `pay` | Transferència d'Algos entre comptes. |
| **Asset Transfer** | `axfer` | Transferència d'ASAs (Algorand Standard Assets). |
| **Asset Opt-in** | `axfer` (amount=0) | Un compte s'apunta a rebre un ASA concret. |
| **Asset Opt-out** | `axfer` + `aclose` | Elimina el holding d'un ASA de l'account. |
| **Application Call** | `appl` | Crida a un smart contract (NoOp, OptIn, CloseOut, ClearState, Create, Update, Delete). |
| **Key Registration** | `keyreg` | Registra o elimina claus de participació al consens. |

**Atomic groups:** fins a 16 transaccions agrupades que s'executen totes o cap. Eina clau per a operacions DeFi i contractes complexos.

**Inner transactions:** els smart contracts poden emetre les seves pròpies transaccions durant l'execució (p. ex., enviar Algos a un usuari). S'accedeix des del codi via `itxn`.

---

## 4. Emmagatzematge on-chain

Els smart contracts disposen de tres tipus d'storage persistent. El nombre de parells global i local **s'ha de declarar en la creació i no es pot modificar** després. PuyaPy els inclou automàticament al fitxer ARC-32/ARC-56.

| Tipus | Àmbit | Límits | Com es declara |
|---|---|---|---|
| **Global** | Contracte | 64 parells clau-valor, 8 KB totals | `self.var = GlobalState(...)` a `__init__` |
| **Local** | Account + contracte (requereix OptIn) | 16 parells, 128 bytes/parell | `self.var = LocalState(...)` a `__init__` |
| **Box** | Contracte | Fins a 32 KB/box, sense límit de boxes | `Box`, `BoxMap` o `BoxRef` |

### Boxes en detall

Les boxes superen els límits de l'storage global/local per a dades grans o dinàmiques. Restriccions clau:

- Claus d'1–64 bytes, úniques per app; mida de 0 a 32 KB per box.
- Màxim **8 referències per transacció** (cada referència cobreix 1.024 bytes; boxes >1 KB necessiten referències addicionals).
- Només accessibles des de l'**ApprovalProgram**, no des del ClearStateProgram.
- Si s'elimina l'app sense esborrar les boxes, el MBR associat **queda bloquejat permanentment**.

Abstraccions Python: `Box` (valor únic), `BoxMap` (grup amb prefix de clau), `BoxRef` (bytes crus).

**Cost MBR per box:** `2.500 + 400 × (len(clau) + mida)` microAlgos. Exemple: clau `"BoxA"` (4 bytes) + 1.024 bytes → **+413.700 microAlgos**.

---

## 5. ARC-4 i Structs

**ARC-4** és l'estàndard ABI d'Algorand. Defineix els tipus de dades que es poden usar en contractes i com s'han de codificar en binari. Estendre `ARC4Contract` fa el contracte ARC-4 compatible i genera el routing automàticament via PuyaPy. Sense ARC-4, cal estendre `BaseContract` i gestionar el routing manualment.

### Structs

Els Structs ARC-4 són **named tuples** declarats com a classes Python. Els camps s'accedeixen pel nom, no per índex.

```python
class SaleKey(arc4.Struct, frozen=True):
    owner: arc4.Address
    asset: arc4.UInt64
```

- `frozen=True` — l'struct és immutable; no cal cridar `.copy()` en assignar-lo.
- Sense `frozen` — el compilador força `.copy()` en cada nova referència per preservar la semàntica de l'AVM stack.
- Els Structs no tenen propietat `.native`, però un `NamedTuple` sí que es pot usar en mètodes ABI i es codifica/descodifica automàticament.

### Codificació ARC-4

Contenidors = **head + tail**. Arrays dinàmics porten la longitud (16 bits) al head. Ítems de mida fixa (`Bool`, `UIntN`, `StaticArray`) van al head. Booleans consecutius es compressen a 1 bit cadascun.

---

## 6. Saldo Mínim (MBR)

El MBR és un **dipòsit proporcional a l'espai ocupat** a la blockchain. Qualsevol transacció que deixi el compte per sota falla. Augmenta quan un compte o contracte adquireix recursos, i disminueix quan els allibera.

| Concepte | Cost addicional |
|---|---|
| Compte base | **100.000 microAlgos** (0,1 Algo) |
| Cada ASA creat o en possessió | +100.000 microAlgos |
| Cada app creada o opt-in | Variable segons schema declarat |
| Box de nom `n` i mida `s` | +`2.500 + 400 × (len(n) + s)` microAlgos |

> **Regla pràctica:** `0,1 Algo × (1 + nº ASAs únics)` per a un compte sense contractes ni boxes.

- El MBR d'un opt-in **augmenta abans** que s'executi el codi del contracte, de manera que l'increment ja és visible dins la lògica del programa.
- Per tancar un compte completament, primer cal fer opt-out de tots els ASAs i llavors usar `CloseRemainderTo` al pagament final.
- **AlgoKit Utils** ofereix `ensureFunded` per gestionar el finançament automàtic en entorns de test i CI/CD.

---

## 7. AlgoKit

**AlgoKit** és el toolkit oficial d'Algorand per a Python. Agrupa CLI, utilitats i generadors per anar de zero a desplegament en minuts.

| Component | Descripció |
|---|---|
| **AlgoKit CLI** | `algokit init` / `deploy` / `localnet start` / `task` / `doctor` |
| **AlgoKit Utils (Python)** | `AlgorandClient` com a punt d'entrada; gestió de comptes, transaccions i testing. |
| **Algorand Python** | Python tipat que compila a AVM. No cal aprendre TEAL. |
| **Client Generator** | Genera clients Python type-safe a partir del fitxer ARC-32 del contracte. |

Plataformes: macOS / Windows / Linux x64 (ARM no suportat). Verificació: `algokit --version`.

```bash
algokit init           # Crea un nou projecte (tria template)
algokit localnet start # Arrenca una xarxa local
algokit deploy         # Desplega el contracte
algokit task           # Operacions on-chain (signar, enviar, crear ASAs...)
```

---

## Recursos de referència

- Portal: [dev.algorand.co](https://dev.algorand.co)
- Smart Contracts: [dev.algorand.co/concepts/smart-contracts/apps](https://dev.algorand.co/concepts/smart-contracts/apps/)
- Comptes: [dev.algorand.co/concepts/accounts/overview](https://dev.algorand.co/concepts/accounts/overview/)
- Transaccions: [dev.algorand.co/concepts/transactions/types](https://dev.algorand.co/concepts/transactions/types/)
- Emmagatzematge: [dev.algorand.co/concepts/smart-contracts/storage/overview](https://dev.algorand.co/concepts/smart-contracts/storage/overview/)
- Box Storage: [dev.algorand.co/concepts/smart-contracts/storage/box](https://dev.algorand.co/concepts/smart-contracts/storage/box/)
- ARC-4 (Python): [dev.algorand.co/algokit/languages/python/lg-arc4](https://dev.algorand.co/algokit/languages/python/lg-arc4/)
- AlgoKit: [dev.algorand.co/algokit/algokit-intro](https://dev.algorand.co/algokit/algokit-intro/)
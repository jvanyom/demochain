# MVP de desplegament distribuït (TestNet + Sepolia)

Aquest document descriu com aixecar Demochain en una configuració distribuïda
on cada universitat opera el seu propi servei d'ancoratge, contra Algorand
TestNet i Sepolia. És el pas intermedi entre el LocalNet (tot en un host) i
una hipotètica producció amb identitat federada i privacitat criptogràfica.

## Arquitectura

```
Algorand TestNet                       Ethereum Sepolia
   ┌───────────────┐                      ┌──────────────────┐
   │  Demochain    │                      │  NotaryContract  │
   │   APP_ID=N    │                      │     0xABC...     │
   └───────┬───────┘                      └─────────▲────────┘
           │ llegeix paperetes                      │ submitHash()
           │                                        │
   ┌───────┴────────┐  ┌────────────────┐  ┌────────┴──────────┐
   │ Anchoring UIB  │  │ Anchoring UPC  │  │ Anchoring UAB     │
   │  (servidor 1)  │  │  (servidor 2)  │  │  (servidor 3)     │
   └────────────────┘  └────────────────┘  └───────────────────┘
```

Les universitats no es comuniquen entre elles directament: el consens
*K-of-N* s'aconsegueix on-chain quan K nodes envien el mateix hash al
NotaryContract.

## Pas 1 — Desplegament dels contractes (administrador central)

### Algorand TestNet

Des de `voting-contract/projects/demochain/`:

```bash
# .env del repositori amb les credencials del creador a TestNet
export ALGOD_SERVER=https://testnet-api.algonode.cloud
export ALGOD_PORT=443
export ALGOD_TOKEN=
export DEPLOYER_MNEMONIC="..."   # 25 paraules d'un compte amb >1 ALGO

algokit project deploy testnet
```

El log final inclou una línia `Deployed Demochain with app_id=<N>`. Aquest
és el `DEMOCHAIN_APP_ID` que cal distribuir a cada universitat.

### Sepolia

Des de `network/ethereum/`:

```bash
export ETHEREUM_RPC_URL=https://sepolia.infura.io/v3/<KEY>
export NOTARY_ADMIN_PRIVATE_KEY=0x...     # compte admin finançat amb ETH de Sepolia
export UNIVERSITY_ADDRESSES=0xUIB...,0xUPC...,0xUAB...

npx hardhat run scripts/deploy_testnet.js --network sepolia
```

El script:

1. Desplega `NotaryContract` amb el compte admin com a propietari.
2. Crida `addUniversity(addr)` per a cada adreça a `UNIVERSITY_ADDRESSES`.
3. Imprimeix `NOTARY_CONTRACT_ADDRESS=0x...`.

Cal distribuir aquesta adreça a cada universitat juntament amb el
`DEMOCHAIN_APP_ID` d'Algorand.

## Pas 2 — Generació de claus universitàries

Cada universitat ha de generar la seva pròpia parella de claus Ethereum.
Una manera segura amb `cast` (de Foundry):

```bash
cast wallet new
# Address: 0x...
# Private key: 0x...
```

L'**adreça** s'envia a l'administrador per ser registrada amb `addUniversity`.
La **clau privada** es queda al servidor de la universitat i mai surt d'allà.

L'administrador ha de finançar cada adreça amb una mica d'ETH de Sepolia
(faucets de Cloudflare, Alchemy o Infura). Una transacció d'ancoratge costa
aproximadament 100 000 gas; 0,01 ETH dura centenars d'eleccions.

## Pas 3 — Aixecament del node per universitat

Al servidor de la universitat (qualsevol Linux/macOS amb Docker):

```bash
git clone https://github.com/jvanyom/demochain.git
cd demochain
cp .env.prod.example .env.prod
$EDITOR .env.prod   # omplir UNIVERSITY_ID, DEMOCHAIN_APP_ID,
                    # NOTARY_CONTRACT_ADDRESS, ETHEREUM_RPC_URL,
                    # UNI_ETH_PRIVATE_KEY
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml logs -f anchoring
```

El dimoni:

- Es connecta a Algorand TestNet i n'enumera les propostes registrades.
- Per a cada proposta amb `ending_date < now`, comprova si aquesta universitat
  ja n'ha enviat el hash al NotaryContract (`getSubmission`).
- Si no, calcula el hash determinista i el submiteix a Sepolia.
- Dorm `POLL_INTERVAL_SEC` segons i torna a començar.

La idempotència és nativa a la cadena: el dimoni es pot reiniciar en
qualsevol moment sense risc de doble submissió.

## Pas 4 — Verificació del consens

Quan K dels N nodes han enviat el mateix hash, el NotaryContract emet l'event
`ResultAnchored(electionId, resultHash, confirmations)` i marca l'elecció com
ancorada. Es pot consultar per la web:

```
https://sepolia.etherscan.io/address/<NOTARY_CONTRACT_ADDRESS>#events
```

O programàticament:

```javascript
await notary.isElectionAnchored("proposta-42")  // true / false
```

## Limitacions conegudes de l'MVP

- **Claus a env vars**: per a producció real caldria un HSM o un gestor
  de secrets (AWS KMS, GCP Secret Manager, HashiCorp Vault).
- **Admin únic del NotaryContract**: per a producció real caldria un
  multi-sig (Gnosis Safe) amb un signant per universitat fundadora.
- **Vots públics**: tothom pot veure qui ha votat què a Algorand TestNet.
  La privacitat (ElGamal + zkSNARK) queda fora d'aquest MVP (vegeu E3/E4 al
  *backlog*).
- **Identitat per adreça**: el cens es manté per adreça Algorand sense
  vinculació amb identitats institucionals. La integració amb un IdP
  queda fora d'aquest MVP (vegeu E5/E6 al *backlog*).
- **TestNet inestable**: Algorand TestNet pot rebre reinicis ocasionals
  que invalidarien l'`APP_ID`. Caldria un redesplegament. Sepolia és
  més estable però els fons de faucet poden ser costosos d'obtenir.

## Resolució de problemes habituals

| Símptoma | Causa probable |
|----------|----------------|
| `cannot reach algod` | Firewall corporatiu bloqueja `algonode.cloud` o endpoint mal escrit |
| `admin account has 0 balance` (deploy Sepolia) | Falta finançar amb faucet abans del deploy |
| `NotaryContract: not authorized` | L'adreça d'aquesta universitat no s'ha registrat amb `addUniversity` |
| Cap proposta es detecta | El `DEMOCHAIN_APP_ID` apunta a un altre contracte o a una xarxa diferent |

# Demochain 🗳️

[![Algorand](https://img.shields.io/badge/Algorand-Blockchain-black?style=for-the-badge&logo=algorand)](https://www.algorand.com/)
[![Ethereum](https://img.shields.io/badge/Ethereum-Anchoring-3C3C3D?style=for-the-badge&logo=ethereum)](https://ethereum.org/)
[![React](https://img.shields.io/badge/React-UI-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker)](https://www.docker.com/)

**Demochain** és un sistema de votació descentralitzat de propòsit general, construït sobre la xarxa blockchain d'Algorand (xarxa permissionada) i ancorat periòdicament a la xarxa pública d'Ethereum per actuar com a notari. Aquesta arquitectura permet assolir velocitat de transacció, costos baixos i verificabilitat pública total.

---

## Què és Demochain?

Els sistemes de votació electrònica convencionals pateixen del problema del punt únic de confiança. Demochain soluciona aquest problema descentralitzant el recompte i l'emmagatzematge dels vots.

### Com funciona a la pràctica?

La base del sistema permet crear organitzacions autònomes on un administrador s'encarrega de mantenir el cens de votants autoritzats. Per facilitar la feina amb grups grans, el cens es pot carregar completament de cop mitjançant un fitxer CSV de manera transparent.

Dins d'aquestes organitzacions, els usuaris tenen la llibertat de llançar propostes. Aquestes iniciatives passen primer per una fase d'aprovació comunitària i només avancen a la fase de votació si assoleixen el suport de dos terços de la comunitat. Un cop l'elecció està oberta, Demochain aposta per la votació preferencial: en lloc de triar només una opció, els votants les ordenen segons la seva preferència. Per trobar la decisió més justa, el sistema aplica l'algorisme matemàtic de Schulze resolent qualsevol possible empat amb el mètode de Floyd-Warshall.

El més rellevant és la transparència absoluta del procés. Qualsevol persona pot accedir a la xarxa i auditar públicament el vot associat a qualsevol adreça sense necessitat de tenir cap permís. A més a més, un cop finalitza una elecció, s'activa un sistema de seguretat on diversos nodes independents calculen un hash exacte de l'estat d'Algorand i l'envien a un contracte intel·ligent a Ethereum, blindant el resultat contra qualsevol manipulació.

---

## Desplegament i execució

Tot l'entorn local de Demochain es desplega de manera reproducible utilitzant Docker. 

L'stack de contenidors inclou:
- `algod`: Node de la xarxa Algorand (conté internament els nodes lead i follower).
- `contract-deploy`: Eina encarregada de compilar i desplegar automàticament l'Smart Contract a Algorand.
- `hardhat`: Node local d'Ethereum per simular la xarxa on s'ancoraran els resultats.
- `ethereum-deploy`: Compila i desplega el contracte `NotaryContract` a la xarxa Ethereum local i registra les entitats (per defecte les 3 universitats).
- `anchoring`: Procés autònom en Python preparat per generar l'ancoratge determinista de les eleccions a Ethereum.
- `indexer-db`: Base de dades PostgreSQL per al cercador d'Algorand.
- `conduit`: Lector encarregat de bolcar la informació i transaccions del node d'Algorand a la base de dades.
- `indexer`: Motor de cerca i API per consultar directament sobre l'estat de la blockchain.
- `chain-heartbeat`: Servei en segon pla que manté la xarxa local (DevMode) avançant temporalment mitjançant transaccions buides.
- `client`: L'aplicació web frontend amb React (serveix Vite).

### Com Aixecar el Sistema Localment

```bash
# Iniciar tot l'entorn amb Docker Compose
docker compose up
```

L'eina `contract-deploy` sincronitzarà dependències, executarà la compilació del contracte, el desplegarà al node intern `algod` i n'extraurà el valor `app_id` al client (creant la variable `VITE_APP_ID`). Un cop engegat, podreu accedir a la Interfície Web directament al port que hagi habilitat Vite (normalment `http://localhost:5173`).

---

## Interfície d'usuari

Demochain ofereix una experiència fluida per als votants mitjançant un disseny en 3 idiomes i modes Clar/Fosc, ocultant completament la complexitat de la blockchain.

<details>
<summary>Veure captures de pantalla de l'aplicació</summary>

![Landing Page](docs/report/chapters/images/disseny/screenshots/01-landing.png)
<br/>
![Organitzacions](docs/report/chapters/images/disseny/screenshots/02-organizations.png)
<br/>
![Detall d'una Organització (Cens/Propostes)](docs/report/chapters/images/disseny/screenshots/03-organization-detail.png)
<br/>
![Llistat de Propostes](docs/report/chapters/images/disseny/screenshots/04-proposals-list.png)
<br/>
![Creació d'una Proposta](docs/report/chapters/images/disseny/screenshots/05-new-proposal-1.png)
<br/>
![Emetre Vot (Ranking d'Opcions)](docs/report/chapters/images/disseny/screenshots/06-vote-ranking.png)
<br/>
![Resultats de l'Elecció](docs/report/chapters/images/disseny/screenshots/07-results.png)
<br/>
![Matriu de Comparació (Schulze)](docs/report/chapters/images/disseny/screenshots/07b-results.png)
</details>

---

## Arquitectura del sistema (Model C4)

L'arquitectura ha estat dissenyada seguint el model C4 per tenir una visió clara de tots els components que conformen Demochain.

<details>
<summary>Veure diagrames arquitectònics C4</summary>

![Context (C1)](docs/report/chapters/images/disseny/c4/c1-context.png)
<br/>
![Contenidors (C2)](docs/report/chapters/images/disseny/c4/c2-containers.png)
<br/>
![Components: Client Web (C3)](docs/report/chapters/images/disseny/c4/c3-component-client.png)
<br/>
![Components: Smart Contract Algorand (C3)](docs/report/chapters/images/disseny/c4/c3-component-sc-algorand.png)
<br/>
![Components: Servei d'Ancoratge (C3)](docs/report/chapters/images/disseny/c4/c3-component-anchoring.png)
<br/>
![Components: Smart Contract Ethereum (C3)](docs/report/chapters/images/disseny/c4/c3-component-sc-ethereum.png)
</details>

---

## Fluxos de comunicació

Alguns dels processos més importants del sistema oculten la complexitat al client per oferir la millor experiència a l'usuari. Pots explorar com funcionen desplegant les opcions següents:

<details>
<summary><strong>1. Gestió d'Organitzacions i Cens</strong></summary>

El client esvaeix la restricció de mida de peticions de la blockchain tallant automàticament els arxius de cens grans en trossos de 7 adreces (el màxim admès per la xarxa) i agrupant les transaccions de signatura en lots.
<br/>

![Seqüència: Organització](docs/report/chapters/images/disseny/sequences/seq-organization.png)
</details>

<details>
<summary><strong>2. Creació d'una Proposta</strong></summary>

El client utilitza una creació guiada per passos, verificant prèviament les dades a escala local i evitant enviar errors o estats invàlids al contracte d'Algorand.
<br/>

![Seqüència: Crear Proposta](docs/report/chapters/images/disseny/sequences/seq-create-proposal.png)
</details>

<details>
<summary><strong>3. Fase d'Aprovació i Vot de Rànquing</strong></summary>

La votació inclou un vot de suport inicial i un vot preferencial posterior.
<br/>

![Seqüència: Vot d'Aprovació](docs/report/chapters/images/disseny/sequences/seq-approval-vote.png)
<br/>
![Seqüència: Vot de Rànquing](docs/report/chapters/images/disseny/sequences/seq-ranked-vote.png)
</details>

<details>
<summary><strong>4. Procés Autònom d'Ancoratge (Ethereum)</strong></summary>

Diferents nodes actuen independentment executant serveis paral·lels que comproven l'estat d'Algorand, el processen de manera determinista i envien el hash al `NotaryContract` desplegat a Sepolia (Ethereum) fins a aconseguir un consens `K-of-N`.
<br/>

![Seqüència: Ancoratge](docs/report/chapters/images/disseny/sequences/seq-anchoring.png)
</details>

---

## Stack Tecnològic

Per construir l'ecosistema de Demochain s'han combinat tecnologies modernes per garantir rendiment, seguretat i bona experiència d'usuari:

- **Algorand i Python (`algopy`)**: S'encarreguen de la lògica de negoci mitjançant un Smart Contract on viuen els censos i els vots, aprofitant l'alta velocitat de la xarxa.
- **Ethereum i Solidity**: Fan de pilar de seguretat; el `NotaryContract` desplegat a la xarxa de Sepolia assegura que cap entitat pugui alterar o amagar els resultats finals un cop tancada l'elecció.
- **Python (Processos en segon pla)**: S'ocupen dels serveis autònoms encarregats de llegir els vots, processar-los i derivar el hash determinista per a l'ancoratge.
- **React 19 i TypeScript**: Conformen l'aplicació web d'una sola pàgina (SPA) que serveix de porta d'entrada a qualsevol votant o administrador.
- **TailwindCSS, React-Query i dnd-kit**: S'utilitzen per donar estil a la interfície a mida, mantenir les dades sincronitzades en temps real amb la blockchain i permetre ordenar les opcions de vot d'una manera gràfica, intuïtiva i accessible.

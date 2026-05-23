# ADR 000 - Llenguatge per als _smart contracts_ d'Algorand

**ID de la tasca**: E1-US1-T4
**Data**: 2026-05-01
**Estat**: Acceptada

---

## Context

Hem de triar amb quin llenguatge escriurem els _smart contracts_ d'Algorand per al MVP del sistema de votació. Algorand ofereix tres opcions principals per a la implementació de _smart contracts_:

1. **TEAL** (_Transaction Execution Approval Language_): el llenguatge ensamblador de baix nivell propi de l'AVM.
2. **PyTEAL**: una biblioteca Python que genera TEAL amb una API de Python.
3. **algopy** (AlgoKit Utils + Puya): el compilador modern de Python per a _smart contracts_ d'Algorand, impulsat per Algorand Foundation.

Els requisits que guien la decisió:

- **Equip petit amb experiència en Python** sense experiència prèvia en _blockchain_.
- **Contractes complexos**: el nostre sistema incorpora verificació de proves zk-SNARK Groth16, gestió de _nullifiers_ via _boxes_, xifrat ElGamal homomòrfic i càlcul de Schulze. La complexitat és significativa.
- **Seguretat i correcció**: errors en la lògica del contracte poden tenir conseqüències irreversibles per a la integritat de les eleccions.
- **Mantenibilitat a llarg termini**: el codi ha de ser mantenible per nous membres de l'equip.
- **Integració amb l'ecosistema AlgoKit**: ja hem decidit (ADR 001) basar el projecte en AlgoKit per accelerar el desenvolupament.

---

## Opcions analitzades

### Opció A - TEAL

TEAL és el llenguatge d'execució directa de l'AVM. És de baix nivell, basat en una pila (_stack-based_), semblant a un _bytecode_ assembler.

- **Corba d'aprenentatge molt alta**: TEAL no s'assembla a cap llenguatge de programació modern. L'equip hauria d'aprendre un paradigma completament nou.
- **Sense tipus**: totes les operacions treballen amb _bytes_ i enters sense tipus estructurats. Les errades de tipus es detecten en execució, no en compilació.
- **Eines madures però limitades**: les eines de depuració i test de TEAL existeixen (AVM debugger, dryrun) però són rudimentàries comparades amb les de Python.
- **Control total del bytecode**: és l'única opció que permet optimitzar el mida del fitxer fins al mínim absolut possible, perquè no hi ha cap capa d'abstracció entre el codi i l'AVM.
- **Suport de la comunitat en declivi**: la documentació de TEAL brut és completa però la comunitat ha migrat progressivament cap a PyTEAL i algopy.
- **Límit de mida del fitxer**: el _bytecode_ generat és el més compacte possible, però per als nostres contractes complexos continua sent significatiu.

### Opció B - PyTEAL

PyTEAL és una biblioteca Python (disponible via `pip`) que permet escriure _smart contracts_ d'Algorand en Python, compilant-los a TEAL en temps d'execució.

- **Corba d'aprenentatge moderada**: la sintaxi és Python, però el model mental continua sent TEAL. Les expressions PyTEAL no s'executen directament; construeixen un arbre que es compila. Això confon els nous desenvolupadors.
- **Seguretat de tipus parcial**: Python ofereix _type hints_, però PyTEAL no té un sistema de tipus propi fort; els errors de tipus en la lògica del contracte sovint es detecten tard.
- **Maduresa de l'eina**: PyTEAL és el predecessor d'algopy, en manteniment passiu. Algorand Foundation ha deixat de prioritzar el seu desenvolupament actiu en favor de Puya/algopy.
- **Suport de la comunitat en disminució**: la majoria dels nous tutories, exemples de codi i respostes a fòrums d'Algorand ara utilitzen algopy. La documentació de PyTEAL existeix però no rep actualitzacions noves.
- **Sense integració directa amb AlgoKit**: les plantilles i _scaffolding_ generats per AlgoKit en les versions recents utilitzen algopy per defecte. Fer servir PyTEAL requereix configuració manual.
- **Mida del fitxer generada**: comparable a TEAL optimitzat a mà en termes de _bytecode_, però amb una mica de _overhead_ de l'abstracció.

### Opció C - algopy (Puya)

algopy és el sistema de compilació modern d'Algorand. El compilador es diu **Puya** i el paquet Python per escriure _smart contracts_ és `algopy`. Algorand Foundation el manté activament i és el camí recomanat per AlgoKit 2.x.

- **Corba d'aprenentatge baixa**: el codi sembla Python convencional. Les funcions es defineixen com funcions Python, els tipus com classes Python. No cal pensar en termes de pila ni de compilació.
- **Seguretat de tipus forta**: algopy incorpora un sistema de tipus ric (`UInt64`, `Bytes`, `Account`, `Asset`, `Application`, etc.) amb comprovació estàtica via `mypy`. Els errors de tipus es detecten en temps de compilació, no en execució.
- **Maduresa de l'eina**: Puya és el compilador oficial suportat per Algorand Foundation. Rep actualitzacions regulars, suporta totes les característiques recents de l'AVM (incloent les operacions BN254 per a zk-SNARKs), i és l'eina recomanada per als nous projectes.
- **Suport de la comunitat en creixement**: tota la documentació nova d'Algorand, els exemples d'AlgoKit i les respostes actives de la comunitat utilitzen algopy. Hi ha suport oficial al Discord d'Algorand Foundation.
- **Integració nativa amb AlgoKit**: les plantilles d'AlgoKit generen projectes algopy per defecte. El _scaffolding_, els tests (Pytest + Algorand Testing Framework), i el client TypeScript autogenerat estan tots pensats per a algopy.
- **Mida del fitxer generada**: el compilador Puya optimitza agressivament el _bytecode_ generat. En benchmarks públics, el codi generat per Puya és comparable o millor que el de PyTEAL per als mateixos contractes, amb una complexitat de codi font significativament menor.

---

## Anàlisi comparativa

| Dimensió | TEAL | PyTEAL | algopy (Puya) |
|---|---|---|---|
| Corba d'aprenentatge (equip Python) | Molt alta | Moderada | Baixa |
| Seguretat de tipus | Cap (tot bytes/int) | Parcial (_type hints_ opcionals) | Forta (tipus natius AVM + mypy) |
| Maduresa de l'eina | Alta (estàtica) | Mitjana (manteniment passiu) | Alta (desenvolupament actiu) |
| Suport de la comunitat | Minvant | En disminució | Creixent |
| Mida del _bytecode_ generat | Mínima (control total) | Comparable a TEAL | Comparable o millor que PyTEAL |
| Integració amb AlgoKit | Manual | Manual | Nativa (per defecte) |
| Suport per a opcodes BN254 (zk-SNARKs) | Sí (natiu) | Sí (via wrappers) | Sí (wrappers de primer nivell) |
| Depuració i tests | Bàsica | Moderada | Completa (ATF + Pytest) |
| Mantenibilitat del codi | Molt baixa | Moderada | Alta |

---

## Factors decisius

### 1. Seguretat de tipus en contractes complexos

El contracte de votació verifica proves zk-SNARK Groth16, gestiona _nullifiers_ amb _boxes_, xifra i desxifra dades homomòrficament, i executa l'algorisme de Schulze. La complexitat és alta i els errors en la lògica del contracte no es poden revertir. La seguretat de tipus forta d'algopy, verificable estàticament amb `mypy` abans de desplegar, és un avantatge crític per evitar errors de tipus que podrien comprometre la integritat de les eleccions.

### 2. Integració nativa amb AlgoKit i l'ecosistema triat

Ja hem decidit (ADR 001) adoptar AlgoKit com a entorn de desenvolupament principal. Les plantilles d'AlgoKit 2.x generen projectes algopy per defecte. El client TypeScript autogenerat per a les interaccions del _frontend_ es genera des del fitxer ARC4 d'un contracte algopy. Forçar l'ús de PyTEAL o TEAL brut requeriria treballar a contracorrent de totes les eines del nostre ecosistema.

### 3. Corba d'aprenentatge per a un equip petit

L'equip té experiència en Python però zero en _blockchain_. TEAL requeriria aprendre un paradigma completament nou. PyTEAL requereix aprendre Python amb un model mental de pila, cosa que sovint porta a errors subtils. algopy deixa l'equip escriure Python amb estructures familiars, concentrant l'aprenentatge en la lògica del domini (Algorand, AVM) en lloc de la sintaxi del llenguatge.

### 4. Futur de la plataforma

PyTEAL és una eina en manteniment passiu. Algorand Foundation ha declarat públicament que algopy/Puya és el camí endavant. Iniciar el projecte amb PyTEAL implicaria una migració futura costosa, o continuar amb una eina sense suport actiu. TEAL brut tampoc rep noves capacitats. algopy és l'única opció amb un full de ruta actiu i suport garantit.

### 5. Mida del _bytecode_ generada

La taula de l'issue especifica la "mida/cost del fitxer" com a dimensió rellevant. El compilador Puya genera _bytecode_ comparable o millor que el de PyTEAL per als mateixos contractes, malgrat la major abstracció. Per als nostres contractes complexos, la diferència respecte a TEAL brut és negligible comparada amb els guanys en seguretat i mantenibilitat. L'AVM té un límit de 8 KB per al codi del contracte i 1 KB per a l'_approval program_ de les transaccions; Puya queda ben per sota d'aquests límits per als nostres casos d'ús.

---

## Decisió

**S'adopta algopy (compilador Puya) com a llenguatge de _smart contracts_ per al projecte.**

Els arguments definitius:

1. És l'única opció amb seguretat de tipus forta i verificació estàtica, crític per a la complexitat del nostre sistema criptogràfic.
2. S'integra nativament amb AlgoKit, l'ecosistema triat, sense cap fricció addicional.
3. Té el suport actiu d'Algorand Foundation i és el camí oficial per a nous projectes.
4. La corba d'aprenentatge és la més baixa per a un equip amb experiència Python.
5. La mida del _bytecode_ generat és comparable o millor que la de PyTEAL, i la diferència respecte a TEAL brut és negligible per al nostre cas d'ús.

---

## Conseqüències

### Positives

- L'equip pot escriure contractes en Python pur, sense aprendre un nou paradigma.
- La seguretat de tipus estàtica preveu errors de lògica abans del desplegament.
- El _scaffolding_ d'AlgoKit, els tests i el client TypeScript funcionen de manera immediata.
- El projecte alinea amb el full de ruta oficial d'Algorand Foundation.

### Negatives i riscos

- **Dependència del compilador Puya**: si Algorand Foundation canviés de direcció, caldria migrar. Mitigació: el codi és obert i el _bytecode_ TEAL generat continua vàlid independentment del futur del compilador.
- **Abstracció addicional**: algopy afegeix una capa entre el codi Python i l'AVM. En casos molt marginals, el compilador podria generar _bytecode_ subòptim. Mitigació: sempre es pot inspecionar el TEAL generat i reportar l'issue al repositori oficial de Puya.
- **Eina relativament nova**: algopy és significativament més jove que PyTEAL o TEAL. Podrien aparèixer errors en casos extrems. Mitigació: la cobertura de tests del projecte (ATF + Pytest) i la verificació estàtica de tipus mitiguen el risc d'errors silenciosos.

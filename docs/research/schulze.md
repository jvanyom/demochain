# Mètode Schulze — Exemple treballat i justificació

**ID de la tasca**: E1-US3-T3
**Data**: 2026-05-01

---

## 1. Descripció del mètode

El mètode Schulze és un sistema de votació ordinal basat en la noció de _Condorcet_: un candidat és guanyador si bat tots els altres en comparacions per parelles directes. La novetat que aporta Schulze respecte al criteri de _Condorcet_ clàssic és la resolució de cicles (paradoxes de Condorcet) mitjançant la cerca del **camí més fort** (_strongest path_) entre candidats en un graf dirigit ponderat.

La força d'un camí del candidat A al candidat B es defineix com el **mínim pes** dels arcs que el composen. Schulze estableix que A guanya B si i només si el camí més fort de A cap a B és **estrictament més fort** que el camí més fort de B cap a A.

Les propietats formals demostrades per Schulze (2011) que fan el mètode atractiu per a sistemes electorals seriosos:

- **Monotonicitat**: pujar un candidat en el rànquing d'un votant mai li fa perdre.
- **Independència de clons**: afegir o eliminar candidats molt semblants no canvia qui guanya.
- **Simetria per inversió** (_reversal symmetry_): si s'inverteixen totes les preferències, el guanyador original ha de perdre.
- **Consistència amb Condorcet**: si existeix un guanyador de Condorcet, Schulze l'identifica.
- **Compliment del criteri de _Smith_**: el guanyador sempre pertany al conjunt de _Smith_ (el menor subconjunt de candidats que baten tots els externs).

---

## 2. Exemple treballat: 5 candidats, 3 tipus de votants

### 2.1. Enunciat

Considerem una elecció amb **5 candidats**: A, B, C, D, E.
Hi participen **45 votants** distribuïts en 9 grups de preferència (notació: A > B > C significa "primer A, segon B, tercer C"):

| Votants | Ordenació de preferències |
|--------:|--------------------------|
| 5       | A > C > B > E > D        |
| 5       | A > D > E > C > B        |
| 8       | B > E > D > A > C        |
| 3       | C > A > B > E > D        |
| 7       | C > A > E > B > D        |
| 2       | C > B > A > D > E        |
| 7       | D > C > E > B > A        |
| 8       | E > B > A > D > C        |

(Exemple estàndard de la literatura del mètode Schulze, adaptat de Schulze, M. 2011.)

### 2.2. Matriu de preferències per parelles (_d_[X,Y])

Cada cel·la _d_[X,Y] compta quants votants prefereixen X per sobre de Y.

|       | A  | B  | C  | D  | E  |
|------:|:--:|:--:|:--:|:--:|:--:|
| **A** |  — | 20 | 26 | 30 | 22 |
| **B** | 25 |  — | 16 | 33 | 18 |
| **C** | 19 | 29 |  — | 17 | 24 |
| **D** | 15 | 12 | 28 |  — | 14 |
| **E** | 23 | 27 | 21 | 31 |  — |

> Interpretació: 20 votants prefereixen A per sobre de B, però 25 prefereixen B per sobre d'A. Per tant, B guanya A en comparació directa amb marge 25 − 20 = 5.

No hi ha guanyador de _Condorcet_ pur perquè es produeix el cicle:
**B > A > E > B** (B > A amb 25, A > E amb 22 però E > B amb 27... — el cicle es resol amb la matriu de camins).

### 2.3. Matriu de camins més forts (_p_[X,Y])

L'algoritme de Schulze (equivalent a Floyd-Warshall sobre grafs dirigits) calcula la **força màxima del camí** entre cada parell de candidats, on la força d'un camí és el seu arc mínim.

Inicialització:

```
p[X,Y] = d[X,Y]  si d[X,Y] > d[Y,X]
p[X,Y] = 0       en cas contrari
```

Després de l'algoritme de Floyd-Warshall:

|       | A  | B  | C  | D  | E  |
|------:|:--:|:--:|:--:|:--:|:--:|
| **A** |  — | 28 | 28 | 30 | 24 |
| **B** | 25 |  — | 28 | 33 | 24 |
| **C** | 25 | 29 |  — | 29 | 24 |
| **D** | 25 | 28 | 28 |  — | 24 |
| **E** | 25 | 28 | 28 | 31 |  — |

Anotacions dels passos clau:

- **p[A,B] = 28**: el camí directe A→B val 20 (feble). Però A→C→B val min(26, 29) = 26, i A→C→E→B val min(26, 24, 27) = 24... El camí A→D... no supera cap d'aquests. Finalment, el camí A→C→B→E→D→... no afegeix res. El millor és el camí A→D (30) → ... espera: d[A,D]=30 > d[D,A]=15, per tant A bat D. Aleshores p[A,B] s'actualitza considerant tots els intermediaris; el valor final 28 reflecteix que el millor camí de A a B passa per C com a intermediari amb força 28 = min(d[A,C]=26... ) — els detalls complets de l'algoritme s'executen iterativament per tots els intermediaris {A,B,C,D,E}.

- **p[E,D] = 31**: E bata D directament amb 31 vots, que és el màxim de la taula. Qualsevol camí indirecte no pot superar 31, ja que el mínim del camí no pot ser major.

- **p[B,D] = 33**: B bata D directament amb 33 vots (el valor directe ja és el màxim).

### 2.4. Determinació del guanyador

Per a cada candidat X, comptem els candidats Y per als quals p[X,Y] > p[Y,X]:

| Candidat | Victòries (p[X,Y] > p[Y,X]) | Derrotats per |
|:--------:|:---------------------------:|:-------------:|
| **E**    | A, B, C, D → **4 victòries** | ningú         |
| A        | B, C, D → 3 victòries        | E             |
| C        | B, D → 2 victòries           | A, E          |
| B        | D → 1 victòria               | A, C, E       |
| D        | 0 victòries                  | A, B, C, E    |

Verificació per a E (el guanyador):
- p[E,A] = 25 vs p[A,E] = 24 → **E > A** ✓
- p[E,B] = 28 vs p[B,E] = 24 → **E > B** ✓
- p[E,C] = 28 vs p[C,E] = 24 → **E > C** ✓
- p[E,D] = 31 vs p[D,E] = 24 → **E > D** ✓

**Guanyador Schulze: E**, amb 4 victòries en la matriu de camins (bat tots els altres).

> Nota: E no és guanyador de _Condorcet_ pur (perquè d[B,E]=27 > d[E,B]=18 en les preferències directes). Però Schulze resol el cicle trobant que el **camí indirecte** de E cap a B és més fort que el camí directe de B cap a E.

---

## 3. Justificació del seu ús en el projecte

El projecte demochain requereix un mètode de votació ordinal que satisfaci tres condicions estructurals:

**3.1. Resistència a manipulació estratègica**

La independència de clons és crítica per a un sistema electoral públic. Sense ella, un actor maliciós podria afegir candidats "coví" per dividir el vot i canviar el resultat. Schulze és un dels pocs mètodes que satisfà simultàniament independència de clons i consistència amb _Condorcet_.

**3.2. Determinisme i auditabilitat**

L'algoritme de Schulze (Floyd-Warshall sobre la matriu de preferències) és **determinista**: per a un conjunt de paperetes donat, hi ha exactament un resultat possible. Això és essencial per a la verificabilitat on-chain: qualsevol node pot re-executar el càlcul i obtenir el mateix guanyador sense ambigüitat.

**3.3. Complexitat computacional acceptable**

Per a _n_ candidats, l'algoritme té complexitat O(_n_³). Per a eleccions típiques (5-20 candidats), el nombre d'operacions és negligible fins i tot en un entorn _smart contract_. La matriu d[X,Y] i p[X,Y] s'emmagatzemen com a arrays d'enters i el càlcul del guanyador és purament aritmètic.

**3.4. Reconeixement acadèmic**

El mètode Schulze és l'estàndard emprat per organizacioes com el _Debian Project_, la _Wikimedia Foundation_, el _Pirate Party_ i diverses organitzacions acadèmiques i tècniques. La seva base formal és sòlida (Schulze, 2011) i ha estat analitzada i verificada per múltiples investigadors independents.

---

## Resum

| Propietat | Schulze | Borda | IRV | Condorcet simple |
|:----------|:-------:|:-----:|:---:|:----------------:|
| Consistència amb _Condorcet_ | Sí | No | No | Sí (per definició) |
| Independència de clons | Sí | No | Sí | No |
| Monotonicitat | Sí | Sí | **No** | Sí |
| Simetria per inversió | Sí | Sí | No | No |
| Resolució de cicles | Sí | Sí | Parcial | **No** |
| Complexitat | O(_n_³) | O(_n_) | O(_n_ log _n_) | O(_n_²) |

El mètode Schulze és l'opció més robusta per a un sistema electoral públic i auditable com demochain. La complexitat addicional respecte a _IRV_ o _Borda_ queda justificada per les garanties formals de resistència a manipulació i la seva compatibilitat amb la verificació on-chain determinista.

---

## Referència

Schulze, M. (2011). A new monotonic, clone-independent, reversal symmetric, and Condorcet-consistent single-winner election method. _Social Choice and Welfare_, 36(2), 267–303. DOI: 10.1007/s00355-010-0475-4

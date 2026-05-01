# Comparativa de mètodes de votació ordinal

**ID de la tasca**: E1-US3-T2
**Data**: 2026-05-01

---

## 1. Propietats avaluades

Abans de comparar, cal definir les cinc propietats que s'analitzen:

**Monotonicitat**: Un mètode és monòton si augmentar el suport a un candidat (sense canviar res més) mai pot perjudicar-lo. La violació significa que votar «més fort» per un candidat pot fer-lo perdre.

**Independència de clons** (_clone independence_): Un mètode és independent de clons si afegir un candidat quasi idèntic (un _clon_) a la carrera no canvia el resultat final. Sense aquesta propietat, un partit pot manipular l'elecció dividint candidats o, a l'inrevés, un candidat popular pot ser «envoltat» de clons per repartir-li el suport.

**Consistència amb Condorcet** (_Condorcet consistency_): Si existeix un guanyador de Condorcet (un candidat que guanya totes les comparacions per parelles), el mètode l'ha d'elegir. No tots els mètodes garanteixen aquest criteri.

**Simetria per inversió** (_reversal symmetry_): Si s'inverteix l'ordre de totes les preferències de tots els votants, el guanyador original hauria de perdre (o almenys no guanyar de nou). Assegura que el sistema distingeix entre consens positiu i consens negatiu.

**Complexitat computacional**: Temps i recursos necessaris per calcular el guanyador. En el context d'un _smart contract_ a Algorand, la complexitat afecta directament el cost en comissions i la viabilitat d'executar l'escrutini on-chain.

---

## 2. Taula comparativa

| Propietat | Schulze | Borda | Condorcet (pur) | IRV (_instant-runoff_) |
|---|---|---|---|---|
| Monotonicitat | Sí | Sí | Sí | **No** |
| Independència de clons | Sí | **No** | Sí (amb matriu) | Sí (elimina per ronda) |
| Consistència amb Condorcet | Sí | **No** | Sí (per definició) | **No** |
| Simetria per inversió | Sí | **No** | No garantida | **No** |
| Complexitat | O(n³) sobre candidats | O(n·m) | O(n²·m) | O(n·m·r) |

Llegenda: _n_ = nombre de candidats, _m_ = nombre de votants, _r_ = nombre de rondes d'eliminació.

---

## 3. Anàlisi per mètode

### 3.1. Schulze

El mètode de Schulze construeix una matriu de comparació per parelles a partir dels rangs dels votants i, a continuació, calcula la matriu de _camins més forts_ (Floyd-Warshall). El guanyador és el candidat que té el camí més fort cap a tots els altres.

Schulze compleix les quatre propietats de qualitat de la taula. Això el converteix en l'estàndard acadèmic entre els mètodes de Condorcet i en la tria justificada per aquest projecte.

El cost computacional és O(n³) sobre el nombre de candidats, que en eleccions típiques (5–20 candidats) és trivial. Per a un _smart contract_, la matriu de camins es pot precomputar fora de la cadena i simplement verificar on-chain.

### 3.2. Borda

Cada votant assigna punts decreixents als candidats per ordre de preferència. El guanyador és qui acumula més punts. És simple d'entendre i d'explicar, però té dues debilitats crítiques:

- **No satisfà Condorcet**: un candidat que guanya totes les comparacions per parelles pot perdre amb Borda si els seus oponents acumulen molts punts per ser consistentment en segona o tercera posició.
- **Vulnerable a la manipulació per clons**: afegir candidats semblants al guanyador pot desplaçar els seus punts i canviar el resultat.

### 3.3. Condorcet (pur)

El «mètode de Condorcet» en sentit estricte és un criteri, no un mètode complet: elegeix el guanyador de Condorcet si n'hi ha un. El problema és que en eleccions reals pot no existir cap guanyador de Condorcet (paradoxa de Condorcet / cicles de preferències). En aquest cas, el mètode pur no dóna cap resposta sense una regla de desempat addicional.

Schulze és essencialment un mètode de Condorcet amb una regla de desempat ben definida (camins més forts), que resol els cicles de manera consistent i monòtona.

### 3.4. IRV (_Instant-Runoff Voting_)

L'IRV elimina iterativament el candidat amb menys primeres preferències fins que un candidat obté majoria. És el mètode usat per a les eleccions nacionals d'Austràlia i per moltes administracions locals als EUA i al RU.

Malgrat la seva popularitat, l'IRV té dues debilitats importants per al projecte:

- **No és monòton**: en alguns escenaris, obtenir més suport pot fer perdre un candidat. Això és contraintuïtiu i difícil de justificar públicament.
- **No satisfà Condorcet**: el guanyador de Condorcet no és necessàriament l'elegit per IRV.

Per a un sistema de votació que vol ser verificable i justificable acadèmicament, la no-monotonicitat de l'IRV és un obstacle important.

---

## 4. Justificació de l'elecció de Schulze

Schulze és l'únic mètode de la taula que compleix simultàniament les quatre propietats de qualitat. A més:

- Té una implementació algorítmica clara (Floyd-Warshall sobre la matriu de comparació per parelles).
- La literatura acadèmica el documenta àmpliament (Schulze, 2011).
- Permet precomputació off-chain amb verificació on-chain, cosa compatible amb l'arquitectura del projecte.
- L'article original descriu la seva resistència a la manipulació estratègica i la seva aplicació a votació electrònica.

---

## Fonts

- Schulze, M. (2011). «A new monotonic, clone-independent, reversal symmetric, and Condorcet-consistent single-winner election method». _Social Choice and Welfare_, 36(2), 267–303.
- Viquipèdia. «Comparison of electoral systems». [https://en.wikipedia.org/wiki/Comparison_of_electoral_systems](https://en.wikipedia.org/wiki/Comparison_of_electoral_systems)

# Contribuir a demochain

## Setup inicial

### 1. Clonar el repo i configurar els hooks

```bash
git clone https://github.com/jvanyom/demochain.git
cd demochain
make hooks
```

### 2. Instalar dependències

**Python (smart contract)**
```bash
pip install ruff
```

**TypeScript/React (client)**
```bash
cd client
bun install
```

## Estructura del projecte

```
demochain/
├── client/              # Frontend React + TypeScript (Bun, Biome)
├── contract/            # Smart contract Algorand + Python (PyUP, ruff)
├── scripts/             # Utilitats Python (ruff)
└── .githooks/           # Git hooks (commit-msg, pre-commit, pre-push)
```

## Convencions de codi

### Git commits

Els commits han de seguir **Conventional Commits**:

```
type(scope): descripció

Exemples:
  feat(voting): afegir sistema de vot preferencial
  fix(contract): corregir bug en validació
  docs: actualitzar README
  chore(deps): actualitzar ruff
```

**Tipus permesos:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `ci`, `build`, `perf`, `revert`

Els hooks locals t'ajudaràn — si un commit no segueix el format, els hooks el rebutjaran amb un missatge explicatiu.

### Python (contract/ i scripts/)

Es valida automàticament amb **ruff**:

```bash
# Comprovar sense cambiar
make lint-contract

# Auto-arreglar i formatejar
make fmt-contract
```

Configuració: `pyproject.toml` (100 chars de línia, Python 3.11)

### TypeScript (client/)

Es valida automàticament amb **Biome**:

```bash
# Comprovar sense cambiar
make lint-client

# Auto-arreglar i formatejar
make fmt-client
```

Configuració: `client/biome.json` (100 chars de línia, cometes dobles, trailing commas `es5`)

## Fluxe de treball

### Dins de feature branches

1. **Fer canvis** en `client/` o `contract/`
2. **Fer commit**: Els hooks locals (pre-commit) auto-arreglaran i formatearan
3. **Fer push**: Els hooks locals (pre-push) faran una comprovació final

### PR a main

1. **Crear PR** amb títol en format Conventional Commits
2. **GitHub Actions comprova:**
   - Títol del PR (Conventional Commits)
   - Ruff lint + format (Python)
   - Biome lint + format (TypeScript)
3. **Mergejar** quan totes les comprovacions pasin

## Creació d'issues

Utilitza una de les plantilles disponibles:

- **[EPIC]** — Conjunt de treball (múltiples sprints)
- **[US]** — Història d'usuari
- **[TASK]** — Tasca individual (≤1 dia)
- **[SUBTASK]** — Sub-tasca dins d'una tasca
- **[SPIKE]** — Investigació limitada en temps

Els títols han de seguir el patró `[TYPE] descripció`.

## Troubleshooting

### Els hooks no s'executen
```bash
# Re-configurar
make hooks

# Verificar
git config core.hooksPath
```

### ruff no está instal·lat
```bash
pip install ruff
```

### Biome no está instal·lat (client/)
```bash
cd client
bun add --dev @biomejs/biome
```

### Error "git config core.hooksPath" en WSL/Windows
Si els hooks no funcionen en Git for Windows, prova:
```bash
git config --local core.hooksPath .githooks
```

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository structure

```
demochain/
├── client/                          # React 18 + TypeScript frontend (Bun, Vite, Biome, Tailwind)
├── voting-contract/projects/demochain/  # Algorand smart contract (Python, AlgoKit, Puya)
│   ├── smart_contracts/demochain/contract.py  # Single ARC4 contract (Demochain class)
│   └── tests/                       # Unit tests (pytest + algopy_testing)
└── docs/
    ├── decisions/                   # ADRs (architecture decision records)
    ├── diagrams/                    # C4 diagrams (draw.io XML + PNG)
    └── research/                    # Research notes
```

## Initial setup

```bash
make hooks          # configure git hooks (required after clone)
pip install ruff    # Python linter/formatter
cd client && bun install   # frontend dependencies
```

For the smart contract, inside `voting-contract/projects/demochain/`:
```bash
algokit project bootstrap all   # install poetry deps + create .venv
algokit localnet start          # start local Algorand network (requires Docker)
```

## Commands

### Lint & format

```bash
make lint              # lint everything (Python + TypeScript)
make fmt               # auto-fix everything

make lint-contract     # ruff check + format --check on contract/ and scripts/
make fmt-contract      # ruff --fix + format on contract/ and scripts/

make lint-client       # Biome CI on client/
make fmt-client        # Biome check --write on client/
```

### Smart contract (run from `voting-contract/projects/demochain/`)

```bash
algokit project run build          # compile smart contract to TEAL artifacts
algokit project deploy localnet    # deploy to local network
```

### Tests (run from `voting-contract/projects/demochain/`)

```bash
poetry run pytest                  # run all tests
poetry run pytest tests/organization_unit_test.py   # run a single test file
poetry run pytest -k "test_create_org"              # run tests matching a name
```

Tests use `algopy_testing` — no running node required.

### Frontend (run from `client/`)

```bash
bun run dev      # dev server at localhost:5173
bun run build    # production build
bun test         # run tests
```

## Architecture

### Smart contract (`Demochain` ARC4 contract)

Single contract using Algorand BoxMap for all persistent state. Domain model:

- **Organizations** — created by any account; creator becomes admin and is auto-added to their census.
- **Census** — per-org allowlist of voting addresses. Only admin can add/remove. Max 7 addresses per call (`MAX_CENSUS_BATCH`).
- **Proposals** — any census member can create; must start ≥ 3 days in future with ≥ 1 day voting window; requires ≥ 2 options.
- **Approval voting** — census members vote yes/no on a proposal before it starts. A proposal needs ≥ 3/4 approval to proceed to election (`APPROVAL_QUORUM_NUM/DEN`).
- **Election voting** — after start date and only if approved; voters submit a full preference order (all options ranked, 0-indexed, no repeats) — Schulze method input.

State is stored in typed `BoxMap`s keyed by `arc4.UInt64` IDs (auto-incrementing) or composite keys (`arc4.Tuple`).

### Frontend (`client/`)

React SPA with i18n (Catalan/Spanish/English), connecting to the Algorand contract via `algosdk` and `@txnlab/use-wallet-react` (Pera Wallet). Form validation uses Zod schemas (`client/src/schemas/`).

### Key architectural decision

Algorand was chosen over Ethereum/Solana because: definitive block finality in ~3.5 s, native atomic fee sponsorship (voters pay nothing), and native BN254 opcodes for zk-SNARK verification. See `docs/decisions/001-blockchain-choice.md`.

## Git workflow

**Branch naming**: `task/<issue-number>`, `feat/<issue-number>`, `docs/<description>`

**Commit format** (enforced by hook):
```
type(scope): description

Closes #N
```
Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `ci`, `build`, `perf`, `revert`. `WIP` prefix bypasses the hook.

**PR flow**: branch → `dev` → reviewers: `jvanyom`, `tcontesti`, `linkcla`. PR title must follow Conventional Commits (enforced by CI). Use `.github/pull_request_template.md` format.

**CI checks** (on every PR): Conventional Commits title + ruff lint/format.

The pre-commit hook auto-fixes staged Python/TS files with ruff/Biome before committing. If it fails, run `make fmt` and re-stage.

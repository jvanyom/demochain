.PHONY: hooks lint fmt lint-contract fmt-contract lint-client fmt-client

hooks:
	git config core.hooksPath .githooks
	chmod +x .githooks/*
	@echo "✅ Git hooks configurats a .githooks/"

lint: lint-contract lint-client
	@echo "✅ Comprovació completa"

fmt: fmt-contract fmt-client
	@echo "✅ Formatat completat"

lint-contract:
	ruff check contract/ scripts/
	ruff format --check contract/ scripts/

fmt-contract:
	ruff check --fix contract/ scripts/
	ruff format contract/ scripts/

lint-client:
	@if [ -d "client" ]; then cd client && bun x biome ci --no-errors-on-unmatched; else echo "⚠️  client/ no trobat"; fi

fmt-client:
	@if [ -d "client" ]; then cd client && bun x biome check --write --no-errors-on-unmatched; else echo "⚠️  client/ no trobat"; fi

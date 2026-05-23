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
	ruff check voting-contract/
	ruff format --check voting-contract/

fmt-contract:
	ruff check --fix voting-contract/
	ruff format voting-contract/

lint-client:
	@if [ -d "client" ]; then cd client && bunx oxlint --no-error-on-unmatched-pattern . && bunx oxfmt --check .; else echo "⚠️  client/ no trobat"; fi

fmt-client:
	@if [ -d "client" ]; then cd client && bunx oxfmt .; else echo "⚠️  client/ no trobat"; fi

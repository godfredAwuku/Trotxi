.DEFAULT_GOAL := help
COMPOSE := docker compose -f infra/docker/docker-compose.yml
API := services/api

.PHONY: help
help: ## List available tasks
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

## ---- Infra ----
.PHONY: up
up: ## Start Postgres, Redis, EMQX
	$(COMPOSE) up -d

.PHONY: down
down: ## Stop infra containers
	$(COMPOSE) down

.PHONY: logs
logs: ## Tail infra logs
	$(COMPOSE) logs -f

.PHONY: ps
ps: ## Show infra container status
	$(COMPOSE) ps

## ---- API (services/api) ----
.PHONY: install
install: ## Install API dependencies
	cd $(API) && npm install

.PHONY: dev
dev: ## Run API in watch mode
	cd $(API) && npm run dev

.PHONY: test
test: ## Run API tests
	cd $(API) && npm test

.PHONY: coverage
coverage: ## Run API tests with coverage
	cd $(API) && npm run test:coverage

.PHONY: typecheck
typecheck: ## Typecheck the API
	cd $(API) && npm run typecheck

.PHONY: lint
lint: ## Lint the API
	cd $(API) && npm run lint

.PHONY: migrate
migrate: ## Apply DB migrations (requires DATABASE_URL)
	cd $(API) && npm run migrate

.PHONY: seed
seed: ## Seed demo routes/trips/vehicles (requires DATABASE_URL)
	cd $(API) && npm run seed

.PHONY: check
check: typecheck lint test ## Run all API quality gates

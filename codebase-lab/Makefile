SHELL := /bin/bash
TOOLS := sourcebot codebase-memory-mcp code-graph-rag codegraphcontext opendeepwiki codewiki graphify
# Wiki generators need a capable LLM to build anything; on the CPU fallback
# model they produce no pages, so they are left out of bench-all until
# OLLAMA_BASE_URL points at a GPU (README "Models").
BENCH_TOOLS ?= sourcebot codebase-memory-mcp code-graph-rag codegraphcontext graphify
REPO  ?= react

.PHONY: docker-up up seed models status tool-up tool-down index bench bench-all bench-agent report down reset

docker-up: up

## Core: Forgejo, Ollama, LiteLLM, git-sync
up:
	docker compose up -d --build --wait

## Push the repos from repos.txt into Forgejo (idempotent)
seed:
	./scripts/seed.sh

## Pull CHAT_MODEL + EMBED_MODEL into the Ollama that OLLAMA_BASE_URL points at
models:
	docker compose --profile models run --rm ollama-pull

status:
	@docker compose ps --format 'table {{.Service}}\t{{.State}}\t{{.Ports}}'
	@curl -fsS localhost:4311/status | python3 -c 'import sys,json;[print(f"  {k}: {v[\"head\"][:12] if v.get(\"head\") else \"-\"} synced {v.get(\"last_sync\")}") for k,v in json.load(sys.stdin)["repos"].items()]'

## make tool-up T=sourcebot
tool-up:
	docker compose --profile $(T) up -d --build --wait

# Only the tool's own services. `--profile T stop` would also stop the core.
tool-services = $$(comm -13 <(docker compose config --services | sort) <(docker compose --profile $(1) config --services | sort))

tool-down:
	docker compose stop $(call tool-services,$(T))

## make index T=graphify [REPO=react]
index: bench/node_modules
	node bench/run.mjs index $(T) $(REPO)

## make bench T=graphify [REPO=react]  — free: index + both retrieval runs
bench: bench/node_modules
	node bench/run.mjs index $(T) $(REPO)
	node bench/run.mjs retrieval $(T) $(REPO)
	node bench/run.mjs retrieval $(T) $(REPO) --nl
	docker compose stop $(call tool-services,$(T))
	node bench/run.mjs report $(REPO)

## Every tool, one at a time, so RAM numbers are not polluted by neighbours
bench-all: bench/node_modules
	node bench/run.mjs retrieval grep $(REPO)
	node bench/run.mjs retrieval grep $(REPO) --nl
	@for t in $(BENCH_TOOLS); do $(MAKE) --no-print-directory bench T=$$t REPO=$(REPO) || echo "!! $$t failed"; done
	node bench/run.mjs report $(REPO)

## COSTS MONEY: Claude answers + judge per question. make bench-agent T=grep LIMIT=5
bench-agent: bench/node_modules
	node bench/run.mjs agent $(T) $(REPO) --yes --limit $(or $(LIMIT),0)

report:
	node bench/run.mjs report $(REPO)

bench/node_modules:
	cd bench && npm install --silent

down:
	docker compose --profile '*' down

## Wipe all lab state (Forgejo, models, indexes). Needs re-seed and re-pull.
reset: down
	docker run --rm -v "$(CURDIR)/.docker:/d" alpine:3.22 sh -c 'rm -rf /d/*'

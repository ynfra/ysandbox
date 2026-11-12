.PHONY: docker-up up down reset logs e2e token

docker-up: up

## First run and every run: boot Forgejo, seed it (idempotent), start ygitbox.
up:
	docker compose up -d forgejo
	./scripts/bootstrap.sh
	docker compose up -d --build ygitbox
	./scripts/wait-healthy.sh

down:
	docker compose down

## Wipe everything (Forgejo data, ygitbox DB and mirrors).
reset:
	docker compose down -v
	rm -rf .docker

logs:
	docker compose logs -f ygitbox

## End-to-end test against the running stack.
e2e:
	cd app && bun run test/e2e.ts

## make token EMAIL=alex@example.com NAME="Alex Rivera" LEVEL=propose
token:
	@docker compose exec -T ygitbox bun src/cli.ts token --email "$(EMAIL)" --name "$(NAME)" --level "$(or $(LEVEL),propose)"

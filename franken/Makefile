DOCKER_IMAGE=frankapp
DOCKER_VERSION=latest

############################################################
# DEVELOPMENT ##############################################
############################################################
.PHONY: dev
dev:
	php -S 0.0.0.0:8000 -t www

.PHONY: frankenphp
defranken:
	franken run Caddyfile

############################################################
# DOCKER ###################################################
############################################################
.PHONY: docker-up
docker-up:
	docker compose up

.PHONY: docker-build
docker-build:
	docker build -t ${DOCKER_IMAGE}:${DOCKER_VERSION} .

.PHONY: docker-in
docker-in:
	docker compose exec app bash

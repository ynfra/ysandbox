.PHONY: docker-up deploy e2e reset logs

docker-up:
	docker compose up --build

# Push platform/ changes to the running stack (no restart needed).
deploy:
	docker compose run --rm deploy

e2e:
	./tests/e2e.sh

logs:
	docker compose logs -f celld

reset:
	docker compose down
	rm -rf .docker

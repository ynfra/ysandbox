.PHONY: install
install:
	npm install
	npx playwright install

.PHONY: test
test:
	npx playwright test

.PHONY: test-ui
test-ui:
	npx playwright test --ui

.PHONY: report
report:
	npx playwright show-report

.PHONY: docker
docker-up:
	docker compose up

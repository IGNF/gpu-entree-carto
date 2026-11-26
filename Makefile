.PHONY: install dev build preview test verify fix

install:
	npm install

dev:
	npm run dev

build:
	npm run build

preview:
	npx vite preview

test:
	npm run test

# Lint + format + types, puis CodeQL local (SKIP_CODEQL=1 pour l’ignorer)
verify:
	npm run verify
	npm run verify:codeql

fix:
	npm run fix

.PHONY: install dev build build-lib build-location-search build-search-engine build-demo build-geometry-editor build-sketch test preview preview-pages typecheck verify fix

install:
	npm install

dev:
	npm run dev

build:
	npm run build
	@echo "→ Prévisualiser : make preview (ne pas ouvrir dist/index.html en file://)"

build-lib:
	npm run build:lib

build-location-search:
	npm run build:location-search

build-search-engine:
	npm run build:search-engine

build-demo:
	npm run build:demo

build-geometry-editor:
	npm run build:geometry-editor

build-sketch:
	npm run build:sketch

test:
	npm run test

preview:
	npm run preview

preview-pages:
	npm run serve:pages

typecheck:
	npm run typecheck

verify:
	npm run verify
	npm run verify:codeql

fix:
	npm run fix

.PHONY: install dev build build-lib build-demo build-geometry-editor build-sketch test preview typecheck

install:
	npm install

dev:
	npm run dev

build:
	npm run build

build-lib:
	npm run build:lib

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

typecheck:
	npm run typecheck

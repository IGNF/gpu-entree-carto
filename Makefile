.PHONY: install dev build build-lib build-demo test preview typecheck

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

test:
	npm run test

preview:
	npm run preview

typecheck:
	npm run typecheck

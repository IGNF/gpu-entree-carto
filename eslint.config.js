import path from 'node:path'
import { fileURLToPath } from 'node:url'
import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import tseslint from 'typescript-eslint'
import vueParser from 'vue-eslint-parser'
import eslintConfigPrettier from 'eslint-config-prettier'
import globals from 'globals'
import { escapePathForGlob, groupVueFiles } from './eslint/groupVueFiles.mjs'

const tsconfigRootDir = path.dirname(fileURLToPath(import.meta.url))
const eslintLintRoot = path.join(tsconfigRootDir, 'src')
const vueFiles = groupVueFiles(eslintLintRoot)
const typeCheckableVueGlobs = vueFiles.typeCheckable.map(
  (file) => `src/${escapePathForGlob(file)}`,
)
const nonTypeCheckableVueGlobs = vueFiles.nonTypeCheckable.map(
  (file) => `src/${escapePathForGlob(file)}`,
)

const extraFileExtensions = ['.vue']

const additionalRulesRequiringParserServices = [
  '@typescript-eslint/consistent-type-imports',
  '@typescript-eslint/prefer-optional-chain',
]

const typeAwareVueSafetyRules = {
  name: 'entree-carto/vue-type-aware-safety-relief',
  files: ['src/**/*.ts', 'src/**/*.tsx', 'src/**/*.mts', 'src/**/*.vue'],
  rules: {
    '@typescript-eslint/no-unsafe-argument': 'off',
    '@typescript-eslint/no-unsafe-assignment': 'off',
    '@typescript-eslint/no-unsafe-return': 'off',
    '@typescript-eslint/no-unsafe-call': 'off',
    '@typescript-eslint/no-unsafe-member-access': 'off',
  },
}

const skipTypeCheckingConfigs = [
  {
    name: 'entree-carto/skip-type-checking-js',
    files: ['src/**/*.js', 'src/**/*.jsx', 'src/**/*.cjs', 'src/**/*.mjs'],
    ...tseslint.configs.disableTypeChecked,
  },
]

if (nonTypeCheckableVueGlobs.length > 0) {
  skipTypeCheckingConfigs.push({
    name: 'entree-carto/skip-type-checking-vue-without-ts',
    files: nonTypeCheckableVueGlobs,
    ...tseslint.configs.disableTypeChecked,
    rules: {
      ...tseslint.configs.disableTypeChecked.rules,
      ...Object.fromEntries(
        additionalRulesRequiringParserServices.map((rule) => [rule, 'off']),
      ),
    },
  })
}

const projectServiceConfigs = [
  {
    name: 'entree-carto/project-service-ts',
    files: ['src/**/*.ts', 'src/**/*.tsx', 'src/**/*.mts'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir,
        extraFileExtensions,
      },
    },
  },
  typeAwareVueSafetyRules,
]

if (typeCheckableVueGlobs.length > 0) {
  projectServiceConfigs.push({
    name: 'entree-carto/project-service-vue',
    files: typeCheckableVueGlobs,
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir,
        parser: tseslint.parser,
        extraFileExtensions,
      },
    },
  })
}

export default [
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'public/**',
      'coverage/**',
      '.codeql-cli/**',
      '.codeql-db/**',
      '.codeql-db-test/**',
    ],
  },
  js.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  ...tseslint.configs.recommendedTypeChecked,
  ...pluginVue.configs['flat/base'],
  {
    name: 'entree-carto/vue-typescript-setup',
    files: ['src/**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: {
          ts: tseslint.parser,
        },
        ecmaVersion: 2024,
        extraFileExtensions,
      },
    },
    rules: {
      'vue/block-lang': [
        'error',
        {
          script: {
            lang: 'ts',
            allowNoLang: false,
          },
        },
      ],
    },
  },
  ...skipTypeCheckingConfigs,
  ...projectServiceConfigs,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      'vue/multi-word-component-names': 'off',
    },
  },
  {
    name: 'entree-carto/vitest-specs',
    files: ['src/**/*.spec.ts'],
    rules: {
      '@typescript-eslint/unbound-method': 'off',
    },
  },
  eslintConfigPrettier,
]

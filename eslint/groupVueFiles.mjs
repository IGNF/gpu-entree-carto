import fs from 'node:fs'
import path from 'node:path'

/** Matches `<script lang="ts">` / `<script setup lang="ts">` (double or single quotes). */
const SCRIPT_TS_RE = /<script[^>]*\blang\s*=\s*['"]ts['"][^>]*>/i

/**
 * Lists `.vue` files under `rootDir` and splits them for typed ESLint
 * (same idea as @vue/eslint-config-typescript, without fast-glob).
 *
 * @param {string} rootDir absolute path (e.g. project `src/`)
 * @returns {{ typeCheckable: string[], nonTypeCheckable: string[] }} paths relative to `rootDir`, POSIX slashes
 */
export function groupVueFiles(rootDir) {
  /** @type {string[]} */
  const typeCheckable = []
  /** @type {string[]} */
  const nonTypeCheckable = []

  /** @param {string} dir */
  function walk(dir) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      if (ent.name === 'node_modules' || ent.name === '.git') continue
      const abs = path.join(dir, ent.name)
      if (ent.isDirectory()) {
        walk(abs)
        continue
      }
      if (!ent.name.endsWith('.vue')) continue
      const rel = path.relative(rootDir, abs).split(path.sep).join('/')
      const contents = fs.readFileSync(abs, 'utf8')
      if (SCRIPT_TS_RE.test(contents)) {
        typeCheckable.push(rel)
      } else {
        nonTypeCheckable.push(rel)
      }
    }
  }

  walk(rootDir)
  return { typeCheckable, nonTypeCheckable }
}

/** Escape glob metacharacters in a literal path segment (ESLint minimatch). */
export function escapePathForGlob(filePath) {
  return filePath.replace(/([*?{}[\]()])/g, '[$1]')
}

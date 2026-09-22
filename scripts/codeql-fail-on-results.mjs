#!/usr/bin/env node
/**
 * Quitte avec code 1 si le SARIF CodeQL contient des résultats error/warning.
 */
import { readFileSync } from 'node:fs'

const sarifPath = process.argv[2]
if (!sarifPath) {
  console.error('Usage: codeql-fail-on-results.mjs <file.sarif>')
  process.exit(2)
}

/** @type {{ runs?: { results?: { level?: string; ruleId?: string; message?: { text?: string } }[] }[] }} */
const sarif = JSON.parse(readFileSync(sarifPath, 'utf8'))
const findings = []

for (const run of sarif.runs ?? []) {
  for (const result of run.results ?? []) {
    const level = result.level ?? 'warning'
    if (level !== 'error' && level !== 'warning') continue
    findings.push({
      level,
      ruleId: result.ruleId ?? '?',
      message: result.message?.text ?? '',
    })
  }
}

if (findings.length === 0) process.exit(0)

console.error(`CodeQL: ${findings.length} alerte(s) :`)
for (const f of findings) {
  console.error(`  [${f.level}] ${f.ruleId}: ${f.message}`)
}
process.exit(1)

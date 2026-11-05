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

/** @type {import('node:fs').PathLike} */
const sarif = JSON.parse(readFileSync(sarifPath, 'utf8'))
const findings = []

for (const run of sarif.runs ?? []) {
  for (const result of run.results ?? []) {
    const level = result.level ?? 'warning'
    if (level !== 'error' && level !== 'warning') continue
    const loc = result.locations?.[0]?.physicalLocation
    const uri = loc?.artifactLocation?.uri ?? ''
    const line = loc?.region?.startLine
    const where = uri ? (line ? `${uri}:${line}` : uri) : ''
    findings.push({
      level,
      ruleId: result.ruleId ?? '?',
      message: result.message?.text ?? '',
      where,
    })
  }
}

if (findings.length === 0) process.exit(0)

console.error(`CodeQL: ${findings.length} alerte(s) :`)
for (const f of findings) {
  const prefix = f.where ? `${f.where} — ` : ''
  console.error(`  [${f.level}] ${f.ruleId}: ${prefix}${f.message}`)
}
process.exit(1)

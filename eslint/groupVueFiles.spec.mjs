import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { escapePathForGlob, groupVueFiles } from './groupVueFiles.mjs'

describe('groupVueFiles', () => {
  /** @type {string | undefined} */
  let tmpDir

  afterEach(() => {
    if (tmpDir) {
      fs.rmSync(tmpDir, { recursive: true, force: true })
      tmpDir = undefined
    }
  })

  it('splits vue files by script lang=ts', () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ec-eslint-'))
    fs.writeFileSync(
      path.join(tmpDir, 'Typed.vue'),
      '<script setup lang="ts">\nexport default {}\n</script>\n',
    )
    fs.writeFileSync(path.join(tmpDir, 'Plain.vue'), '<script setup>\nexport default {}\n</script>\n')

    const { typeCheckable, nonTypeCheckable } = groupVueFiles(tmpDir)
    expect(typeCheckable).toEqual(['Typed.vue'])
    expect(nonTypeCheckable).toEqual(['Plain.vue'])
  })

  it('escapePathForGlob quotes metacharacters', () => {
    expect(escapePathForGlob('a(b).vue')).toBe('a[(]b[)].vue')
  })
})

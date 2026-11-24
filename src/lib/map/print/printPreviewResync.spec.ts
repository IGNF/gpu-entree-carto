import { describe, expect, it } from 'vitest'
import {
  previewNeedsSourceViewResync,
  type PrintSourceViewKey,
} from '@/lib/map/print/printPreviewResync'

const paris: PrintSourceViewKey = { location: 'paris', layers: 'plan' }
const toulouse: PrintSourceViewKey = { location: 'toulouse', layers: 'plan' }
const parisOrtho: PrintSourceViewKey = { location: 'paris', layers: 'ortho' }

describe('previewNeedsSourceViewResync', () => {
  it('changement de lieu : recentre, même si l’aperçu avait été déplacé à la main', () => {
    expect(previewNeedsSourceViewResync(paris, toulouse, true)).toBe(true)
    expect(previewNeedsSourceViewResync(paris, toulouse, false)).toBe(true)
  })

  it('même lieu, aperçu personnalisé : garde le cadrage choisi', () => {
    expect(previewNeedsSourceViewResync(paris, paris, true)).toBe(false)
    expect(previewNeedsSourceViewResync(paris, parisOrtho, true)).toBe(false)
  })

  it('même lieu, aperçu non personnalisé, couches changées : resynchronise', () => {
    expect(previewNeedsSourceViewResync(paris, parisOrtho, false)).toBe(true)
  })

  it('rien n’a changé : pas de resynchronisation', () => {
    expect(previewNeedsSourceViewResync(paris, paris, false)).toBe(false)
  })

  it('première ouverture (pas de session précédente) : pas de resynchronisation', () => {
    expect(previewNeedsSourceViewResync(null, paris, false)).toBe(false)
  })
})

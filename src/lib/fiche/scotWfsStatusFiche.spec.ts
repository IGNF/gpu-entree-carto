/**
 * SCoT présents dans les données carte (WFS) mais absents de la base gpu-site :
 * tuile document avec badge gris « NON PUBLIÉ » / « ARRÊTÉ », sans lien.
 */
import { afterEach, describe, expect, it } from 'vitest'
import { MAP_MODE_PARCEL, MAP_MODE_TERRITORY } from '@/lib/map/mapMode'
import { setFicheCatalogFamilyVisibility } from '@/lib/fiche/ficheCatalogVisibilityFilter'
import { ficheSelectionFromGpuApi, type GpuFicheInfoPayload } from '@/lib/fiche/ficheInfoFromGpuApi'
import { documentUrbanismTileHtml } from '@/lib/fiche/ficheDocumentTiles'
import {
  buildParcelDocumentsHtmlFromFiche,
  buildParcelInfosHtmlFromFiche,
} from '@/lib/fiche/parcelFicheFromGpuApi'
import {
  getParcelLegendImageRelativePath,
  type ParcelLegendConfigEntry,
} from '@/lib/fiche/parcelLegendImage'

const PUBLISHED_ID = '75320666e060cde9d822dc388522604d'

const scotStopped = {
  id: 'scot.1',
  properties: {
    partition: 'scot_111',
    name: 'scot_111',
    title: 'SCOT DU LITTORAL',
    approved: false,
  },
}
const scotNotPublished = {
  id: 'scot.2',
  properties: { partition: 'scot_222', name: 'scot_222', title: 'SCOT DES MONTS', approved: true },
}
const scotPublished = {
  id: 'scot.3',
  properties: {
    partition: 'scot_333',
    name: 'scot_333',
    title: 'SCOT PUBLIÉ',
    gpu_id: PUBLISHED_ID,
  },
}

const ficheApiPublished: GpuFicheInfoPayload = {
  scots: {
    scot_333: {
      documents: [
        {
          id: PUBLISHED_ID,
          name: 'scot_333',
          originalName: '200051183_SCOT_20251010',
          title: 'SCoT publié en base',
          status: 'document.production',
          viewUrl: `/document/${PUBLISHED_ID}`,
        },
      ],
    },
  },
}

function tileOf(html: string, title: string): string {
  const start = html.lastIndexOf('<div class="fr-tile', html.indexOf(title))
  expect(start).toBeGreaterThanOrEqual(0)
  return html.slice(start, html.indexOf('</div></div></div>', start))
}

describe('tuile document SCoT non publié / arrêté', () => {
  it('badge gris unique, message, sans lien ni badge EN VIGUEUR / APPROUVÉ', () => {
    const html = documentUrbanismTileHtml({
      title: 'SCOT TEST',
      href: 'https://example.com/doc',
      scotWfsStatus: 'stopped',
      defaultApprovedWhenStatusMissing: true,
    })
    expect(html).toContain('ec-fiche-info__badge--scot-status')
    expect(html).toContain('>ARRÊTÉ<')
    expect(html).toContain('est arrêté')
    expect(html).not.toContain('href=')
    expect(html).not.toContain('fr-enlarge-link')
    expect(html).not.toContain('EN VIGUEUR')
    expect(html).not.toContain('APPROUVÉ')
  })
})

describe('fiche parcelle — Documents', () => {
  afterEach(() => setFicheCatalogFamilyVisibility(null))

  it('ajoute une tuile ARRÊTÉ et une tuile NON PUBLIÉ sans lien', () => {
    const html = buildParcelDocumentsHtmlFromFiche(
      { features: [scotStopped, scotNotPublished] },
      {},
    )
    expect(html).toContain('Schémas de cohérence territoriale')
    const stopped = tileOf(html, 'SCOT DU LITTORAL')
    expect(stopped).toContain('>ARRÊTÉ<')
    expect(stopped).not.toContain('href=')
    const notPublished = tileOf(html, 'SCOT DES MONTS')
    expect(notPublished).toContain('>NON PUBLIÉ<')
    expect(notPublished).not.toContain('href=')
  })

  it('conserve la tuile du SCoT publié (lien) à côté des SCoT hors base', () => {
    const html = buildParcelDocumentsHtmlFromFiche(
      { features: [scotPublished, scotStopped] },
      ficheApiPublished,
    )
    const published = tileOf(html, 'SCoT publié en base')
    expect(published).toContain(`href="`)
    expect(published).not.toContain('ec-fiche-info__badge--scot-status')
    expect(tileOf(html, 'SCOT DU LITTORAL')).toContain('>ARRÊTÉ<')
  })

  it('une seule tuile par partition (plusieurs entités WFS)', () => {
    const twin = { ...scotStopped, id: 'scot.1b' }
    const html = buildParcelDocumentsHtmlFromFiche({ features: [scotStopped, twin] }, {})
    expect(html.split('SCOT DU LITTORAL').length - 1).toBe(1)
  })

  it('SCoT avec gpu_id absent de la base : toujours pas de tuile', () => {
    const html = buildParcelDocumentsHtmlFromFiche(
      {
        features: [
          { id: 'scot.9', properties: { partition: 'scot_9', gpu_id: 'f'.repeat(32), title: 'X' } },
        ],
      },
      {},
    )
    expect(html).not.toContain('Schémas de cohérence territoriale')
  })

  it('respecte la case SCoT du catalogue', () => {
    setFicheCatalogFamilyVisibility({ du: true, psmv: true, sup: true, scot: false, mec: true })
    const html = buildParcelDocumentsHtmlFromFiche({ features: [scotStopped] }, {})
    expect(html).not.toContain('SCOT DU LITTORAL')
  })
})

describe('fiche parcelle — Infos (légende)', () => {
  it('liste les SCoT hors base avec suffixe et pictogramme corrects', () => {
    const html = buildParcelInfosHtmlFromFiche(
      { features: [scotStopped, scotNotPublished] },
      17,
      {},
    )
    expect(html).toContain('SCOT DU LITTORAL - arrêté')
    expect(html).toContain('SCOT DES MONTS - non publié')
  })
})

describe('parcelLegendImage — SCoT', () => {
  const scotConfig: ParcelLegendConfigEntry = { name: 'scot', type: 'scot' }
  it('approved false → périmètre (et non plus « non publié »)', () => {
    expect(getParcelLegendImageRelativePath(scotConfig, scotStopped, 17)).toBe(
      'scot/SCOT_PERIMETER.png',
    )
    expect(getParcelLegendImageRelativePath(scotConfig, scotNotPublished, 17)).toBe(
      'scot/SCOT_NOT_PUBLISHED.png',
    )
    expect(getParcelLegendImageRelativePath(scotConfig, scotPublished, 17)).toBe(
      'scot/SCOT_PUBLISHED.png',
    )
  })
})

describe('fiche territoire — onglet SCoT', () => {
  afterEach(() => setFicheCatalogFamilyVisibility(null))

  it('crée l’onglet SCoT avec badge même sans document en base', () => {
    const sel = ficheSelectionFromGpuApi(
      {
        grid: { name: 'COMMUNE', insee: '12345' },
        scots: { scot_111: { documents: [] } },
        parcelFiche: { features: [scotStopped, scotNotPublished] },
      },
      MAP_MODE_TERRITORY,
      1,
      45,
    )
    const tab = sel?.documentTabs?.find((t) => t.id === 'scot')
    expect(tab).toBeTruthy()
    expect(tileOf(tab!.bodyHtml, 'SCOT DU LITTORAL')).toContain('>ARRÊTÉ<')
    expect(tileOf(tab!.bodyHtml, 'SCOT DES MONTS')).toContain('>NON PUBLIÉ<')
    expect(tab!.bodyHtml).not.toContain('href=')
  })

  it('mélange SCoT publié (lien) et SCoT arrêté (badge)', () => {
    const sel = ficheSelectionFromGpuApi(
      { ...ficheApiPublished, parcelFiche: { features: [scotPublished, scotStopped] } },
      MAP_MODE_TERRITORY,
      1,
      45,
    )
    const body = sel?.documentTabs?.find((t) => t.id === 'scot')?.bodyHtml ?? ''
    expect(tileOf(body, 'SCoT publié en base')).toContain('href="')
    expect(tileOf(body, 'SCOT DU LITTORAL')).toContain('>ARRÊTÉ<')
  })

  it('pas d’onglet SCoT si la case SCoT est décochée', () => {
    setFicheCatalogFamilyVisibility({ du: true, psmv: true, sup: true, scot: false, mec: true })
    const sel = ficheSelectionFromGpuApi(
      { grid: { name: 'C', insee: '12345' }, parcelFiche: { features: [scotStopped] } },
      MAP_MODE_TERRITORY,
      1,
      45,
    )
    expect(sel?.documentTabs?.some((t) => t.id === 'scot')).toBeFalsy()
  })

  it('mode parcelle : le HTML Documents contient la tuile ARRÊTÉ', () => {
    const sel = ficheSelectionFromGpuApi(
      {
        parcel: { section: 'AB', numero: '0001', code_insee: '12345' },
        parcelFiche: { features: [scotStopped] },
      },
      MAP_MODE_PARCEL,
      1,
      45,
    )
    expect(sel?.parcelDocumentsHtml ?? '').toContain('>ARRÊTÉ<')
  })
})

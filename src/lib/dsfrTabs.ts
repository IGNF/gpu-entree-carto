type DsfrTabPanelApi = { isDisclosed?: boolean; disclose?: () => void }
type DsfrApi = (element: Element) => { tabPanel?: DsfrTabPanelApi } | undefined

/**
 * Onglets pilotés par Vue mais animés par le JS DSFR : aligne DSFR sur le panneau choisi par Vue.
 * Sans JS DSFR (ou panneau pas encore initialisé par lui), sans effet.
 */
export function discloseDsfrTabPanel(panel: Element | null): void {
  const dsfr = (window as { dsfr?: unknown }).dsfr
  if (!panel || typeof dsfr !== 'function') return
  const tabPanel = (dsfr as DsfrApi)(panel)?.tabPanel
  if (tabPanel && tabPanel.isDisclosed === false) tabPanel.disclose?.()
}

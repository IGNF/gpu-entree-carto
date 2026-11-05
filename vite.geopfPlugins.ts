import { readFileSync } from 'node:fs'
import type { Plugin } from 'vite'

/** geopf-extensions-openlayers Search.js — setUrl utilise eval (avertissement Rollup + risque XSS). */
const GEOPF_SEARCH_SET_URL_EVAL =
  /m_url\s*=\s*eval\s*\(\s*"`"\s*\+\s*value\s*\+\s*"`"\s*\)\s*;\s*\/\/\s*insecure\s*!/

const GEOPF_SEARCH_SET_URL_SAFE =
  'm_url = String(value ?? ""); /* entree-carto: pas d’eval (URL service fixe) */'

function isGeopfSearchModuleId(id: string): boolean {
  return (
    id.includes('geopf-extensions-openlayers') &&
    id.replace(/\\/g, '/').endsWith('/Services/Search.js')
  )
}

/**
 * Remplace l’eval de setUrl par une affectation de chaîne (comportement identique pour nos URLs HTTPS).
 * @see https://github.com/IGNF/geopf-extensions-openlayers
 */
export function patchGeopfSearchEval(): Plugin {
  return {
    name: 'entree-carto-geopf-search-eval-patch',
    enforce: 'pre',
    load(id) {
      if (!isGeopfSearchModuleId(id)) return null
      const code = readFileSync(id, 'utf8')
      if (!GEOPF_SEARCH_SET_URL_EVAL.test(code)) return code
      return code.replace(GEOPF_SEARCH_SET_URL_EVAL, GEOPF_SEARCH_SET_URL_SAFE)
    },
  }
}

/** PanelManager.js — ignore les contrôles entree-carto sans id `GP…-123456` (ex. impression). */
const GEOPF_PANEL_MANAGER_FILTER_OLD = `    return controlPanels.filter(p => {
        var panelID = p.id.match(/(\\w+)-[0-9]+/)[1];
        var isException = exceptionPanel.includes(panelID);
        var isOpened = p.getElementsByTagName("button")[0].getAttribute("aria-pressed");
        if (isOpened === "true" && !isException) {
            return p;
        }
    });`

const GEOPF_PANEL_MANAGER_FILTER_NEW = `    return controlPanels.filter(p => {
        if (!p || typeof p.id !== "string") {
            return false;
        }
        var panelMatch = p.id.match(/(\\w+)-[0-9]+/);
        if (!panelMatch) {
            return false;
        }
        var panelID = panelMatch[1];
        var isException = exceptionPanel.includes(panelID);
        var firstButton = p.getElementsByTagName("button")[0];
        if (!firstButton) {
            return false;
        }
        var isOpened = firstButton.getAttribute("aria-pressed");
        if (isOpened === "true" && !isException) {
            return p;
        }
        return false;
    });`

const GEOPF_WIDGET_ON_PANEL_OPEN_OLD = `        PanelManager(this.options.position, this.element.id.match(/(\\w+)-[0-9]+/)[1], this);`
const GEOPF_WIDGET_ON_PANEL_OPEN_NEW = `        var idMatch = this.element && this.element.id && this.element.id.match(/(\\w+)-[0-9]+/);
        if (!idMatch) {
            return;
        }
        PanelManager(this.options.position, idMatch[1], this);`

const GEOPF_WIDGET_ON_PANEL_CLOSE_OLD = `        PanelManagerClose(this.element.id.match(/(\\w+)-[0-9]+/)[1], this);`
const GEOPF_WIDGET_ON_PANEL_CLOSE_NEW = `        var idMatch = this.element && this.element.id && this.element.id.match(/(\\w+)-[0-9]+/);
        if (!idMatch) {
            return;
        }
        PanelManagerClose(idMatch[1], this);`

function isGeopfPanelManagerId(id: string): boolean {
  return (
    id.includes('geopf-extensions-openlayers') &&
    id.replace(/\\/g, '/').endsWith('/Utils/PanelManager.js')
  )
}

function isGeopfWidgetId(id: string): boolean {
  return (
    id.includes('geopf-extensions-openlayers') &&
    id.replace(/\\/g, '/').endsWith('/Controls/Widget.js')
  )
}

/**
 * Évite TypeError quand un widget geopf ouvre son panneau alors que `.position-container-*`
 * contient aussi des contrôles entree-carto (impression, croquis) sans id geopf.
 */
export function patchGeopfPanelManager(): Plugin {
  return {
    name: 'entree-carto-geopf-panel-manager-patch',
    enforce: 'pre',
    load(id) {
      if (isGeopfPanelManagerId(id)) {
        const code = readFileSync(id, 'utf8')
        if (!code.includes('panelID = p.id.match')) return code
        return code.replace(GEOPF_PANEL_MANAGER_FILTER_OLD, GEOPF_PANEL_MANAGER_FILTER_NEW)
      }
      if (isGeopfWidgetId(id)) {
        let code = readFileSync(id, 'utf8')
        if (code.includes(GEOPF_WIDGET_ON_PANEL_OPEN_OLD)) {
          code = code.replace(GEOPF_WIDGET_ON_PANEL_OPEN_OLD, GEOPF_WIDGET_ON_PANEL_OPEN_NEW)
        }
        if (code.includes(GEOPF_WIDGET_ON_PANEL_CLOSE_OLD)) {
          code = code.replace(GEOPF_WIDGET_ON_PANEL_CLOSE_OLD, GEOPF_WIDGET_ON_PANEL_CLOSE_NEW)
        }
        return code
      }
      return null
    },
  }
}

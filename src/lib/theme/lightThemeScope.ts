/**
 * Zone forcée en thème clair (impression : aperçu et rendu final) alors que la page est en sombre.
 * Le DSFR ne définit le sombre que sur `:root[data-fr-theme=dark]` : on redéclare sur la zone les valeurs
 * claires (`:root`) des variables modifiées par le sombre, plus celles construites avec `var()`
 * (résolues sur `:root`, elles hériteraient sinon de la valeur sombre).
 */
export const LIGHT_THEME_SCOPE_CLASS = 'ec-light-theme'

let injected = false

function styleRules(): CSSStyleRule[] {
  const out: CSSStyleRule[] = []
  for (const sheet of document.styleSheets) {
    let rules: CSSRuleList
    try {
      rules = sheet.cssRules
    } catch {
      continue // feuille d’une autre origine
    }
    for (const rule of rules) if (rule instanceof CSSStyleRule) out.push(rule)
  }
  return out
}

function customProps(rule: CSSStyleRule): [string, string][] {
  const out: [string, string][] = []
  for (let i = 0; i < rule.style.length; i++) {
    const name = rule.style.item(i)
    if (name.startsWith('--')) out.push([name, rule.style.getPropertyValue(name).trim()])
  }
  return out
}

export function ensureLightThemeScopeStyle(): void {
  if (injected) return
  const rules = styleRules()
  const darkNames = new Set(
    rules
      .filter((r) => /^:root\[data-fr-theme=["']?dark["']?\]$/.test(r.selectorText))
      .flatMap((r) => customProps(r).map(([name]) => name)),
  )
  // Feuilles DSFR pas encore chargées : on réessaiera à la prochaine impression.
  if (!darkNames.size) return
  const light = new Map<string, string>()
  for (const rule of rules) {
    if (rule.selectorText !== ':root') continue
    for (const [name, value] of customProps(rule)) {
      if (darkNames.has(name) || value.includes('var(')) light.set(name, value)
    }
  }
  const decls = [...light].map(([name, value]) => `${name}: ${value}`).join(';')
  const style = document.createElement('style')
  style.dataset.ecLightTheme = ''
  style.textContent = `.${LIGHT_THEME_SCOPE_CLASS}{${decls};color-scheme:light;color:var(--text-default-grey)}`
  document.head.appendChild(style)
  injected = true
}

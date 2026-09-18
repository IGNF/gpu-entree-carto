import { darkTheme, lightTheme, type NotivueTheme } from 'notivue'

/** Surcharges cartes.gouv.fr (entree-carto) — alignées sur `Main.vue` de référence. */
export const cartoNotificationsThemeOverrides: NotivueTheme = {
  '--nv-radius': '0',
  '--nv-width': '350px',
  '--nv-border-width': '1px',
  '--nv-icon-size': '30px',
  '--nv-success-accent': '#18753c',
  '--nv-success-border': '#18753c',
  '--nv-error-accent': '#ce0500',
  '--nv-error-border': '#ce0500',
  '--nv-warning-accent': '#b34000',
  '--nv-warning-border': '#b34000',
  '--nv-info-accent': '#0063cb',
  '--nv-info-border': '#0063cb',
}

export function resolveCartoNotificationsTheme(isDark: boolean): NotivueTheme {
  const base = isDark ? darkTheme : lightTheme
  return { ...base, ...cartoNotificationsThemeOverrides }
}

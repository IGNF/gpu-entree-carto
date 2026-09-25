[![en](https://img.shields.io/badge/lang-en-red.svg)](Notifications.md)
[![fr](https://img.shields.io/badge/lang-fr-blue.svg)](Notifications.fr.md)

# Notifications (Notivue)

**cartes.gouv.fr-style** toasts for user feedback (success, error, warning, info).

**Reference:** [cartes.gouv.fr-entree-carto](https://github.com/IGNF/cartes.gouv.fr-entree-carto) — `Main.vue`, `main.ts`, icons `src/icons/Notification*.vue`.

## Stack

| Element           | File                                                  |
| ----------------- | ----------------------------------------------------- |
| Vue plugin        | [notivue](https://docs.notivue.smastrom.io/) `^2.4.x` |
| Container + theme | `src/components/notifications/CartoNotifications.vue` |
| DSFR theme        | `src/lib/notifications/cartoNotificationsTheme.ts`    |
| `push.*` API      | `src/lib/notifications/cartoNotifications.ts`         |
| CSS overrides     | `src/styles/notifications.css`                        |
| Icons             | `src/components/notifications/icons/`                 |

## Global configuration

In `src/main.ts`:

- `createNotivue({ position: 'bottom-center', limit: 3, enqueue: true, duration: 5000, … })` — auto-dismiss after **5 s**
- CSS: `notivue/notification.css`, `notivue/animations.css`, `styles/notifications.css`
- Mount: `<CartoNotifications />` in `App.vue`

## Usage

```ts
import { push } from '@/lib/notifications/cartoNotifications'

push.success({ title: 'Enregistré', message: 'Vos modifications ont été sauvegardées.' })
push.error({ title: 'Erreur', message: 'Impossible de charger la couche.' })
push.warning({ title: 'Attention', message: '…' })
push.info({ title: 'Information', message: '…' })
```

Theme follows DSFR light / dark scheme (`useScheme`).

## Demo

On `/map` (`DemoView.vue`), fixed **“Notif test”** button (top left) → `pushRandomLifeNotification()` to validate rendering (random text, random type). **Temporary** — remove once business integrations are in place.

## Customisation

Overridden Notivue variables (DSFR colours):

- Success: `#18753c`
- Error: `#ce0500`
- Warning: `#b34000`
- Info: `#0063cb`
- Width: `350px`, corners: `--nv-radius: 0`

Long messages: scroll in `.Notivue__content-message` (max `min(32vh, 12rem)`).

# Notifications (Notivue)

Toasts **style cartes.gouv.fr** pour retours utilisateur (succès, erreur, avertissement, info).

**Référence :** [cartes.gouv.fr-entree-carto](https://github.com/IGNF/cartes.gouv.fr-entree-carto) — `Main.vue`, `main.ts`, icônes `src/icons/Notification*.vue`.

## Stack

| Élément | Fichier |
| ------- | ------- |
| Plugin Vue | [notivue](https://docs.notivue.smastrom.io/) `^2.4.x` |
| Conteneur + thème | `src/components/notifications/CartoNotifications.vue` |
| Thème DSFR | `src/lib/notifications/cartoNotificationsTheme.ts` |
| API `push.*` | `src/lib/notifications/cartoNotifications.ts` |
| Surcharges CSS | `src/styles/notifications.css` |
| Icônes | `src/components/notifications/icons/` |

## Configuration globale

Dans `src/main.ts` :

- `createNotivue({ position: 'bottom-center', limit: 3, enqueue: true, duration: 5000, … })` — disparition automatique après **5 s**
- CSS : `notivue/notification.css`, `notivue/animations.css`, `styles/notifications.css`
- Montage : `<CartoNotifications />` dans `App.vue`

## Utilisation

```ts
import { push } from '@/lib/notifications/cartoNotifications'

push.success({ title: 'Enregistré', message: 'Vos modifications ont été sauvegardées.' })
push.error({ title: 'Erreur', message: 'Impossible de charger la couche.' })
push.warning({ title: 'Attention', message: '…' })
push.info({ title: 'Information', message: '…' })
```

Le thème suit le schéma clair / sombre DSFR (`useScheme`).

## Démo

Sur `/map` (`DemoView.vue`), bouton fixe **« Notif test »** (haut gauche) → `pushRandomLifeNotification()` pour valider le rendu (texte aléatoire, type aléatoire). **Temporaire** — à retirer une fois les intégrations métier en place.

## Personnalisation

Variables Notivue surchargées (couleurs DSFR) :

- Succès : `#18753c`
- Erreur : `#ce0500`
- Avertissement : `#b34000`
- Info : `#0063cb`
- Largeur : `350px`, coins : `--nv-radius: 0`

Messages longs : scroll dans `.Notivue__content-message` (max `min(32vh, 12rem)`).

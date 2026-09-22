import { push } from 'notivue'

export { push }

export type CartoNotificationKind = 'success' | 'error' | 'warning' | 'info'

const LIFE_TITLES = [
  'Petite pause carto',
  'Pensée du jour',
  'Message de la vie',
  'Interlude existentiel',
  'Note au passage',
] as const

const LIFE_MESSAGES = [
  'La vie, c’est comme une carte : parfois il faut zoomer pour voir le détail, parfois dézoomer pour respirer.',
  'Un café bien chaud vaut parfois mieux qu’un fond ortho à 20 cm.',
  'Même les tuiles WMTS ont droit à une pause tuile… euh, tuile ? pause.',
  'Le vent souffle où il veut ; la boussole, elle, reste polie.',
  'Chaque matin est une nouvelle emprise : dessinez-la avec douceur.',
  'Les nuages passent, les couches vectorielles restent (enfin, presque).',
  'Prendre le temps, c’est accepter que le chargement ne soit pas toujours instantané.',
  'La mer monte, mais votre bonne humeur peut aussi.',
  'Un croissant au beurre : meilleur que n’importe quel buffer de 500 m.',
  'Parfois la meilleure route, c’est celle où l’on s’arrête pour regarder le paysage.',
  'La vie n’est pas un GPS : les recalculs font partie du trajet.',
  'Sourire à un inconnu : micro-interaction gratuite, latence nulle.',
  'Les saisons changent ; vos bookmarks, eux, méritent d’être sauvegardés.',
  'Un dimanche pluvieux reste un bon jour pour trier ses favoris carto.',
  'Le bonheur tient parfois dans un rayon de recherche bien choisi.',
] as const

function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]!
}

/** Démo temporaire — notification aléatoire « philosophie carto / vie ». */
export function pushRandomLifeNotification(): void {
  const kinds: CartoNotificationKind[] = ['success', 'error', 'warning', 'info']
  const kind = pickRandom(kinds)
  push[kind]({
    title: pickRandom(LIFE_TITLES),
    message: pickRandom(LIFE_MESSAGES),
  })
}

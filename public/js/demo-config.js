/**
 * Configuration de la démo Vite (SPA entree-carto).
 * Équivalent de gpu-client `public/js/exemple-config.js` — modifier ce fichier
 * pour changer d’environnement ou de jeu de test sans toucher au code Vue.
 */
window.DEMO_CONFIG = {
  /**
   * URL du script gpu-client-config (prod / dev / local), optionnel.
   * S’il est défini, le script est chargé au démarrage de `/map` (globals LAYER_CONFIG, …).
   */
  configScriptUrl: 'http://127.0.0.1:8000/map/gpu-client-config.js',

  /** Document GPU à ouvrir au chargement (optionnel). */
  document: null,

  /** Bbox initiale [minLon, minLat, maxLon, maxLat] (EPSG:4326), si pas de handoff recherche. */
  bbox: null,

  /** Surcharges de gpu.config (URLs WFS, WMS, API, etc.). */
  gpuConfigOverrides: {},

  /** Options carte démo (`/map`). */
  map: {
    /** Fond actif (Plan IGN par défaut) : carte | carte-nb | photo | mixte | cadastre | blank */
    baseLayerId: 'carte',
    zoom: 6,
    /**
     * Catalogue « Données » (onglet panneau latéral).
     * visible = cochée dans le catalogue au chargement.
     */
    layerNodes: [
      {
        id: 'demo-plu',
        title: 'Document d’urbanisme (exemple)',
        visible: true,
        legend: [{ id: 'demo-plu-leg', title: 'Zonage PLU (exemple)' }],
      },
      {
        id: 'demo-sup',
        title: 'Servitude (exemple)',
        visible: false,
        legend: [{ id: 'demo-sup-leg', title: 'Servitude (exemple)' }],
      },
    ],
    /** Recherche initiale (ignorée si handoff depuis l’accueil). */
    search: null,
  },

  /** Page d’accueil `/`. */
  home: {
    searchPlaceholder: 'Rechercher une adresse, une ville, un lieu...',
  },
}

/* Exemples configScriptUrl — décommenter :
   configScriptUrl: 'https://www.geoportail-urbanisme.gouv.fr/map/gpu-client-config.js',
   configScriptUrl: 'https://gpu-site.dev.gpf-tech.ign.fr/map/gpu-client-config.js',
   configScriptUrl: 'http://127.0.0.1:8000/map/gpu-client-config.js',
*/

/* Exemples document + bbox (décommenter un bloc pour tester sur /map) :
   document: { id: "ab096fc3f428f83bf4a18905abca37b6", status: "document.preview", type: "MEC", name: "MEC_2_DU_31526" },
   bbox: [1.2612752, 43.5753447, 1.2657237, 43.5799266],

   document: { id: "a26e7ef14e3a52bdbe7f01e4bcd4faaa", status: "document.production", type: "SUP", name: "172014607_SUP_18_AC4" },
   bbox: [2.3885412, 47.0792232, 2.8671817, 47.3417972],
*/

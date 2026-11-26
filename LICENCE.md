# entree-carto

Ce logiciel est diffusé sous la licence CeCILL-B (compatible BSD modifiée).

Vous pouvez obtenir une copie de la licence à l’adresse :

http://www.cecill.info/licences/Licence_CeCILL-B_V1-fr.txt (français)

Voir http://www.cecill.info/

Copyright (c) 2024–2026 IGN

## Code tiers

L’application **entree-carto** et ses bundles bibliothèque (`dist/`) incorporent des composants tiers déclarés dans `package.json`. Parmi les dépendances d’exécution principales, sans exhaustivité :

| Composant | Licence | Projet |
| --------- | ------- | ------ |
| OpenLayers (`ol`) | BSD-2-Clause | https://openlayers.org/ |
| Vue.js | MIT | https://vuejs.org/ |
| vue-router | MIT | https://router.vuejs.org/ |
| geopf-extensions-openlayers | CeCILL-B (voir amont) | https://github.com/IGNF/geopf-extensions-openlayers |
| @gouvfr/dsfr | MIT | https://github.com/GouvernementFR/dsfr |
| @gouvminint/vue-dsfr | MIT | https://github.com/dnum-mi/vue-dsfr |
| Remix Icon | Apache-2.0 | https://github.com/Remix-Design/RemixIcon |
| DOMPurify | Apache-2.0 OR MPL-2.0 | https://github.com/cure53/DOMPurify |
| fast-xml-parser | MIT | https://github.com/NaturalIntelligence/fast-xml-parser |
| notivue | MIT | https://github.com/carlohamal/notivue |
| @iconify/vue | MIT | https://github.com/iconify/iconify |

Liste complète : `npm ls --omit=dev`. Les textes de licence du code embarqué sont disponibles dans les dépôts amont ou dans `node_modules/<package>/LICENSE` après `npm install`.

# entree-carto

[![en](https://img.shields.io/badge/lang-en-red.svg)](LICENCE.md)
[![fr](https://img.shields.io/badge/lang-fr-blue.svg)](LICENCE.fr.md)

This software is released under the CeCILL-B licence (Free BSD compatible).

You may obtain a copy of the licence at:

http://www.cecill.info/licences/Licence_CeCILL-B_V1-en.txt (English)

http://www.cecill.info/licences/Licence_CeCILL-B_V1-fr.txt (French)

See http://www.cecill.info/

Copyright (c) 2024–2026 IGN

## Third party code

The **entree-carto** application and its library bundles (`dist/`) incorporate third-party components listed in [DEPENDENCIES.md](DEPENDENCIES.md). Main runtime dependencies include, without limitation:

| Component | Licence | Project |
| --------- | ------- | ------- |
| OpenLayers (`ol`) | BSD-2-Clause | https://openlayers.org/ |
| Vue.js | MIT | https://vuejs.org/ |
| vue-router | MIT | https://router.vuejs.org/ |
| geopf-extensions-openlayers | CeCILL-B (see upstream) | https://github.com/IGNF/geopf-extensions-openlayers |
| @gouvfr/dsfr | MIT | https://github.com/GouvernementFR/dsfr |
| @gouvminint/vue-dsfr | MIT | https://github.com/dnum-mi/vue-dsfr |
| Remix Icon | Apache-2.0 | https://github.com/Remix-Design/RemixIcon |
| DOMPurify | Apache-2.0 OR MPL-2.0 | https://github.com/cure53/DOMPurify |
| fast-xml-parser | MIT | https://github.com/NaturalIntelligence/fast-xml-parser |
| notivue | MIT | https://github.com/carlohamal/notivue |
| @iconify/vue | MIT | https://github.com/iconify/iconify |

Full dependency names and versions are documented in [DEPENDENCIES.md](DEPENDENCIES.md). Licence texts for bundled code are available in the corresponding upstream repositories or in `node_modules/<package>/LICENSE` after `npm install`.

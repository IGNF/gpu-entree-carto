/** Déclarations minimales pour geopf-extensions-openlayers (sans types officiels). */
declare module 'geopf-extensions-openlayers/src/packages/Controls/Zoom/GeoportalZoom.js' {
  import type Control from 'ol/control/Control'
  export default class GeoportalZoom extends Control {
    constructor(options?: Record<string, unknown>)
  }
}

declare module 'geopf-extensions-openlayers/src/packages/Controls/FullScreen/GeoportalFullScreen.js' {
  import type Control from 'ol/control/Control'
  export default class GeoportalFullScreen extends Control {
    constructor(options?: Record<string, unknown>)
  }
}

declare module 'geopf-extensions-openlayers/src/packages/Controls/OverviewMap/GeoportalOverviewMap.js' {
  import type Control from 'ol/control/Control'
  export default class GeoportalOverviewMap extends Control {
    constructor(options?: Record<string, unknown>)
  }
}

declare module 'geopf-extensions-openlayers/src/packages/Controls/Territories/Territories.js' {
  import type Control from 'ol/control/Control'
  export default class Territories extends Control {
    constructor(options?: Record<string, unknown>)
  }
}

declare module 'geopf-extensions-openlayers/src/packages/Controls/SearchEngine/SearchEngineAdvanced.js' {
  import type Control from 'ol/control/Control'
  export default class SearchEngineAdvanced extends Control {
    constructor(options?: Record<string, unknown>)
  }
}

declare module 'geopf-extensions-openlayers/src/packages/Controls/SearchEngine/InseeAdvancedSearch.js' {
  export default class InseeAdvancedSearch {
    constructor(options?: Record<string, unknown>)
  }
}

declare module 'geopf-extensions-openlayers/src/packages/Controls/SearchEngine/LocationAdvancedSearch.js' {
  export default class LocationAdvancedSearch {
    constructor(options?: Record<string, unknown>)
  }
}

declare module 'geopf-extensions-openlayers/src/packages/Controls/SearchEngine/CoordinateAdvancedSearch.js' {
  export default class CoordinateAdvancedSearch {
    constructor(options?: Record<string, unknown>)
  }
}

declare module 'geopf-extensions-openlayers/src/packages/Controls/SearchEngine/ParcelAdvancedSearch.js' {
  export default class ParcelAdvancedSearch {
    constructor(options?: Record<string, unknown>)
  }
}

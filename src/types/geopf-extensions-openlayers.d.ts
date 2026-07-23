/** Déclarations minimales pour geopf-extensions-openlayers (sans types officiels). */
declare module 'geopf-extensions-openlayers' {
  import type Control from 'ol/control/Control'

  export class GeoportalZoom extends Control {
    constructor(options?: Record<string, unknown>)
  }

  export class GeoportalFullScreen extends Control {
    constructor(options?: Record<string, unknown>)
  }

  export class GeoportalOverviewMap extends Control {
    constructor(options?: Record<string, unknown>)
  }

  export class GeoportalAttribution extends Control {
    constructor(options?: Record<string, unknown>)
  }
}

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

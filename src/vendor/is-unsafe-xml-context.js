/**
 * Fork ponctuel de is-unsafe `contexts/xml.js` (MIT, Natural Intelligence).
 * `xml-comment-close` : inclut `--!>` (clôture commentaire HTML legacy) pour js/bad-html-filtering-regexp (CodeQL).
 */
const XML_PATTERNS = [
  {
    id: 'xml-cdata-injection',
    description: 'CDATA section injection: <![CDATA[ breaks out of text node context',
    pattern: /<!\[CDATA\[/i,
  },
  {
    id: 'xml-cdata-close',
    description: 'CDATA close sequence: ]]> can terminate an enclosing CDATA section',
    pattern: /\]\]>/,
  },
  {
    id: 'xml-processing-instruction',
    description: 'XML processing instruction: <?xml-stylesheet or <?php etc.',
    pattern: /<\?(?:xml[- ]|php|asp)/i,
  },
  {
    id: 'xml-doctype-injection',
    description: 'DOCTYPE declaration embedded in content — can define entities',
    pattern: /<!DOCTYPE(?:[\s[]|$)/i,
  },
  {
    id: 'xml-entity-system',
    description: 'SYSTEM keyword — used in external entity declarations (XXE)',
    pattern: /\bSYSTEM\s+["']/i,
  },
  {
    id: 'xml-entity-public',
    description: 'PUBLIC keyword — used in external entity declarations (XXE)',
    pattern: /\bPUBLIC\s+["']/i,
  },
  {
    id: 'xml-entity-declaration',
    description: '<!ENTITY declaration — defines entities, potential XXE or entity expansion',
    pattern: /<!ENTITY[\s%]/i,
  },
  {
    id: 'xml-billion-laughs',
    description: 'Entity reference chaining / billion laughs: repeated &eX; style references',
    pattern: /(?:&\w{1,20};){3,}/,
  },
  {
    id: 'xml-namespace-confusion',
    description: 'xmlns: attribute injection — can redefine namespaces to confuse parsers',
    pattern: /\bxmlns(?::\w{1,40})?\s*=/i,
  },
  {
    id: 'xml-comment-injection',
    description: '<!-- comment injection — can hide content from some parsers',
    pattern: /<!--/,
  },
  {
    id: 'xml-comment-close',
    description: 'HTML/XML comment close: --> or legacy --!>',
    pattern: /--!?>/,
  },
  {
    id: 'xml-pi-close',
    description: '?> closes an enclosing processing instruction',
    pattern: /\?>/,
  },
]

export default XML_PATTERNS

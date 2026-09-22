/** Curseurs carte — modes modification croquis (24×24, #000091). */
const BLUE = '#000091'

function cursorUrl(svg: string): string {
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") 12 12, pointer`
}

const TRANSLATE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path fill="${BLUE}" d="M13 5.83V11h5.17l-1.59-1.59L18 8l4 4-4 4-1.41-1.41L18.17 13H13v5.17l1.59-1.59L16 18l-4 4-4-4 1.41-1.41L11 18.17V13H5.83l1.59 1.59L6 16l-4-4 4-4 1.41 1.41L5.83 11H11V5.83L9.41 7.41 8 6l4-4 4 4-1.41 1.41L13 5.83z"/></svg>`

const ROTATE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path fill="${BLUE}" d="M12 5V1L7 6l5 5V7c2.76 0 5 2.24 5 5 0 .65-.13 1.28-.36 1.86l1.53 1.53C18.7 14.34 19 13.2 19 12c0-3.87-3.13-7-7-7zM6 12c0-.65.13-1.28.36-1.86L4.83 8.61C4.3 9.66 4 10.8 4 12c0 3.87 3.13 7 7 7v4l5-5-5-5v4c-2.76 0-5-2.24-5-5z"/></svg>`

export const SKETCH_MODIFY_TRANSLATE_CURSOR = cursorUrl(TRANSLATE_SVG)
export const SKETCH_MODIFY_ROTATE_CURSOR = cursorUrl(ROTATE_SVG)
export const SKETCH_MODIFY_ROTATE_GRABBING_CURSOR = cursorUrl(ROTATE_SVG).replace(
  'pointer',
  'grabbing',
)

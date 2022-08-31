/**
 * Inserts a <script> tag to load embedly into the document.
 *
 * This is based on https://docs.embed.ly/reference/platformjs with a few
 * differences around naming and typescript.
 */
const ensureEmbedlyPlatform = function ensureEmbedlyPlatform() {
  const id = 'embedly-platform'
  if (!document.getElementById(id)) {
    const protocol = 'https:' === document.location.protocol ? 'https' : 'http'
    const tagName = 'script'
    // @ts-expect-error embedly wants itself to be global
    // **we** don't access it on the global object (maybe it does itself)
    // so let's not extend the global window object.
    window.embedly = window.embedly || function() {
      // @ts-expect-error embedly again
      // eslint-disable-next-line prefer-rest-params
      (window.embedly.q = window.embedly.q || []).push(arguments)
    }
    const el = document.createElement(tagName)
    el.id = id
    el.async = true
    el.src = `${protocol}://cdn.embedly.com/widgets/platform.js`
    const s = document.getElementsByTagName(tagName)[0]
    s.parentNode?.insertBefore(el, s)
  }
}

export { ensureEmbedlyPlatform }

/**
 * Embedly's events
 */
type RawEmbedlyEventType = "card.rendered"
type EmbedlyCallback = (iframe: HTMLIFrameElement) => void
/**
 * See https://docs.embed.ly/reference/platformjs for more
 */
interface Embedly {
  (action: "on", event: RawEmbedlyEventType, cb: EmbedlyCallback): void
  q: unknown[]
}

/**
 * Our CustomEvent types wrapping embedly's.
 */
enum EmbedlyEventTypes {
  /**
   * Custom event emitted when embedly creates a card. The event target is the
   * card's iframe.
   */
  CardCreated = "embedly:card.created"
}

const dispatchCardCreated = (iframe: HTMLIFrameElement) => {
  const event = new CustomEvent(EmbedlyEventTypes.CardCreated, {
    bubbles: true
  })
  iframe.dispatchEvent(event)
}

/**
 * Returns the embedly object, loading it if it has not already been loaded.
 *
 * @notes
 *  - tells emebedly to emit certain CustomEvent; see {@link EmbedlyEventTypes}
 *  - based on on https://docs.embed.ly/reference/platformjs
 */
const ensureEmbedlyPlatform = () => {
  const id = "embedly-platform"
  // @ts-expect-error embedly wants itself to be global. Except within this
  // function, we will access embedly via this function return value, so let's
  // not extend the global object
  const w = window as Window & { embedly: Embedly }

  if (!document.getElementById(id)) {
    const protocol = "https:" === document.location.protocol ? "https" : "http"
    const tagName = "script"
    w.embedly =
      w.embedly ||
      function(...args) {
        (w.embedly.q = w.embedly.q || []).push(args)
      }
    const el = document.createElement(tagName)
    el.id = id
    el.async = true
    el.src = `${protocol}://cdn.embedly.com/widgets/platform.js`
    const s = document.getElementsByTagName(tagName)[0]
    if (s) {
      s.parentNode?.insertBefore(el, s)
    } else {
      document.head.appendChild(el)
    }

    w.embedly("on", "card.rendered", dispatchCardCreated)
  }

  return w.embedly
}

/**
 * Create a stylesheet in the given with the provided css text. Appends the
 * stylesheet to document head.
 *
 * Useful for adding styles to an IFrame or ShadowRoot
 */
const createStylesheet = (doc: Document, css: string) => {
  const head = doc.head
  const style = doc.createElement("style")
  style.innerHTML = css
  head.appendChild(style)
}

const getEmbedlyKey = (): string | null => {
  const key = window.SETTINGS?.embedlyKey
  if (typeof key === "string") return key
  console.warn("window.SETTINGS.EMBEDLY_KEY should be a string.")
  return null
}

export {
  createStylesheet,
  ensureEmbedlyPlatform,
  getEmbedlyKey,
  EmbedlyEventTypes,
  dispatchCardCreated
}

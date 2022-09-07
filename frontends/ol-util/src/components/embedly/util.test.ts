/* eslint-disable testing-library/no-node-access */
import { waitFor } from "@testing-library/react"
import { assertNotNil } from "ol-util"
import {
  createStylesheet,
  EmbedlyEventTypes,
  ensureEmbedlyPlatform
} from "./util"

describe("getEmbedly", () => {
  let embedlySpy: jest.Mock
  beforeEach(() => {
    document.head.innerHTML = ""
    document.body.innerHTML = ""

    // embedly's insertion requires at least one script on the page
    const script = document.createElement("script")
    document.head.appendChild(script)
    embedlySpy = jest.fn()
    // @ts-expect-error embedly will grab itself off the window if it's there
    window.embedly = embedlySpy
  })

  it("inserts a single script tag loading embedly src", () => {
    ensureEmbedlyPlatform()
    const scripts = document.querySelectorAll("script")
    expect(scripts.length).toBe(2)
    expect(scripts[0].src).toBe("http://cdn.embedly.com/widgets/platform.js")
  })

  it("causes embedly to emit custom card creation events", async () => {
    ensureEmbedlyPlatform()
    expect(embedlySpy).toHaveBeenCalledWith(
      "on",
      "card.rendered",
      expect.any(Function) // this is the onCardRendered callback
    )

    /**
     * Normally, when embedly creates a card, it would call onCardRendered with
     * an iframe as the argument.
     *
     * We don't have embedly in this test environment. But let's test that
     * `onCardRendered` does the correct thing when given an iframe.
     *
     * Set up:
     * <body>
     *   <div>
     *     <iframe />
     *   </div>
     * </body>
     */
    const onCardRendered = embedlySpy.mock.calls[0][2]
    const container = document.createElement("div")
    const iframe = document.createElement("iframe")
    document.body.appendChild(container)
    container.appendChild(iframe)

    const listener = jest.fn()
    container.addEventListener(EmbedlyEventTypes.CardCreated, listener)
    onCardRendered(iframe)

    await waitFor(() => {
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          target: iframe
        })
      )
    })
  })

  it("only loads embedly once", () => {
    ensureEmbedlyPlatform()
    ensureEmbedlyPlatform()
    ensureEmbedlyPlatform()

    expect(document.querySelectorAll("script").length).toBe(2)
    expect(embedlySpy).toHaveBeenCalledTimes(1)
    // @ts-expect-error checking window embedly is still same as original
    expect(window.embedly).toBe(embedlySpy)
  })
})

describe("createStylesheet", () => {
  it("inserts a stylesheet into an iframe's document", () => {
    const iframe = document.createElement("iframe")
    document.body.appendChild(iframe)

    assertNotNil(iframe.contentDocument)
    createStylesheet(iframe.contentDocument, ".foo { color: blue }")
    const styles = iframe.contentDocument.querySelectorAll("head style")
    expect(styles.length).toBe(1)
    expect(styles[0].innerHTML).toBe(".foo { color: blue }")
  })
})

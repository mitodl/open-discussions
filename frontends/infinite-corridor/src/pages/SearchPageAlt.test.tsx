import { assertInstanceOf } from "ol-util"
import { screen, renderTestApp, setMockResponse } from "../test-utils"
import { fireEvent, waitFor } from "@testing-library/react"
import { makeSearchResponse } from "../factories/search"
import { makeRequest } from "../test-utils/mockAxios"

/**
 * This is a bit of a hack to enable `react-infinite-scroller` to respond to
 * scroll events in jsdom. This will be somewhat fragile as it relies on the
 * current implementation of scrolling in `react-infinite-scroller`.
 *
 * - `react-infinite-scroller` does not respond to scroll events on an element
 *    if the element does not have an `[offset parent](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/offsetParent)`
 * - JSDOM does not implement `offsetParent` property (it is always null).
 *
 * So this patches `offsetParent` to return `document.body`
 */
const enableInfiniteScrollerScrolling = async () => {
  const results = await screen.findByLabelText("Search Results", {
    exact: false
  })
  // eslint-disable-next-line testing-library/no-node-access
  const scroller = results.parentNode
  assertInstanceOf(scroller, HTMLElement)
  jest.spyOn(scroller, "offsetParent", "get").mockReturnValue(document.body)
}

describe("SearchPage", () => {
  test("existence", async () => {
    setMockResponse.post("/search", {
      hits: { hits: [], total: 0 }
    })
    renderTestApp({ url: "/search?physics" })
    await screen.findByText("No results", { exact: false })
  })

  test("foo", async () => {
    const firstResponse = makeSearchResponse()
    setMockResponse.post("/search", firstResponse)
    renderTestApp({ url: "/search?physics" })

    await enableInfiniteScrollerScrolling()
    fireEvent.scroll(window)

    await waitFor(async () => {
      const results = await screen.findAllByText("Offered by", { exact: false })
      expect(results).toHaveLength(40)
    })

    expect(makeRequest.mock.calls[0]).toEqual(
      expect.arrayContaining([
        "post",
        "/search",
        expect.objectContaining({
          from: 0,
          size: 20
        })
      ])
    )

    expect(makeRequest.mock.calls[1]).toEqual(
      expect.arrayContaining([
        "post",
        "/search",
        expect.objectContaining({
          from: 20,
          size: 20
        })
      ])
    )
  })
})

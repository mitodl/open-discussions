import { assertInstanceOf } from "ol-util"
import {
  screen,
  renderTestApp,
  setMockResponse,
} from "../test-utils"
import { fireEvent, waitFor } from "@testing-library/react"
import { makeSearchResponse } from "../factories/search"
import { makeRequest } from "../test-utils/mockAxios"

const enableScrollingResultsInJsDom = async () => {
  const results = await screen.findByLabelText("Search Results", { exact: false })
  // eslint-disable-next-line testing-library/no-node-access
  const scroller = results.parentNode
  assertInstanceOf(scroller, HTMLElement)
  jest.spyOn(scroller, 'offsetParent', 'get').mockReturnValue(document.body)
}

describe("SearchPage", () => {
  test("existence", async () => {
    setMockResponse.post("/search", {
      hits: { hits: [], total: 0 }
    })
    renderTestApp({ url: '/search?physics' })
    await screen.findByText("No results", { exact: false })
  })

  test("foo", async () => {
    const firstResponse = makeSearchResponse()
    setMockResponse.post("/search", firstResponse)
    renderTestApp({ url: '/search?physics' })

    await enableScrollingResultsInJsDom()
    fireEvent.scroll(window)

    await waitFor(async () => {
      const results = await screen.findAllByText('Offered by', { exact: false })
      expect(results).toHaveLength(40)
    })


    expect(makeRequest.mock.calls[0]).toEqual(expect.arrayContaining([
      'post',
      '/search',
      expect.objectContaining({
        from: 0,
        size: 20
      })
    ]))

    expect(makeRequest.mock.calls[1]).toEqual(expect.arrayContaining([
      'post',
      '/search',
      expect.objectContaining({
        from: 20,
        size: 20
      })
    ]))
  })
})

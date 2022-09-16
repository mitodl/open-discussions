import { when } from "jest-when"

import { makeSearchResponse } from "ol-search-ui/build/factories"
import { buildSearchQuery } from "@mitodl/course-search-utils"

import { assertInstanceOf } from "ol-util"
import { screen, renderTestApp, setMockResponse, user } from "../test-utils"

import { fireEvent, waitFor } from "@testing-library/react"
import { makeRequest } from "../test-utils/mockAxios"

const expectedFacets = {
  audience:            [],
  certification:       [],
  type:                ["program", "course"],
  offered_by:          ["OCW", "MITx", "Open Learning Library", "MicroMasters", "xPRO"],
  topics:              [],
  department_name:     [],
  level:               [],
  course_feature_tags: [],
  resource_type:       []
}

const getSearchTextInput = (): HTMLInputElement => {
  const textInput = screen.getByPlaceholderText("Search for", { exact: false })
  assertInstanceOf(textInput, HTMLInputElement)
  return textInput
}
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
  test("should support InfiniteScroll-ing", async () => {
    const firstResponse = makeSearchResponse()
    const secondResponse = makeSearchResponse()

    when(makeRequest)
      .calledWith("post", "search/", expect.anything())
      .mockResolvedValueOnce({
        data:   firstResponse,
        status: 200
      })
      .mockResolvedValueOnce({
        data:   secondResponse,
        status: 200
      })

    await renderTestApp({ url: "/search" })

    await enableInfiniteScrollerScrolling()
    fireEvent.scroll(window)

    await waitFor(async () => {
      const results = await screen.findAllByText("Offered by", { exact: false })
      expect(results).toHaveLength(9)
    })

    expect(makeRequest.mock.calls[0][0]).toEqual("post")
    expect(makeRequest.mock.calls[0][1]).toEqual("search/")
    expect(makeRequest.mock.calls[0][2]).toMatchObject(
      buildSearchQuery({
        text:         "",
        from:         0,
        activeFacets: expectedFacets,
        sort:         null,
        size:         4
      })
    )

    expect(makeRequest.mock.calls[1][0]).toEqual("post")
    expect(makeRequest.mock.calls[1][1]).toEqual("search/")
    expect(makeRequest.mock.calls[1][2]).toMatchObject(
      buildSearchQuery({
        text:         "",
        from:         4,
        activeFacets: expectedFacets,
        sort:         null,
        size:         4
      })
    )
  })

  test("should render a facet filters for certification, resource type and  offeror", async () => {
    setMockResponse.post("search/", makeSearchResponse())
    await renderTestApp({ url: "/search" })

    await waitFor(async () => {
      expect(screen.getByText("Offered By")).toBeInTheDocument()
    })
    expect(screen.getByText("Learning Resource")).toBeInTheDocument()
    expect(screen.getByText("Certificates")).toBeInTheDocument()
  })

  test("should filter by facets", async () => {
    setMockResponse.post("search/", makeSearchResponse())
    await renderTestApp({ url: "/search" })

    await waitFor(async () => {
      await fireEvent.click(screen.getByDisplayValue("MITx"))
    })

    await waitFor(async () => {
      await fireEvent.click(screen.getByText("Clear All"))
    })
    expect(makeRequest.mock.calls[0][0]).toEqual("post")
    expect(makeRequest.mock.calls[0][1]).toEqual("search/")
    expect(makeRequest.mock.calls[0][2]).toMatchObject(
      buildSearchQuery({
        text:         "",
        from:         0,
        activeFacets: expectedFacets,
        sort:         null,
        size:         4
      })
    )

    const filteredFacets = {
      audience:            [],
      certification:       [],
      type:                ["program", "course"],
      offered_by:          ["MITx"],
      topics:              [],
      department_name:     [],
      level:               [],
      course_feature_tags: [],
      resource_type:       []
    }

    const expectedFacetsAfterClear = {
      audience:      [],
      certification: [],
      offered_by:    [
        "OCW",
        "MITx",
        "Open Learning Library",
        "MicroMasters",
        "xPRO"
      ],
      type:                ["program", "course"],
      topics:              [],
      department_name:     [],
      level:               [],
      course_feature_tags: [],
      resource_type:       []
    }

    expect(makeRequest.mock.calls[1][0]).toEqual("post")
    expect(makeRequest.mock.calls[1][1]).toEqual("search/")
    expect(makeRequest.mock.calls[1][2]).toMatchObject(
      buildSearchQuery({
        text:         "",
        from:         0,
        activeFacets: filteredFacets,
        sort:         null,
        size:         4
      })
    )

    expect(makeRequest.mock.calls[2][0]).toEqual("post")
    expect(makeRequest.mock.calls[2][1]).toEqual("search/")
    expect(makeRequest.mock.calls[2][2]).toMatchObject(
      buildSearchQuery({
        text:         "",
        from:         0,
        activeFacets: expectedFacetsAfterClear,
        sort:         null,
        size:         4
      })
    )
  })

  test("the user should be able to update the search text and submit", async () => {
    setMockResponse.post("search/", {
      hits: { hits: [], total: 0 }
    })
    await renderTestApp({ url: "/search" })

    const textInput = getSearchTextInput()
    await user.type(textInput, "New Search Text{Enter}")

    expect(makeRequest.mock.calls[0][0]).toEqual("post")
    expect(makeRequest.mock.calls[0][1]).toEqual("search/")
    expect(makeRequest.mock.calls[0][2]).toMatchObject(
      buildSearchQuery({
        text:         "",
        from:         0,
        activeFacets: expectedFacets,
        sort:         null,
        size:         4
      })
    )

    expect(makeRequest.mock.calls[1][0]).toEqual("post")
    expect(makeRequest.mock.calls[1][1]).toEqual("search/")
    expect(makeRequest.mock.calls[1][2]).toMatchObject(
      buildSearchQuery({
        text:         "New Search Text",
        from:         0,
        activeFacets: expectedFacets,
        sort:         null,
        size:         4
      })
    )
  })
})

import { when } from "jest-when"

import { makeSearchResponse } from "ol-search-ui/src/factories"
import {
  SearchQueryParams,
  buildSearchQuery
} from "@mitodl/course-search-utils"

import { assertInstanceOf } from "ol-util"
import { createMatchMediaForJsDom } from "ol-util/src/test-utils"
import { screen, renderTestApp, setMockResponse, user } from "../test-utils"

import { fireEvent, waitFor, within } from "@testing-library/react"
import { makeRequest } from "../test-utils/mockAxios"

import LearningResourceCard from "../components/LearningResourceCard"

const spyLearningResourceCard = jest.mocked(LearningResourceCard)

const expectedFacets = {
  audience:            [],
  certification:       [],
  type:                ["program", "course"],
  offered_by:          [],
  topics:              [],
  department_name:     [],
  level:               [],
  course_feature_tags: [],
  resource_type:       []
}

const assertLastSearchRequest = (
  params: SearchQueryParams,
  callCount?: number
) => {
  const calls = makeRequest.mock.calls.filter(([method, url]) => {
    return method === "post" && url === "search/"
  })
  const lastCall = calls[calls.length - 1]
  expect(lastCall[2]).toEqual(buildSearchQuery(params))
  if (callCount !== undefined) {
    expect(calls).toHaveLength(callCount)
  }
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
    const DEFAULT_DEVICE_WIDTH = "1200px"
    window.matchMedia = createMatchMediaForJsDom({ width: DEFAULT_DEVICE_WIDTH })

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
        size:         4,
        aggregations: ["certification", "type", "offered_by"]
      })
    )

    expect(makeRequest.mock.calls[1][0]).toEqual("post")
    expect(makeRequest.mock.calls[1][1]).toEqual("search/")
    expect(makeRequest.mock.calls[1][2]).toMatchObject(
      buildSearchQuery({
        text:         "",
        from:         4,
        activeFacets: expectedFacets,
        size:         4,
        aggregations: ["certification", "type", "offered_by"]
      })
    )
  })

  test.each([
    { width: 200, filtersExpanded: false, showsFilterButton: true },
    { width: 1200, filtersExpanded: true, showsFilterButton: false }
  ])(
    "should render a facet filters for certification, resource type and  offeror",
    async ({ width, filtersExpanded, showsFilterButton }) => {
      window.matchMedia = createMatchMediaForJsDom({ width })

      setMockResponse.post("search/", makeSearchResponse())
      await renderTestApp({ url: "/search" })

      await screen.findByRole("list", { name: "Search Results" })

      expect(!!screen.queryByText("Offered By")).toBe(filtersExpanded)
      expect(!!screen.queryByText("Learning Resource")).toBe(filtersExpanded)
      expect(!!screen.queryByText("Certificates")).toBe(filtersExpanded)

      expect(!!screen.queryByRole("button", { name: "Filter" })).toBe(
        showsFilterButton
      )
    }
  )

  test("should filter by facets", async () => {
    setMockResponse.post("search/", makeSearchResponse())
    const { history } = await renderTestApp({ url: "/search" })

    assertLastSearchRequest(
      {
        from:         0,
        size:         4,
        activeFacets: expectedFacets,
        aggregations: ["certification", "type", "offered_by"]
      },
      1
    )

    await user.click(await screen.findByDisplayValue("MITx"))

    await waitFor(() => {
      expect(history.location.search).toBe("?o=MITx")
    })

    assertLastSearchRequest(
      {
        from:         0,
        size:         4,
        activeFacets: {
          ...expectedFacets,
          offered_by: ["MITx"]
        },
        aggregations: ["certification", "type", "offered_by"]
      },
      2
    )
  })

  test("Clearing facets issues a new request", async () => {
    setMockResponse.post("search/", makeSearchResponse())
    const { history } = await renderTestApp({ url: "/search?o=MITx" })

    assertLastSearchRequest(
      {
        from:         0,
        size:         4,
        activeFacets: {
          ...expectedFacets,
          offered_by: ["MITx"]
        },
        aggregations: ["certification", "type", "offered_by"]
      },
      1
    )

    await waitFor(async () => {
      await user.click(screen.getByText("Clear All"))
    })

    await waitFor(() => {
      expect(history.location).toEqual(
        expect.objectContaining({
          search:   "",
          pathname: "/infinite/search"
        })
      )
    })

    assertLastSearchRequest(
      {
        from:         0,
        size:         4,
        activeFacets: {
          ...expectedFacets
        },
        aggregations: ["certification", "type", "offered_by"]
      },
      2
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
        size:         4,
        aggregations: ["certification", "type", "offered_by"]
      })
    )

    expect(makeRequest.mock.calls[1][0]).toEqual("post")
    expect(makeRequest.mock.calls[1][1]).toEqual("search/")
    expect(makeRequest.mock.calls[1][2]).toMatchObject(
      buildSearchQuery({
        text:         "New Search Text",
        from:         0,
        activeFacets: expectedFacets,
        size:         4,
        aggregations: ["certification", "type", "offered_by"]
      })
    )
  })

  it("render a <LearningResourceCard /> for each search result", async () => {
    const results = makeSearchResponse(2)
    setMockResponse.post("search/", results)
    await renderTestApp({ url: "/search" })
    const list = await screen.findByRole("list", { name: "Search Results" })
    const items = await within(list).findAllByRole("listitem")
    expect(items).toHaveLength(2)

    expect(spyLearningResourceCard).toHaveBeenCalledWith(
      expect.objectContaining({ resource: results.hits.hits[0]._source }),
      expect.anything()
    )
    expect(spyLearningResourceCard).toHaveBeenCalledWith(
      expect.objectContaining({ resource: results.hits.hits[1]._source }),
      expect.anything()
    )
  })
})

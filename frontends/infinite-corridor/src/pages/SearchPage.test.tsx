import { when } from "jest-when"
import { faker } from "@faker-js/faker"

import { urls as lrUrls } from "../api/learning-resources"

import {
  makeLearningResource,
  makeSearchResponse
} from "ol-search-ui/src/factories"
import { buildSearchQuery } from "@mitodl/course-search-utils"

import { assertInstanceOf } from "ol-util"
import { createMatchMediaForJsDom } from "ol-util/src/test-utils"
import { screen, renderTestApp, setMockResponse, user } from "../test-utils"

import {
  fireEvent,
  waitFor,
  waitForElementToBeRemoved,
  within
} from "@testing-library/react"
import { makeRequest } from "../test-utils/mockAxios"
import {
  ExpandedLearningResourceDisplay,
  LearningResourceCard
} from "ol-search-ui"

const spyLearningResourceCard = jest.mocked(LearningResourceCard)
const spyExpandedLearningResourceDisplay = jest.mocked(
  ExpandedLearningResourceDisplay
)

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
        size:         4
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

    await fireEvent.click(await screen.findByDisplayValue("MITx"))

    await waitFor(() => {
      expect(history.location.search).toBe("?o=MITx")
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
    expect(makeRequest.mock.calls[1][0]).toEqual("post")
    expect(makeRequest.mock.calls[1][1]).toEqual("search/")
    expect(makeRequest.mock.calls[1][2]).toMatchObject(
      buildSearchQuery({
        text:         "",
        from:         0,
        activeFacets: filteredFacets,
        size:         4
      })
    )

    expect(makeRequest.mock.calls[2][0]).toEqual("post")
    expect(makeRequest.mock.calls[2][1]).toEqual("search/")
    expect(makeRequest.mock.calls[2][2]).toMatchObject(
      buildSearchQuery({
        text:         "",
        from:         0,
        activeFacets: expectedFacets,
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
        size:         4
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
    expect(spyLearningResourceCard).toHaveBeenCalledTimes(2)
    expect(spyLearningResourceCard).toHaveBeenCalledWith(
      expect.objectContaining({ resource: results.hits.hits[0]._source }),
      expect.anything()
    )
    expect(spyLearningResourceCard).toHaveBeenCalledWith(
      expect.objectContaining({ resource: results.hits.hits[1]._source }),
      expect.anything()
    )
  })

  test("Clicking a card title opens the LearningResourceDrawer", async () => {
    const pageSize = 4
    const results = makeSearchResponse(pageSize)
    const i = faker.datatype.number({ min: 0, max: pageSize - 1 })
    const resource = makeLearningResource({
      id:          results.hits.hits[i]._source.id,
      title:       results.hits.hits[i]._source.title,
      object_type: results.hits.hits[i]._source.object_type
    })
    setMockResponse.get(
      lrUrls.resource.details(resource.object_type, resource.id),
      resource
    )

    setMockResponse.post("search/", results)
    const { history } = await renderTestApp({ url: "/search" })
    const list = await screen.findByRole("list", { name: "Search Results" })
    const items = await within(list).findAllByRole("listitem")
    const item = items[i]
    await user.click(
      within(item).getByRole("heading", { name: resource.title })
    )

    const params0 = new URLSearchParams(history.location.search)
    expect(params0.get("resource_id")).toBe(String(resource.id))
    expect(params0.get("resource_type")).toBe(resource.object_type)

    const getDrawerContent = () => screen.getByLabelText("Detailed description")
    const drawer = getDrawerContent()
    await within(drawer).findByRole("heading", { name: resource.title })
    expect(spyExpandedLearningResourceDisplay).toHaveBeenCalledWith(
      expect.objectContaining({ resource }),
      expect.anything()
    )

    await user.click(screen.getByRole("button", { name: "Close" }))
    const params1 = new URLSearchParams(history.location.search)
    expect(params1.get("resource_id")).toBe(null)
    expect(params1.get("resource_type")).toBe(null)
    await waitForElementToBeRemoved(getDrawerContent)
  })
})

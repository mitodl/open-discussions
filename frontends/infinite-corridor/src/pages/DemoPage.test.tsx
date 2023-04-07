import { screen, renderTestApp, setMockResponse, user } from "../test-utils"
import { buildSearchQuery } from "@mitodl/course-search-utils"
import { assertInstanceOf } from "ol-util"
import axios from "../libs/axios"

const getSearchTextInput = (): HTMLInputElement => {
  const textInput = screen.getByLabelText("Search for")
  assertInstanceOf(textInput, HTMLInputElement)
  return textInput
}

const buildSearchQueryWithCollapse = params => {
  const query = buildSearchQuery(params)
  query["collapse"] = {
    field:      "offered_by",
    inner_hits: {
      name: "top_by_offeror",
      size: 3
    }
  }

  return query
}

describe("DemoPage", () => {
  test("the user should be able to update the search text and submit", async () => {
    setMockResponse.post("search/", {
      hits: { hits: [], total: 0 }
    })
    await renderTestApp({ url: "/demo" })

    const textInput = getSearchTextInput()
    await user.type(textInput, "New Search Text{Enter}")

    expect(axios.post).toHaveBeenNthCalledWith(
      1,
      "search/",
      buildSearchQueryWithCollapse({
        text:         '"New Search Text"',
        from:         0,
        activeFacets: { type: ["course"] },
        size:         6
      })
    )

    expect(axios.post).toHaveBeenNthCalledWith(
      2,
      "search/",
      buildSearchQueryWithCollapse({
        text:         '"New Search Text"',
        from:         0,
        activeFacets: { type: ["video"] },
        size:         6
      })
    )

    expect(axios.post).toHaveBeenNthCalledWith(
      3,
      "search/",
      buildSearchQueryWithCollapse({
        text:         '"New Search Text"',
        from:         0,
        activeFacets: { type: ["podcast", "podcastepisode"] },
        size:         6
      })
    )
  })
})

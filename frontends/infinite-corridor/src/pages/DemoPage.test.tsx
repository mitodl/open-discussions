import { screen, renderTestApp, setMockResponse, user } from "../test-utils"
import {
  Facets,
  SearchQueryParams,
  buildSearchQuery
} from "@mitodl/course-search-utils"
import { assertInstanceOf } from "ol-util"
import axios from "../libs/axios"

const getSearchTextInput = (): HTMLInputElement => {
  const textInput = screen.getByLabelText("Search for")
  assertInstanceOf(textInput, HTMLInputElement)
  return textInput
}

type FacetsWithType = Facets & Pick<Required<Facets>, "type">
const buildSearchQueryWithCollapse = (
  params: SearchQueryParams & { activeFacets: FacetsWithType }
) => {
  const query = buildSearchQuery(params)
  if (params.activeFacets.type[0] === "course") {
    query["collapse"] = {
      field:      "platform",
      inner_hits: {
        name: "top_by_category",
        size: 6
      }
    }
  } else {
    query["collapse"] = {
      field:      "offered_by",
      inner_hits: {
        name: "top_by_category",
        size: 6
      }
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
        text:         "New Search Text",
        from:         0,
        activeFacets: { type: ["course"] },
        size:         12
      })
    )

    expect(axios.post).toHaveBeenNthCalledWith(
      2,
      "search/",
      buildSearchQueryWithCollapse({
        text:         "New Search Text",
        from:         0,
        activeFacets: { type: ["video"] },
        size:         12
      })
    )

    expect(axios.post).toHaveBeenNthCalledWith(
      3,
      "search/",
      buildSearchQueryWithCollapse({
        text:         "New Search Text",
        from:         0,
        activeFacets: { type: ["podcast", "podcastepisode"] },
        size:         12
      })
    )
  })
})

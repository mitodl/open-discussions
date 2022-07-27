/* global SETTINGS:false */
import React from "react"
import sinon from "sinon"
import { mount } from "enzyme"
import { act } from "react-dom/test-utils"
import { times } from "ramda"

import SearchPage from "./SearchPage"

import { makeSearchResult } from "../factories/search"
import { fetchJSONWithCSRF } from "redux-hammock/django_csrf_fetch"
import { buildSearchQuery } from "@mitodl/course-search-utils"
import { createMemoryHistory } from "history"

jest.mock("react-router", () => ({
  useHistory: () => createMemoryHistory()
}))

SETTINGS.search_page_size = 20

let resolver

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

jest.mock("redux-hammock/django_csrf_fetch", () => ({
  fetchJSONWithCSRF: jest.fn(async () => {
    return new Promise(resolve => {
      resolver = (extraData = {}) => {
        const results = mockGetResults()
        resolve({
          hits: { hits: results, total: results.length },
          ...extraData
        })
      }
    })
  })
}))

const mockGetResults = () => {
  const results = []

  for (let i = 0; i < times; i++) {
    const type = casual.random_element(["course", "program"])
    results.append({
      _source: makeSearchResult(type)
    })
  }

  return results
}

describe("SearchPage component", () => {
  let wrapper

  afterEach(() => {
    sinon.restore()
    wrapper.unmount()
    jest.clearAllMocks()
  })

  test("should support InfiniteScroll-ing", async () => {
    await act(async () => {
      wrapper = mount(<SearchPage />)
    })

    wrapper.update()

    await act(async () => {
      wrapper.find("InfiniteScroll").prop("loadMore")()
      resolver()
    })
    wrapper.update()
    await act(async () => {
      wrapper.find("InfiniteScroll").prop("loadMore")()
      resolver()
    })
    wrapper.update()
    await act(async () => {
      wrapper.find("InfiniteScroll").prop("loadMore")()
      resolver()
    })
    wrapper.update()

    expect(fetchJSONWithCSRF.mock.calls).toEqual([
      [
        "/api/v0/search/",
        {
          body: JSON.stringify(
            buildSearchQuery({
              text:         "",
              from:         0,
              activeFacets: expectedFacets,
              sort:         null,
              size:         20
            })
          ),
          method: "post"
        }
      ],
      [
        "/api/v0/search/",
        {
          body: JSON.stringify(
            buildSearchQuery({
              text:         "",
              from:         20,
              activeFacets: expectedFacets,
              sort:         null,
              size:         20
            })
          ),
          method: "post"
        }
      ],
      [
        "/api/v0/search/",
        {
          body: JSON.stringify(
            buildSearchQuery({
              text:         "",
              from:         40,
              activeFacets: expectedFacets,
              sort:         null,
              size:         20
            })
          ),
          method: "post"
        }
      ]
    ])
  })

  test("the user can update the search text and submit", async () => {
    await act(async () => {
      wrapper = mount(<SearchPage />)
    })

    wrapper.update()

    wrapper
      .find("input")
      .at(0)
      .simulate("change", { target: { value: "New Search Text" } })

    await act(async () => {
      wrapper.find("Searchbox").prop("onSubmit")({ preventDefault: jest.fn() })
      resolver()
    })

    expect(fetchJSONWithCSRF.mock.calls).toEqual([
      [
        "/api/v0/search/",
        {
          body: JSON.stringify(
            buildSearchQuery({
              text:         "",
              from:         0,
              activeFacets: expectedFacets,
              sort:         null,
              size:         20
            })
          ),
          method: "post"
        }
      ],
      [
        "/api/v0/search/",
        {
          body: JSON.stringify(
            buildSearchQuery({
              text:         "New Search Text",
              from:         0,
              activeFacets: expectedFacets,
              sort:         null,
              size:         20
            })
          ),
          method: "post"
        }
      ]
    ])
  })
})

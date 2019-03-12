// @flow
/* global SETTINGS: false */
import { assert } from "chai"
import qs from "query-string"
import sinon from "sinon"

import ConnectedCourseSearchPage, { CourseSearchPage } from "./CourseSearchPage"
import IntegrationTestHelper from "../util/integration_test_helper"
import { shouldIf } from "../lib/test_utils"
import { makeCourseResult, makeSearchResponse } from "../factories/search"
import { makeChannel } from "../factories/channels"

describe("CourseSearchPage", () => {
  let helper, renderPage, searchResponse, initialState, initialProps

  beforeEach(() => {
    const channel = makeChannel()
    const numHits = 10
    searchResponse = makeSearchResponse(
      SETTINGS.search_page_size,
      numHits,
      "course",
      true
    )
    // Simulate an upvoted post
    const searchCourse = makeCourseResult()
    searchCourse.course_id = "course_mitx_1"
    searchResponse.hits.hits[0] = searchCourse

    helper = new IntegrationTestHelper()
    helper.searchStub.returns(Promise.resolve(searchResponse))
    initialState = {
      channels: {
        data:   new Map([[channel.name, channel]]),
        loaded: true
      },
      posts: {
        data: new Map()
      },
      search: {
        loaded:     true,
        processing: false,
        data:       {
          results:     searchResponse.hits.hits,
          facets:      new Map(Object.entries(searchResponse.aggregations)),
          total:       searchResponse.hits.total,
          incremental: false
        }
      },
      ui: {
        facets: new Map(Object.entries({ topics: true }))
      }
    }
    initialProps = {
      match: {
        params: {}
      },
      location: {
        search: "q=text"
      },
      history:         helper.browserHistory,
      facetVisibility: new Map(Object.entries({ topics: true }))
    }

    renderPage = helper.configureHOCRenderer(
      ConnectedCourseSearchPage,
      CourseSearchPage,
      initialState,
      initialProps
    )
  })

  afterEach(() => {
    helper.cleanup()
  })

  it("renders search results", async () => {
    const { inner } = await renderPage()
    searchResponse.hits.hits.forEach((result, i) => {
      assert.deepEqual(
        inner
          .find("SearchResult")
          .at(i)
          .prop("result"),
        result
      )
    })
  })
  ;["", "a"].forEach(query => {
    it(`still runs a search if initial search text is '${query}'`, async () => {
      await renderPage({
        search: {
          loaded:     false,
          processing: false
        },
        location: {
          search: `q=${query}`
        }
      })
      sinon.assert.calledOnce(helper.searchStub)
    })
  })

  it("loads more results", async () => {
    SETTINGS.search_page_size = 5
    const { inner } = await renderPage({
      search: {
        processing: false,
        loaded:     true
      }
    })
    await inner.find("InfiniteScroll").prop("loadMore")()
    sinon.assert.calledWith(helper.searchStub, {
      channelName: null,
      from:        SETTINGS.search_page_size,
      size:        SETTINGS.search_page_size,
      text:        "text",
      type:        "course",
      facets:      new Map(
        Object.entries({
          platform:     undefined,
          topics:       undefined,
          availability: undefined
        })
      )
    })
    // from is 5, plus 5 is 10 which is == numHits so no more results
    assert.isFalse(inner.find("InfiniteScroll").prop("hasMore"))
  })
  it("searches with parameters", async () => {
    SETTINGS.search_page_size = 5
    await renderPage(
      {
        search: {
          processing: false,
          loaded:     false
        }
      },
      {
        location: {
          search: "q=text&p=ocw&t=Science&t=Engineering&a=prior"
        }
      }
    )
    sinon.assert.calledWith(helper.searchStub, {
      channelName: null,
      from:        0,
      size:        SETTINGS.search_page_size,
      text:        "text",
      type:        "course",
      facets:      new Map(
        Object.entries({
          platforms:      ["ocw"],
          topics:         ["Science", "Engineering"],
          availabilities: ["prior"]
        })
      )
    })
  })
  ;[0, 5].forEach(from => {
    it(`InfiniteScroll initialLoad ${shouldIf(
      from > 0
    )} be false when from is ${from}`, async () => {
      const { inner } = await renderPage()
      inner.setState({ from })
      const infiniteScroll = inner.find("InfiniteScroll")
      assert.equal(infiniteScroll.prop("initialLoad"), from === 0)
    })
  })
  ;[
    [true, false, false],
    [false, true, true],
    [false, false, true],
    [true, true, true]
  ].forEach(([loaded, processing, expected]) => {
    it(`${expected ? "shows" : "doesn't show"} PostLoading when we are ${
      processing ? "processing" : "not processing"
    } search results or loaded  = ${String(loaded)}`, async () => {
      const { inner } = await renderPage(
        {
          search: {
            processing: processing,
            loaded:     loaded
          }
        },
        {
          location: {
            search: "q=text"
          }
        }
      )
      assert.equal(inner.find("PostLoading").length, expected ? 1 : 0)
    })
  })

  it("shows a message saying there are no results", async () => {
    const { inner } = await renderPage(
      {
        search: {
          data: {
            results: [],
            total:   0
          }
        }
      },
      {
        location: {
          search: "q=fghgfh"
        }
      }
    )
    assert.equal(
      inner.find(".empty-list-msg").text(),
      "There are no results to display."
    )
  })

  it("uses the query parameter value as a default for the textbox", async () => {
    const text = "xyz"
    const { inner } = await renderPage(
      {},
      {
        location: {
          search: `q=${text}`
        }
      }
    )
    assert.equal(inner.state().text, text)
  })

  it("updates the textbox", async () => {
    const { inner } = await renderPage()
    const text = "text"
    inner.find("SearchTextbox").prop("onChange")({
      target: {
        value: text
      }
    })
    assert.equal(inner.state().text, text)
  })

  it("triggers a non-incremental search from textbox input", async () => {
    const { inner } = await renderPage(
      {},
      {
        location: {
          search: "type=course"
        }
      }
    )
    const text = "some other text"
    inner.setState({ text, from: 7 })
    inner.find("SearchTextbox").prop("onSubmit")({
      preventDefault: helper.sandbox.stub()
    })
    assert.deepEqual(qs.parse(helper.currentLocation.search), {
      q:    text,
      type: "course"
    })
    assert.deepEqual(inner.state(), {
      text,
      activeFacets: new Map(
        Object.entries({
          topics:       [],
          platform:     [],
          availability: []
        })
      ),
      from:  0,
      error: null
    })
  })

  it("triggers a non-incremental search when the facet changes", async () => {
    const { inner } = await renderPage()
    helper.searchStub.reset()
    const text = "new text"
    inner.setState({ from: 7, text })
    inner
      .find("Connect(SearchFacet)")
      .at(0)
      .props()
      .onUpdate({
        target: { name: "topics", value: "Engineering", checked: true }
      })
    sinon.assert.calledWith(helper.searchStub, {
      channelName: null,
      from:        0,
      size:        SETTINGS.search_page_size,
      text,
      type:        "course",
      facets:      new Map(
        Object.entries({
          platform:     ["ocw"],
          topics:       ["Engineering"],
          availability: ["prior"]
        })
      )
    })
    assert.deepEqual(qs.parse(helper.currentLocation.search), {
      type: "course",
      q:    text,
      t:    "Engineering"
    })
    assert.deepEqual(inner.state(), {
      // Because this is non-incremental the previous from value of 7 is replaced with 0
      text,
      activeFacets: new Map(
        Object.entries({
          topics:       ["Engineering"],
          platform:     [],
          availability: []
        })
      ),
      from:  0,
      error: null
    })
  })

  it("does not trigger a search if no search parameters were changed", async () => {
    const { inner } = await renderPage()
    helper.searchStub.reset()
    inner.setState({
      text:         inner.state().text,
      activeFacets: inner.state().activeFacets
    })
    sinon.assert.notCalled(helper.searchStub)
  })

  it("clears the text when the onClear prop is triggered", async () => {
    const { inner } = await renderPage()
    inner.setState({ text: "some text" })
    inner.find("SearchTextbox").prop("onClear")()
    assert.equal(inner.state().text, "")
  })
  ;[false, true].forEach(isChecked => {
    it(`${shouldIf(
      isChecked
    )} include a topic facet in search after checkbox change`, async () => {
      const { inner } = await renderPage()
      inner.setState({
        text:         "some text",
        activeFacets: new Map(
          Object.entries({
            platform:     [],
            topics:       isChecked ? [] : ["Science"],
            availability: []
          })
        )
      })
      helper.searchStub.reset()
      await inner.instance().onUpdateFacets({
        target: {
          checked: isChecked,
          name:    "topics",
          value:   "Science"
        }
      })
      sinon.assert.calledWith(helper.searchStub, {
        channelName: null,
        from:        0,
        size:        SETTINGS.search_page_size,
        text:        "some text",
        type:        "course",
        facets:      new Map(
          Object.entries({
            platform:     [],
            topics:       isChecked ? ["Science"] : [],
            availability: []
          })
        )
      })
    })
  })
})

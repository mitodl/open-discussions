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
  let helper,
    renderPage,
    searchResponse,
    aggregateResponse,
    initialState,
    initialProps

  beforeEach(() => {
    const channel = makeChannel()
    const numHits = 10
    searchResponse = makeSearchResponse(SETTINGS.search_page_size, numHits)
    aggregateResponse = {
      data: {
        platforms: ["ocw", "mitx"],
        topics:    ["Engineering", "Science"]
      },
      loaded: true
    }
    // Simulate an upvoted post
    const searchCourse = makeCourseResult()
    searchCourse.course_id = "course_mitx_1"
    searchResponse.hits.hits[0] = searchCourse

    helper = new IntegrationTestHelper()
    helper.searchStub.returns(Promise.resolve(searchResponse))
    helper.aggregateStub.returns(Promise.resolve(aggregateResponse))
    initialState = {
      channels: {
        data:   new Map([[channel.name, channel]]),
        loaded: true
      },
      posts: {
        data: new Map()
      },
      search: {
        loaded: true,
        data:   {
          results:     searchResponse.hits.hits,
          total:       searchResponse.hits.total,
          incremental: false
        }
      },
      coursefacets: aggregateResponse
    }
    initialProps = {
      loaded: true,
      match:  {
        params: {}
      },
      location: {
        search: "q=text"
      },
      history: helper.browserHistory
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
    //assert.equal(inner.find("").exists(), true)

    sinon.assert.calledWith(helper.searchStub, {
      channelName:    null,
      from:           0,
      size:           SETTINGS.search_page_size,
      text:           "text",
      type:           "course",
      platforms:      undefined,
      topics:         undefined,
      availabilities: undefined
    })
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
      await renderPage(
        {},
        {
          location: {
            search: `q=${query}`
          }
        }
      )
      sinon.assert.calledOnce(helper.searchStub)
    })
  })

  it("loads more results", async () => {
    SETTINGS.search_page_size = 5
    const { inner } = await renderPage()

    helper.searchStub.reset()
    await inner.find("InfiniteScroll").prop("loadMore")()
    sinon.assert.calledWith(helper.searchStub, {
      channelName:    null,
      from:           SETTINGS.search_page_size,
      size:           SETTINGS.search_page_size,
      text:           "text",
      type:           "course",
      platforms:      undefined,
      topics:         undefined,
      availabilities: undefined
    })
    // from is 5, plus 5 is 10 which is == numHits so no more results
    assert.isFalse(inner.find("InfiniteScroll").prop("hasMore"))
  })
  it("searches with parameters", async () => {
    SETTINGS.search_page_size = 5
    await renderPage(
      {},
      {
        location: {
          search: "q=text&p=ocw&t=Science&t=Engineering&a=prior"
        }
      }
    )
    sinon.assert.calledWith(helper.searchStub, {
      channelName:    null,
      from:           0,
      size:           SETTINGS.search_page_size,
      text:           "text",
      type:           "course",
      platforms:      ["ocw"],
      topics:         ["Science", "Engineering"],
      availabilities: ["prior"]
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
    [false, true, false],
    [false, false, false],
    [true, true, true]
  ].forEach(([initialLoad, searchProcessing, expected]) => {
    it(`${expected ? "shows" : "doesn't show"} PostLoading when we are ${
      searchProcessing ? "loading" : "not loading"
    } search results and initialLoad = ${String(initialLoad)}`, async () => {
      const { inner } = await renderPage(
        {
          search: {
            data: {
              initialLoad
            },
            processing: searchProcessing,
            loaded:     !searchProcessing
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
            results: []
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
      from:           0,
      text,
      error:          null,
      topics:         undefined,
      platforms:      undefined,
      availabilities: undefined
    })
  })

  it("triggers a non-incremental search when the facet changes", async () => {
    const { inner } = await renderPage()
    helper.searchStub.reset()
    const text = "text"
    inner.setState({ from: 7, text })
    await inner
      .find("Checkbox")
      .at(0)
      .props()
      .onChange({
        target: {
          value:   "Engineering",
          name:    "topics",
          checked: true
        }
      })
    sinon.assert.calledWith(helper.searchStub, {
      channelName:    null,
      from:           0,
      size:           SETTINGS.search_page_size,
      text,
      type:           "course",
      platforms:      undefined,
      topics:         ["Engineering"],
      availabilities: undefined
    })
    assert.deepEqual(qs.parse(helper.currentLocation.search), {
      type: "course",
      q:    text,
      t:    "Engineering"
    })
    assert.deepEqual(inner.state(), {
      // Because this is non-incremental the previous from value of 7 is replaced with 0
      from:           0,
      text,
      error:          null,
      topics:         ["Engineering"],
      platforms:      undefined,
      availabilities: undefined
    })
  })

  it("clears the text when the onClear prop is triggered", async () => {
    const { inner } = await renderPage()
    inner.setState({ text: "some text" })
    inner.find("SearchTextbox").prop("onClear")()
    assert.equal(inner.state().text, "")
  })

  it("triggers an aggregate query when loadFacetChoices is called", async () => {
    const { inner } = await renderPage()
    await inner.instance().loadFacetChoices()
    sinon.assert.callCount(helper.aggregateStub, 1)
  })
  ;[false, true].forEach(isChecked => {
    it(`${shouldIf(
      isChecked
    )} include a topic facet in search after checkbox change`, async () => {
      const { inner } = await renderPage()
      inner.setState({ text: "some text" })
      helper.searchStub.reset()
      await inner.instance().onUpdateFacets({
        target: {
          checked: isChecked,
          name:    "topics",
          value:   "Science"
        }
      })
      sinon.assert.calledWith(helper.searchStub, {
        channelName:    null,
        from:           0,
        size:           SETTINGS.search_page_size,
        text:           "some text",
        type:           "course",
        platforms:      undefined,
        topics:         isChecked ? ["Science"] : [],
        availabilities: undefined
      })
    })
  })
})

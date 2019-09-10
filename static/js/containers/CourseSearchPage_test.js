// @flow
/* global SETTINGS: false */
import { assert } from "chai"
import qs from "query-string"
import sinon from "sinon"
import _ from "lodash"
import InfiniteScroll from "react-infinite-scroller"

import ConnectedCourseSearchPage, { CourseSearchPage } from "./CourseSearchPage"

import SearchFacet from "../components/SearchFacet"

import { SET_SHOW_RESOURCE_DRAWER } from "../actions/ui"
import IntegrationTestHelper from "../util/integration_test_helper"
import { shouldIf } from "../lib/test_utils"
import {
  makeCourseResult,
  makeSearchFacetResult,
  makeSearchResponse
} from "../factories/search"
import { makeBootcamp } from "../factories/learning_resources"
import { makeChannel } from "../factories/channels"
import { LR_TYPE_COURSE, LR_TYPE_ALL } from "../lib/constants"
import { SEARCH_GRID_UI, SEARCH_LIST_UI } from "../lib/search"
import { wait } from "../lib/util"
import { favoritesURL } from "../lib/url"

describe("CourseSearchPage", () => {
  let helper,
    renderPage,
    searchResponse,
    initialState,
    initialProps,
    searchCourse

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
    searchCourse = makeCourseResult()
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
      },
      entities: {
        courses:   {},
        bootcamps: {}
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
    helper.cleanup(false)
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

  it("renders the Learning Resource facet", async () => {
    const { inner } = await renderPage()
    assert.equal(
      inner
        .find(SearchFacet)
        .at(0)
        .prop("title"),
      "Learning Resource"
    )
  })

  it("passes a setShowResourceDrawer to search results", async () => {
    const { inner, store } = await renderPage()
    inner
      .find("SearchResult")
      .at(0)
      .prop("setShowResourceDrawer")({
        objectId:   searchCourse.course_id,
        objectType: LR_TYPE_COURSE,
        runId:      23
      })
    assert.deepEqual(store.getLastAction(), {
      type:    SET_SHOW_RESOURCE_DRAWER,
      payload: {
        objectId:   searchCourse.course_id,
        objectType: LR_TYPE_COURSE,
        runId:      23
      }
    })
  })

  //
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
    const { wrapper, inner } = await renderPage({
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
      type:        LR_TYPE_ALL,
      facets:      new Map(
        Object.entries({
          platform:     [],
          topics:       [],
          availability: [],
          type:         LR_TYPE_ALL
        })
      )
    })
    wrapper.update()
    // from is 5, plus 5 is 10 which is == numHits so no more results
    assert.isFalse(wrapper.find("InfiniteScroll").prop("hasMore"))
    assert.deepEqual(inner.state(), {
      // Because this is non-incremental the previous from value of 7 is replaced with 0
      text:         "text",
      activeFacets: new Map(
        Object.entries({
          platform:     [],
          topics:       [],
          availability: [],
          type:         []
        })
      ),
      from:               5,
      error:              null,
      currentFacetGroup:  null,
      incremental:        true,
      searchResultLayout: SEARCH_GRID_UI
    })
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
          search: "q=text&p=ocw&t=Science&t=Engineering&a=availableNow"
        }
      }
    )
    sinon.assert.calledWith(helper.searchStub, {
      channelName: null,
      from:        0,
      size:        SETTINGS.search_page_size,
      text:        "text",
      type:        LR_TYPE_ALL,
      facets:      new Map(
        Object.entries({
          type:         LR_TYPE_ALL,
          platform:     ["ocw"],
          topics:       ["Science", "Engineering"],
          availability: ["availableNow"]
        })
      )
    })
  })

  //
  ;[0, 5].forEach(from => {
    it(`InfiniteScroll initialLoad ${shouldIf(
      from > 0
    )} be false when from is ${from}`, async () => {
      const { wrapper, inner } = await renderPage()
      inner.setState({ from })
      const infiniteScroll = wrapper.find("InfiniteScroll")
      assert.equal(infiniteScroll.prop("initialLoad"), from === 0)
    })
  })

  //
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
    inner.find("CourseSearchbox").prop("onChange")({
      target: {
        value: text
      }
    })
    assert.equal(inner.state().text, text)
  })

  it("displays filters and clicking 'Clear all filters' removes all active facets", async () => {
    const { wrapper, inner } = await renderPage()
    const text = "text"
    const activeFacets = new Map([
      ["platform", ["ocw"]],
      ["topics", ["Science", "Law"]],
      ["availability", ["Current"]],
      ["type", LR_TYPE_ALL]
    ])
    inner.setState({ text, activeFacets })
    assert.equal(inner.state().text, text)
    assert.deepEqual(inner.state().activeFacets, activeFacets)
    assert.equal(wrapper.find("SearchFilter").length, 8)
    wrapper.find(".clear-all-filters").simulate("click")
    assert.equal(inner.state().text, null)
    assert.deepEqual(
      inner.state().activeFacets,
      new Map([
        ["platform", []],
        ["topics", []],
        ["availability", []],
        ["type", []]
      ])
    )
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
    inner.find("CourseSearchbox").prop("onSubmit")({
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
          availability: [],
          type:         ["course"]
        })
      ),
      currentFacetGroup:  null,
      from:               0,
      error:              null,
      incremental:        false,
      searchResultLayout: SEARCH_GRID_UI
    })
  })

  it("triggers a non-incremental search when the facet changes", async () => {
    const { inner } = await renderPage()
    helper.searchStub.reset()
    const text = "new text"
    inner.setState({ from: 7, text })
    inner
      .find(SearchFacet)
      .at(1)
      .props()
      .onUpdate({
        target: { name: "topics", value: "Physics", checked: true }
      })
    // this ensures that the debounced calls go through without having to wait
    inner.instance().debouncedRunSearch.flush()
    sinon.assert.calledWith(helper.searchStub, {
      channelName: null,
      from:        0,
      size:        SETTINGS.search_page_size,
      text,
      type:        LR_TYPE_ALL,
      facets:      new Map(
        Object.entries({
          platform:     [],
          topics:       ["Physics"],
          availability: [],
          type:         LR_TYPE_ALL
        })
      )
    })
    assert.deepEqual(qs.parse(helper.currentLocation.search), {
      q: text,
      t: "Physics"
    })
    assert.deepEqual(inner.state(), {
      // Because this is non-incremental the previous from value of 7 is replaced with 0
      text,
      activeFacets: new Map(
        Object.entries({
          topics:       ["Physics"],
          platform:     [],
          availability: [],
          type:         []
        })
      ),
      from:              0,
      error:             null,
      currentFacetGroup: {
        group:  "topics",
        result: makeSearchFacetResult().topics
      },
      incremental:        false,
      searchResultLayout: SEARCH_GRID_UI
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

  //
  ;[false, true].forEach(isChecked => {
    it(`${shouldIf(
      isChecked
    )} include an availability facet in search after checkbox change`, async () => {
      const { inner } = await renderPage()
      inner.setState({
        text:         "some text",
        activeFacets: new Map(
          Object.entries({
            platform:     [],
            topics:       [],
            availability: isChecked ? [] : ["nextWeek"]
          })
        )
      })
      helper.searchStub.reset()
      await inner.instance().onUpdateFacets({
        target: {
          checked: isChecked,
          name:    "availability",
          value:   "nextWeek"
        }
      })
      // this ensures that the debounced calls go through without having to wait
      inner.instance().debouncedRunSearch.flush()
      sinon.assert.calledWith(helper.searchStub, {
        channelName: null,
        from:        0,
        size:        SETTINGS.search_page_size,
        text:        "some text",
        type:        LR_TYPE_ALL,
        facets:      new Map(
          Object.entries({
            platform:     [],
            topics:       [],
            availability: isChecked ? ["nextWeek"] : [],
            type:         LR_TYPE_ALL
          })
        )
      })
    })
  })

  it("mergeFacetOptions adds any selected facets not in results to the group", async () => {
    const { inner } = await renderPage()
    const activeFacets = new Map([
      ["platform", []],
      ["topics", ["NewTopic"]],
      ["availability", []]
    ])
    inner.setState({ activeFacets })
    const mergedFacets = inner.instance().mergeFacetOptions("topics")
    assert.isTrue(
      _.findIndex(mergedFacets.buckets, { doc_count: 0, key: "NewTopic" }) > -1
    )
  })

  it("mergeFacetOptions adds any search facets not in current facet group", async () => {
    const { inner } = await renderPage()
    const currentFacetGroup = {
      group:  "platform",
      result: { buckets: [{ key: "ocw", doc_count: 20 }] }
    }
    const missingFacetGroup = _.find(
      // $FlowFixMe: platform exists in aggregation result
      searchResponse.aggregations.platform.buckets,
      { key: "mitx" }
    )
    inner.setState({ currentFacetGroup })
    const mergedFacets = inner.instance().mergeFacetOptions("platform")
    assert.isTrue(
      _.findIndex(mergedFacets.buckets, { doc_count: 20, key: "ocw" }) > -1
    )
    assert.isTrue(_.findIndex(mergedFacets.buckets, missingFacetGroup) > -1)
    await wait(600)
  })
})

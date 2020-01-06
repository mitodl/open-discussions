// @flow
/* global SETTINGS: false */
import { assert } from "chai"
import qs from "query-string"
import sinon from "sinon"
import _ from "lodash"

import ConnectedCourseSearchPage, { CourseSearchPage } from "./CourseSearchPage"

import SearchFacet from "../components/SearchFacet"

import IntegrationTestHelper from "../util/integration_test_helper"
import { shouldIf } from "../lib/test_utils"
import {
  makeCourseResult,
  makeLearningResourceResult,
  makeSearchFacetResult,
  makeSearchResponse
} from "../factories/search"
import { makeChannel } from "../factories/channels"
import {
  LR_TYPE_ALL,
  LR_TYPE_BOOTCAMP,
  LR_TYPE_COURSE,
  LR_TYPE_LEARNINGPATH,
  LR_TYPE_PROGRAM,
  LR_TYPE_USERLIST,
  LR_TYPE_VIDEO
} from "../lib/constants"
import { SEARCH_LIST_UI } from "../lib/search"
import { wait } from "../lib/util"

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
          suggest:     ["test"],
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
    assert.include(
      inner.find(".results-count").text(),
      searchResponse.hits.total
    )
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

  it("renders suggestion and changes search text if clicked", async () => {
    const { inner } = await renderPage()
    const suggestDiv = inner.find(".suggestion")
    assert.isOk(suggestDiv.text().includes("Did you mean"))
    assert.isOk(suggestDiv.text().includes("test"))
    suggestDiv.find("a").simulate("click")
    assert.equal(inner.state()["text"], "test")
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
          offered_by:   [],
          topics:       [],
          availability: [],
          cost:         [],
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
          offered_by:   [],
          topics:       [],
          availability: [],
          cost:         [],
          type:         []
        })
      ),
      from:               5,
      error:              null,
      currentFacetGroup:  null,
      incremental:        true,
      searchResultLayout: SEARCH_LIST_UI
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
          search: "q=text&o=OCW&t=Science&t=Engineering&a=availableNow&c=free"
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
          offered_by:   ["OCW"],
          topics:       ["Science", "Engineering"],
          availability: ["availableNow"],
          cost:         ["free"]
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
  ].forEach(([loaded, processing, shouldShowPostloading]) => {
    it(`shows the UI we expect when processing = ${String(
      processing
    )} and loaded = ${String(loaded)}`, async () => {
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
      assert.equal(
        inner.find("CourseSearchLoading").exists(),
        shouldShowPostloading
      )
      assert.equal(inner.find(".results-count").exists(), !processing)
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
      ["offered_by", ["OCW"]],
      ["topics", ["Science", "Law"]],
      ["availability", ["Current"]],
      ["cost", ["paid"]],
      ["type", LR_TYPE_ALL]
    ])
    inner.setState({ text, activeFacets })
    assert.equal(inner.state().text, text)
    assert.deepEqual(inner.state().activeFacets, activeFacets)
    wrapper.find(".clear-all-filters").simulate("click")
    assert.equal(inner.state().text, null)
    assert.deepEqual(
      inner.state().activeFacets,
      new Map([
        ["offered_by", []],
        ["topics", []],
        ["availability", []],
        ["cost", []],
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
          offered_by:   [],
          availability: [],
          cost:         [],
          type:         ["course"]
        })
      ),
      currentFacetGroup:  null,
      from:               0,
      error:              null,
      incremental:        false,
      searchResultLayout: SEARCH_LIST_UI
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
          offered_by:   [],
          topics:       ["Physics"],
          availability: [],
          cost:         [],
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
          offered_by:   [],
          availability: [],
          cost:         [],
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
      searchResultLayout: SEARCH_LIST_UI
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
            offered_by:   [],
            topics:       [],
            cost:         [],
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
            offered_by:   [],
            cost:         [],
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
      ["offered_by", []],
      ["cost", []],
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
      group:  "offered_by",
      result: { buckets: [{ key: "OCW", doc_count: 20 }] }
    }
    const missingFacetGroup = _.find(
      // $FlowFixMe: platform exists in aggregation result
      searchResponse.aggregations.offered_by.buckets,
      { key: "MITx" }
    )
    inner.setState({ currentFacetGroup })
    const mergedFacets = inner.instance().mergeFacetOptions("offered_by")
    assert.isTrue(
      _.findIndex(mergedFacets.buckets, { doc_count: 20, key: "OCW" }) > -1
    )
    assert.isTrue(_.findIndex(mergedFacets.buckets, missingFacetGroup) > -1)
    await wait(600)
  })

  LR_TYPE_ALL.forEach(resourceType => {
    it(`overrideObject ${resourceType} is null if not in entities`, async () => {
      const resource = makeLearningResourceResult(resourceType)
      searchResponse.hits.hits[0] = resource
      helper.searchStub.returns(Promise.resolve(searchResponse))
      const { inner } = await renderPage()
      assert.equal(
        inner
          .find("SearchResult")
          .at(0)
          .prop("overrideObject"),
        null
      )
    })
  })

  LR_TYPE_ALL.forEach(resourceType => {
    it(`overrides ${resourceType} search results for is_favorite and lists with values from entities`, async () => {
      const resource = makeLearningResourceResult(resourceType)
      // Conditional to prevent flow from whining about an undefined resource
      if (resource) {
        const entity = {
          [resource.id]: {
            is_favorite: !resource.is_favorite,
            lists:       [9121, 9124, 9129]
          }
        }
        searchResponse.hits.hits[0] = resource
        helper.searchStub.returns(Promise.resolve(searchResponse))
        const { inner } = await renderPage({
          entities: {
            courses:   resourceType === LR_TYPE_COURSE ? entity : {},
            bootcamps: resourceType === LR_TYPE_BOOTCAMP ? entity : {},
            videos:    resourceType === LR_TYPE_VIDEO ? entity : {},
            programs:  resourceType === LR_TYPE_PROGRAM ? entity : {},
            userLists: [LR_TYPE_USERLIST, LR_TYPE_LEARNINGPATH].includes(
              resourceType
            )
              ? entity
              : {}
          }
        })

        const overrideObject = inner
          .find("SearchResult")
          .at(0)
          .prop("overrideObject")
        assert.equal(
          overrideObject.is_favorite,
          entity[resource.id].is_favorite
        )
        assert.deepEqual(overrideObject.lists, entity[resource.id].lists)
      }
    })
  })
})

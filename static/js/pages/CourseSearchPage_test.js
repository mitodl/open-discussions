// @flow
/* global SETTINGS: false */
import { assert } from "chai"
import sinon from "sinon"
import _ from "lodash"

import ConnectedCourseSearchPage, { CourseSearchPage } from "./CourseSearchPage"

import SearchFacet from "../components/SearchFacet"

import IntegrationTestHelper from "../util/integration_test_helper"
import { shouldIf } from "../lib/test_utils"
import {
  makeCourseResult,
  makeLearningResourceResult,
  makeSearchResponse
} from "../factories/search"
import { makeChannel } from "../factories/channels"
import {
  LR_TYPE_ALL,
  LR_TYPE_COURSE,
  LR_TYPE_LEARNINGPATH,
  LR_TYPE_PROGRAM,
  LR_TYPE_USERLIST,
  LR_TYPE_VIDEO,
  LR_TYPE_PODCAST,
  LR_TYPE_PODCAST_EPISODE
} from "../lib/constants"
import { SEARCH_LIST_UI } from "../lib/search"
import { wait } from "../lib/util"
import {
  deserializeSearchParams,
  serializeSearchParams
} from "../lib/course_search"

describe("CourseSearchPage", () => {
  let helper,
    renderPage,
    searchResponse,
    initialState,
    initialProps,
    searchCourse,
    replaceStub

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
        courses: {}
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

    replaceStub = helper.sandbox.spy(helper.browserHistory, "replace")
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

  //
  ;[
    ["mechical enginr", "mechanical engineer"],
    ['"mechical enginr"', '"mechanical engineer"']
  ].forEach(([text, suggestion]) => {
    it(`renders suggestion ${suggestion} for query ${text}`, async () => {
      const { inner } = await renderPage(
        {
          search: {
            data: {
              suggest: ["mechanical engineer"]
            }
          }
        },
        {
          location: {
            search: `q=${text}`
          }
        }
      )
      const suggestDiv = inner.find(".suggestion")
      assert.isOk(suggestDiv.text().includes("Did you mean"))
      assert.isOk(suggestDiv.text().includes(suggestion))
      suggestDiv.find("a").simulate("click")
      await wait(50)
      const [[{ search }]] = replaceStub.args
      assert.equal(search, `q=${escape(suggestion)}`)
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
      },
      location: {
        search: `q=text`
      }
    })
    await inner.find("InfiniteScroll").prop("loadMore")()
    wait(10)
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
      currentFacetGroup:  null,
      error:              null,
      from:               5,
      incremental:        true,
      searchResultLayout: SEARCH_LIST_UI
    })
  })

  //
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
  it("searches for podcast episodes when the type parameter is podcast", async () => {
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
          search: "q=text&type=podcast"
        }
      }
    )
    sinon.assert.calledWith(helper.searchStub, {
      channelName: null,
      from:        0,
      size:        SETTINGS.search_page_size,
      text:        "text",
      type:        ["podcast", "podcastepisode"],
      facets:      new Map(
        Object.entries({
          type:         ["podcast", "podcastepisode"],
          offered_by:   [],
          topics:       [],
          availability: [],
          cost:         []
        })
      )
    })
  })

  //
  it("searches for learning path when the type parameter is userlist", async () => {
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
          search: "q=text&type=userlist"
        }
      }
    )
    sinon.assert.calledWith(helper.searchStub, {
      channelName: null,
      from:        0,
      size:        SETTINGS.search_page_size,
      text:        "text",
      type:        ["userlist", "learningpath"],
      facets:      new Map(
        Object.entries({
          type:         ["userlist", "learningpath"],
          offered_by:   [],
          topics:       [],
          availability: [],
          cost:         []
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
    assert.equal(inner.find("CourseSearchbox").prop("value"), text)
  })

  it("updates the textbox", async () => {
    const { inner } = await renderPage()
    const text = "newwwww text"
    inner.find("CourseSearchbox").prop("onChange")({
      target: {
        value: text
      }
    })
    await wait(10)
    const [[{ search }]] = replaceStub.args
    assert.equal(search, `q=${escape(text)}`)
  })

  it("displays filters and clicking 'Clear all filters' removes all active facets", async () => {
    const text = "testtext wowowow"
    const activeFacets = {
      offered_by:   ["OCW"],
      topics:       ["Science", "Law"],
      availability: ["Current"],
      cost:         ["paid"],
      type:         LR_TYPE_ALL
    }
    const search = serializeSearchParams({ text, activeFacets })
    const { wrapper } = await renderPage(
      {},
      {
        location: { search }
      }
    )
    wrapper.find(".clear-all-filters").simulate("click")
    const newSearch = replaceStub.args[0][0].search
    assert.deepEqual(newSearch, "")
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
    const searchBox = inner.find("CourseSearchbox")
    searchBox.prop("onChange")({
      target: { value: text }
    })
    searchBox.prop("onSubmit")({
      preventDefault: helper.sandbox.stub()
    })
    await wait(10)

    const search = replaceStub.args[0][0].search

    assert.deepEqual(deserializeSearchParams({ search }), {
      text,
      activeFacets: {
        topics:       [],
        offered_by:   [],
        availability: [],
        cost:         [],
        type:         ["course"]
      }
    })
  })

  it("triggers a non-incremental search when the facet changes", async () => {
    const text = "new text"
    const { inner } = await renderPage(
      {},
      {
        location: {
          search: serializeSearchParams({ text, activeFacets: {} })
        }
      }
    )
    helper.searchStub.reset()
    inner.setState({ from: 7 })
    // inner.find("CourseFilterDrawer").dive()
    inner
      .find(SearchFacet)
      .at(1)
      .props()
      .onUpdate({
        target: { name: "topics", value: "Physics", checked: true }
      })
    await wait(10)
    const search = replaceStub.args[0][0].search

    assert.deepEqual(deserializeSearchParams({ search }), {
      text,
      activeFacets: {
        topics:       ["Physics"],
        offered_by:   [],
        availability: [],
        cost:         [],
        type:         []
      }
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
      const { inner } = await renderPage(
        {},
        {
          location: {
            search: serializeSearchParams({
              text:         "some text",
              activeFacets: {
                offered_by:   [],
                topics:       [],
                cost:         [],
                availability: isChecked ? [] : ["nextWeek"]
              }
            })
          }
        }
      )
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
      await wait(10)
      const search = replaceStub.args[0][0].search

      assert.deepEqual(deserializeSearchParams({ search }), {
        text:         "some text",
        activeFacets: {
          topics:       [],
          offered_by:   [],
          availability: isChecked ? ["nextWeek"] : [],
          cost:         [],
          type:         []
        }
      })
      sinon.assert.called(helper.searchStub)
    })
  })

  it("mergeFacetOptions adds any selected facets not in results to the group", async () => {
    const { inner } = await renderPage(
      {},
      {
        location: {
          search: serializeSearchParams({
            text:         "some text",
            activeFacets: {
              offered_by:   [],
              topics:       ["NewTopic"],
              cost:         [],
              availability: []
            }
          })
        }
      }
    )

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

  // THIS IS TEMPORARY UNTIL FULL SEARCH SUPPORT IS IN PLACE!
  LR_TYPE_ALL.filter(
    type => type !== LR_TYPE_PODCAST && type !== LR_TYPE_PODCAST_EPISODE
  ).forEach(resourceType => {
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
            courses:         resourceType === LR_TYPE_COURSE ? entity : {},
            videos:          resourceType === LR_TYPE_VIDEO ? entity : {},
            programs:        resourceType === LR_TYPE_PROGRAM ? entity : {},
            podcasts:        resourceType === LR_TYPE_PODCAST ? entity : {},
            podcastEpisodes:
              resourceType === LR_TYPE_PODCAST_EPISODE ? entity : {},
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

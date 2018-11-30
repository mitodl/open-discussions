// @flow
/* global SETTINGS: false */
import { assert } from "chai"
import qs from "query-string"
import sinon from "sinon"

import ConnectedSearchPage, { SearchPage } from "./SearchPage"
import IntegrationTestHelper from "../util/integration_test_helper"
import { actions } from "../actions"
import { makeSearchResponse } from "../factories/search"
import { makeChannel } from "../factories/channels"
import {makePost} from "../factories/posts";

describe("SearchPage", () => {
  let helper, renderPage, searchResponse, channel, initialState, initialProps

  beforeEach(() => {
    channel = makeChannel()
    const numHits = 10
    searchResponse = makeSearchResponse(SETTINGS.search_page_size, numHits)

    helper = new IntegrationTestHelper()
    helper.searchStub.returns(Promise.resolve(searchResponse))
    initialState = {
      channels: {
        data:   new Map([[channel.name, channel]]),
        loaded: true
      },
      postUpvotes: {
        data: {}
      },
      search: {
        loaded: true,
        data:   {
          results:     searchResponse.hits.hits,
          total:       searchResponse.hits.total,
          incremental: false
        }
      }
    }
    initialProps = {
      match: {
        params: {
          channelName: channel.name
        }
      },
      location: {
        search: ""
      },
      history: helper.browserHistory
    }

    renderPage = helper.configureHOCRenderer(
      ConnectedSearchPage,
      SearchPage,
      initialState,
      initialProps
    )
  })

  afterEach(() => {
    helper.cleanup()
  })

  it("renders search results", async () => {
    const { inner } = await renderPage()

    sinon.assert.calledWith(helper.searchStub, {
      channelName: channel.name,
      from:        0,
      size:        SETTINGS.search_page_size,
      text:        undefined,
      type:        undefined
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

  it("loads more results", async () => {
    SETTINGS.search_page_size = 5
    const { inner } = await renderPage()

    helper.searchStub.reset()
    await inner.find("InfiniteScroll").prop("loadMore")()
    sinon.assert.calledWith(helper.searchStub, {
      channelName: channel.name,
      from:        SETTINGS.search_page_size,
      size:        SETTINGS.search_page_size,
      text:        undefined,
      type:        undefined
    })
    // from is 5, plus 5 is 10 which is == numHits so no more results
    assert.isFalse(inner.find("InfiniteScroll").prop("hasMore"))
  })
  ;[true, false].forEach(hasChannel => {
    it(`${hasChannel ? "loads" : "doesn't load"} a channel`, async () => {
      await renderPage(
        {},
        {
          match: {
            params: {
              channelName: hasChannel ? channel.name : null
            }
          }
        }
      )
      if (hasChannel) {
        sinon.assert.calledWith(helper.getChannelStub, channel.name)
      } else {
        sinon.assert.notCalled(helper.getChannelStub)
      }
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
      const { inner } = await renderPage({
        search: {
          data: {
            initialLoad
          },
          processing: searchProcessing,
          loaded:     !searchProcessing
        }
      })

      assert.equal(inner.find("PostLoading").length, expected ? 1 : 0)
    })
  })

  it("shows a message saying there are no results", async () => {
    const { inner } = await renderPage({
      search: {
        data: {
          results: []
        }
      }
    })
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
    const type = "post"
    const { inner } = await renderPage(
      {},
      {
        location: {
          search: `type=${type}`
        }
      }
    )
    const text = "some text"
    const upvotedPosts = new Map()
    inner.setState({ text, from: 7, upvotedPosts })
    inner.find("SearchTextbox").prop("onSubmit")({
      preventDefault: helper.sandbox.stub()
    })
    assert.deepEqual(qs.parse(helper.currentLocation.search), { q: text, type })
    assert.deepEqual(inner.state(), {
      // Because this is non-incremental the previous from value of 7 is replaced with 0
      from: 0,
      text,
      upvotedPosts
    })
  })
  ;[true, false].forEach(hasChannel => {
    it(`${
      hasChannel ? "shows" : "doesn't show"
    } the ChannelHeader`, async () => {
      const renderPageWithHeader = helper.configureHOCRenderer(
        ConnectedSearchPage,
        "withChannelHeader(WithLoading)",
        initialState,
        initialProps
      )

      const { inner } = await renderPageWithHeader(
        {},
        {
          match: {
            params: {
              channelName: hasChannel ? channel.name : ""
            }
          }
        }
      )
      assert.equal(inner.find("ChannelHeader").length, hasChannel ? 1 : 0)
    })
  })

  it("populates the type from the query parameter", async () => {
    const type = "post"
    await renderPage(
      {},
      {
        location: {
          search: `type=${type}`
        }
      }
    )
    sinon.assert.calledWith(helper.searchStub, {
      channelName: channel.name,
      from:        0,
      size:        SETTINGS.search_page_size,
      text:        undefined,
      type
    })
  })

  it("has a default value for type, which is undefined", async () => {
    await renderPage()
    sinon.assert.calledWith(helper.searchStub, {
      channelName: channel.name,
      from:        0,
      size:        SETTINGS.search_page_size,
      text:        undefined,
      type:        undefined
    })
  })

  it("triggers a non-incremental search when the filter type changes", async () => {
    const { inner, store } = await renderPage()
    const upvotedPost = makePost()
    const upvotedPosts = new Map([[upvotedPost.id, upvotedPost]])
    inner.setState({ from: 7, upvotedPosts })
    const type = "comment"
    helper.searchStub.reset()
    inner.find("SearchFilterPicker").prop("updatePickerParam")(type, {
      preventDefault: helper.sandbox.stub()
    })
    sinon.assert.calledWith(helper.searchStub, {
      channelName: channel.name,
      from:        0,
      size:        SETTINGS.search_page_size,
      text:        undefined,
      type
    })
    assert.deepEqual(qs.parse(helper.currentLocation.search), { type })
    assert.deepEqual(inner.state(), {
      // Because this is non-incremental the previous from value of 7 is replaced with 0
      from: 0,
      text: undefined,
      upvotedPosts
    })
    assert.equal(
      store.getActions()[store.getActions().length - 2].type,
      actions.search.clear
    )
  })

  it("shows NotFound if there is a 404 error", async () => {
    const { inner } = await renderPage({
      channels: {
        error: {
          errorStatusCode: 404
        }
      }
    })
    assert.equal(inner.find("NotFound").length, 1)
  })

  it("shows NotAuthorized if there is a 403 error", async () => {
    const { inner } = await renderPage({
      channels: {
        error: {
          errorStatusCode: 403
        }
      }
    })
    assert.equal(inner.find("NotAuthorized").length, 1)
  })

  it("clears the text when the onClear prop is triggered", async () => {
    const { inner } = await renderPage()
    inner.setState({ text: "some text" })
    inner.find("SearchTextbox").prop("onClear")()
    assert.equal(inner.state().text, "")
  })
  ;[
    [true, true, true, true],
    [true, true, false, true],
    [true, false, true, true],
    [true, false, false, true],
    [false, true, true, false],
    [false, true, false, true],
    [false, false, true, false],
    [false, false, false, true]
  ].forEach(([channelLoaded, searchLoaded, hasChannel, loaded]) => {
    it(`has loaded=${String(loaded)} when channelLoaded=${String(
      channelLoaded
    )} and searchLoaded=${String(searchLoaded)} and it ${
      hasChannel ? "has" : "doesn't have"
    } a channel`, async () => {
      const { inner } = await renderPage(
        {
          channels: {
            loaded:     channelLoaded,
            processing: !channelLoaded
          },
          search: {
            loaded:     searchLoaded,
            processing: !searchLoaded
          }
        },
        {
          match: {
            params: {
              channelName: hasChannel ? channel.name : null
            }
          }
        }
      )
      assert.equal(inner.find("PostLoading").exists(), !loaded)
    })
  })
})

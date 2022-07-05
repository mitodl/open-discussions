// @flow
/* global SETTINGS: false */
import { assert } from "chai"
import qs from "query-string"
import sinon from "sinon"

import ConnectedSearchPage, { SearchPage } from "./SearchPage"
import IntegrationTestHelper from "../util/integration_test_helper"
import { actions } from "../actions"
import { CLEAR_SEARCH } from "../actions/search"
import { makePostResult, makeSearchResponse } from "../factories/search"
import { makeChannel } from "../factories/channels"
import { makePost } from "../factories/posts"
import { makeComment } from "../factories/comments"
import { shouldIf } from "../lib/test_utils"

describe("SearchPage", () => {
  let helper,
    renderPage,
    searchResponse,
    channel,
    initialState,
    initialProps,
    upvotedPost

  beforeEach(() => {
    channel = makeChannel()
    const numHits = 10
    searchResponse = makeSearchResponse(SETTINGS.search_page_size, numHits)

    // Simulate an upvoted post
    const searchPost = makePostResult()
    searchPost.post_id = "post_uploaded_1"
    searchResponse.hits.hits[0] = searchPost
    upvotedPost = makePost()
    upvotedPost.id = searchPost.post_id

    helper = new IntegrationTestHelper()
    helper.searchStub.returns(Promise.resolve(searchResponse))
    initialState = {
      channels: {
        data:   new Map([[channel.name, channel]]),
        loaded: true
      },
      posts: {
        data: new Map([[upvotedPost.id, upvotedPost]])
      },
      search: {
        loaded: true,
        data:   {
          results:     searchResponse.hits.hits,
          suggest:     ["test"],
          total:       searchResponse.hits.total,
          incremental: false
        }
      }
    }
    initialProps = {
      channelName: channel.name,
      location:    {
        search: "q=text"
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
      text:        "text",
      type:        undefined
    })
    assert.deepEqual(
      inner.props().upvotedPosts.get(upvotedPost.id),
      upvotedPost
    )
    searchResponse.hits.hits.forEach((result, i) => {
      assert.deepEqual(
        inner
          .find("SearchResult")
          .at(i)
          .prop("result"),
        result
      )
      assert.deepEqual(
        inner
          .find("SearchResult")
          .at(i)
          .prop("upvotedPost"),
        result.post_id === upvotedPost.id ? upvotedPost : null
      )
    })
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
    it(`doesn't run a search if initial search text is '${query}'`, async () => {
      await renderPage(
        {},
        {
          location: {
            search: `q=${query}`
          }
        }
      )
      sinon.assert.notCalled(helper.searchStub)
    })
  })

  it("loads more results", async () => {
    SETTINGS.search_page_size = 5
    const { wrapper, inner } = await renderPage()

    helper.searchStub.reset()
    await inner.find("InfiniteScroll").prop("loadMore")()
    sinon.assert.calledWith(helper.searchStub, {
      channelName: channel.name,
      from:        SETTINGS.search_page_size,
      size:        SETTINGS.search_page_size,
      text:        "text",
      type:        undefined
    })
    // from is 5, plus 5 is 10 which is == numHits so no more results
    wrapper.update()
    assert.isFalse(wrapper.find("InfiniteScroll").prop("hasMore"))
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
    inner.setState({ text, from: 7 })
    inner.find("SearchTextbox").prop("onSubmit")({
      preventDefault: helper.sandbox.stub()
    })
    assert.deepEqual(qs.parse(helper.currentLocation.search), { q: text, type })
    assert.deepEqual(inner.state(), {
      // Because this is non-incremental the previous from value of 7 is replaced with 0
      from:          0,
      text,
      votedComments: new Map(),
      error:         null
    })
  })

  it("populates the type from the query parameter", async () => {
    const type = "post"
    await renderPage(
      {},
      {
        location: {
          search: `type=${type}&q=text`
        }
      }
    )
    sinon.assert.calledWith(helper.searchStub, {
      channelName: channel.name,
      from:        0,
      size:        SETTINGS.search_page_size,
      text:        "text",
      type
    })
  })

  it("has a default value for type, which is undefined", async () => {
    await renderPage()
    sinon.assert.calledWith(helper.searchStub, {
      channelName: channel.name,
      from:        0,
      size:        SETTINGS.search_page_size,
      text:        "text",
      type:        undefined
    })
  })

  it("triggers a non-incremental search when the filter type changes", async () => {
    const { inner, store } = await renderPage()
    inner.setState({ from: 7 })
    const type = "comment"
    const text = "text"
    helper.searchStub.reset()
    inner.find("SearchFilterPicker").prop("updatePickerParam")(type, {
      preventDefault: helper.sandbox.stub()
    })
    sinon.assert.calledWith(helper.searchStub, {
      channelName: channel.name,
      from:        0,
      size:        SETTINGS.search_page_size,
      text,
      type
    })
    assert.deepEqual(qs.parse(helper.currentLocation.search), { type, q: text })
    assert.deepEqual(inner.state(), {
      // Because this is non-incremental the previous from value of 7 is replaced with 0
      from:          0,
      text,
      error:         null,
      votedComments: new Map()
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

  it("clears the search on dismount", async () => {
    const { store, wrapper } = await renderPage()
    wrapper.unmount()
    helper.wrapper = null
    assert(store.getLastAction().type === CLEAR_SEARCH)
  })

  //
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
            processing: !searchLoaded,
            data:       {
              initialLoad: true
            }
          }
        },
        {
          channelName: hasChannel ? channel.name : null
        }
      )
      assert.equal(inner.props().loaded, loaded)
    })
  })

  it("calls updateVotedComments when upvote or downvote is triggered", async () => {
    const { inner } = await renderPage()
    const comments = [makeComment(makePost()), makeComment(makePost())]
    helper.updateCommentStub.returns(Promise.resolve(comments[0]))
    await inner
      .find("SearchResult")
      .at(0)
      .props()
      .commentUpvote(comments[0])
    assert.deepEqual(
      inner.state().votedComments.get(comments[0].id),
      comments[0]
    )
    helper.updateCommentStub.returns(Promise.resolve(comments[1]))
    await inner.instance().downvote(comments[1])
    assert.deepEqual(
      inner.state().votedComments.get(comments[1].id),
      comments[1]
    )
  })
})

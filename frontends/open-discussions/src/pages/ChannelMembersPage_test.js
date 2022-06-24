// @flow
import React from "react"
import { assert } from "chai"
import { mount } from "enzyme"
import { Provider } from "react-redux"
import R from "ramda"

import ChannelMembersPage, {
  CHANNEL_MEMBERS_PAGE_SIZE,
  getSortOption
} from "./ChannelMembersPage"
import SearchResult from "../components/SearchResult"

import IntegrationTestHelper from "../util/integration_test_helper"
import { makeChannel } from "../factories/channels"
import { makeSearchResponse } from "../factories/search"
import { MEMBERS_SORT_AUTHOR_NAME, MEMBERS_SORT_JOIN_DATE } from "../lib/picker"

describe("ChannelMembersPage", () => {
  let helper, renderPage, searchResponse, initialState, channel

  beforeEach(() => {
    channel = makeChannel()
    searchResponse = makeSearchResponse(
      CHANNEL_MEMBERS_PAGE_SIZE,
      CHANNEL_MEMBERS_PAGE_SIZE + 40,
      "profile"
    )
    helper = new IntegrationTestHelper()
    helper.searchStub.returns(Promise.resolve(searchResponse))
    initialState = {
      search: {
        loaded: true,
        data:   {
          results:     searchResponse.hits.hits,
          total:       searchResponse.hits.total,
          incremental: false
        }
      }
    }

    renderPage = () =>
      mount(
        <Provider store={helper.createMockStore(initialState)}>
          <ChannelMembersPage channelName={channel.name} />
        </Provider>
      )
  })

  afterEach(() => {
    helper.cleanup()
  })

  it("should render results using SearchResult in a Grid", () => {
    const page = renderPage()
    assert.ok(page.find("Grid").exists())
    assert.lengthOf(page.find(SearchResult), searchResponse.hits.hits.length)
    assert.lengthOf(page.find("Cell"), searchResponse.hits.hits.length)
    // $FlowFixMe: flow thinks page.find doesn't return an interator
    R.zip([...page.find(SearchResult)], searchResponse.hits.hits).forEach(
      ([el, result]) => {
        assert.equal(el.props["result"], result)
      }
    )
  })

  it("should use the InfiniteScroll to fetch more", () => {
    const page = renderPage()
    assert.equal(helper.searchStub.callCount, 1)
    page.find("InfiniteScroll").prop("loadMore")()
    assert.equal(helper.searchStub.callCount, 2)
  })

  it("should have a dropdown for selecting the sort", () => {
    const picker = renderPage().find("ChannelMembersSortPicker")
    assert.equal(picker.prop("value"), MEMBERS_SORT_AUTHOR_NAME)
    assert.equal(helper.searchStub.callCount, 1)
    picker.prop("updatePickerParam")(MEMBERS_SORT_JOIN_DATE)()
    assert.equal(helper.searchStub.callCount, 2)
  })

  //
  ;[
    [MEMBERS_SORT_AUTHOR_NAME, "asc"],
    [
      MEMBERS_SORT_JOIN_DATE,
      {
        order:         "desc",
        nested_path:   "author_channel_join_data",
        nested_filter: {
          term: {
            "author_channel_join_data.name": "worst-channel-ever.jpg"
          }
        }
      }
    ]
  ].forEach(([sortField, expectation]) => {
    it(`getSortOption returns what we want for ${sortField}`, () => {
      assert.deepEqual(
        getSortOption(sortField, "worst-channel-ever.jpg"),
        expectation
      )
    })
  })
})

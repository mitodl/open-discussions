// @flow
import R from "ramda"
import { assert } from "chai"

import {
  UserListItemSortableCards,
  PaginatedUserListItems
} from "./UserListItems"
import { SortableContainer } from "./SortableList"
import { userListItemsApiURL, userListItemsDetailApiURL } from "../lib/url"
import IntegrationTestHelper from "../util/integration_test_helper"
import {
  makeUserListItems,
  makeUserList
} from "../factories/learning_resources"

describe("UserListItems", () => {
  let render, helper

  const pageSize = 5
  const userListId = 123

  beforeEach(() => {
    helper = new IntegrationTestHelper()
  })

  afterEach(() => {
    helper.cleanup()
  })

  describe("UserListItemSortableCards", () => {
    let items

    beforeEach(() => {
      items = makeUserListItems(pageSize)
      helper.handleRequestStub
        .withArgs(userListItemsApiURL.param({ userListId }).toString())
        .returns({
          status: 200,
          body:   {
            count:   items.length,
            results: items,
            prev:    null,
            next:    null
          }
        })
      render = helper.configureReduxQueryRenderer(UserListItemSortableCards, {
        userListId,
        pageSize,
        className: "",
        isSorting: false
      })
    })

    it("should render the list items", async () => {
      const { wrapper } = await render()
      const cards = wrapper.find("LearningResourceCard")
      assert.equal(cards.length, items.length)
      R.zip([...cards], items).forEach(([card, item]) => {
        assert.deepEqual(card.props.object, item.content_data)
      })
    })

    it("should let the user reorder their learning path", async () => {
      const { wrapper } = await render({ isSorting: true })
      wrapper.find(SortableContainer).prop("onSortEnd")({
        oldIndex: 1,
        newIndex: 2
      })
      const [url, method, { body }] = helper.handleRequestStub.args[1]
      assert.equal(method, "PATCH")
      assert.equal(
        url,
        userListItemsDetailApiURL
          .param({ userListId, itemId: items[1].id })
          .toString()
      )
      assert.deepEqual(body, { position: 2 })
    })
  })

  describe("PaginatedUserListItems", () => {
    let userList, items1, items2
    beforeEach(() => {
      userList = makeUserList()
      items1 = makeUserListItems(pageSize)
      items2 = makeUserListItems(pageSize)
      helper.handleRequestStub
        .withArgs(
          userListItemsApiURL.param({ userListId: userList.id }).toString()
        )
        // page 1
        .onFirstCall()
        .returns({
          status: 200,
          body:   {
            count:   pageSize * 2,
            results: items1,
            prev:    null,
            next:    "/next"
          }
        })
        // page 2
        .onSecondCall()
        .returns({
          status: 200,
          body:   {
            count:   pageSize * 2,
            results: items2,
            prev:    "/prev",
            next:    null
          }
        })
        // page 1 again
        .onThirdCall()
        .returns({
          status: 200,
          body:   {
            count:   pageSize * 2,
            results: items1,
            prev:    null,
            next:    "/next"
          }
        })
      render = helper.configureReduxQueryRenderer(PaginatedUserListItems, {
        userList,
        pageSize
      })
    })

    it("should render the list items", async () => {
      const { wrapper } = await render()
      const cards = wrapper.find("LearningResourceRow")
      assert.equal(cards.length, items1.length)
      R.zip([...cards], items1).forEach(([card, item]) => {
        assert.deepEqual(card.props.object, item.content_data)
      })
    })

    it("should let the user navigate items pages", async () => {
      const { wrapper } = await render()
      wrapper.find(".next").simulate("click")
      let cards = wrapper.find("LearningResourceRow")
      assert.equal(cards.length, items2.length)
      R.zip([...cards], items2).forEach(([card, item]) => {
        assert.deepEqual(card.props.object, item.content_data)
      })
      wrapper.find(".previous").simulate("click")
      cards = wrapper.find("LearningResourceRow")
      assert.equal(cards.length, items1.length)
      R.zip([...cards], items1).forEach(([card, item]) => {
        assert.deepEqual(card.props.object, item.content_data)
      })
    })
  })
})

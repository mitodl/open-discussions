// @flow
/* global SETTINGS: false */
import { assert } from "chai"

import UserListDetailPage from "./UserListDetailPage"

import IntegrationTestHelper from "../util/integration_test_helper"
import {
  makeUserList,
  makeUserListItems
} from "../factories/learning_resources"
import { userListDetailApiURL, userListItemsApiURL } from "../lib/url"
import { shouldIf } from "../lib/test_utils"
import { LR_TYPE_LEARNINGPATH, LR_TYPE_USERLIST } from "../lib/constants"

describe("UserListDetailPage tests", () => {
  let helper, userList, render

  beforeEach(() => {
    userList = makeUserList()
    helper = new IntegrationTestHelper()
    helper.handleRequestStub
      .withArgs(
        userListDetailApiURL.param({ userListId: userList.id }).toString()
      )
      .onFirstCall()
      .returns({
        status: 200,
        body:   userList
      })
    helper.handleRequestStub
      .withArgs(
        userListItemsApiURL.param({ userListId: userList.id }).toString()
      )
      .onFirstCall()
      .returns({
        status: 200,
        body:   {
          count:   4,
          results: makeUserListItems(4)
        }
      })
    render = helper.configureReduxQueryRenderer(UserListDetailPage, {
      match: {
        params: {
          id: userList.id
        }
      }
    })
  })

  afterEach(() => {
    helper.cleanup()
  })

  it("should should show the title", async () => {
    const { wrapper } = await render()
    assert.equal(wrapper.find(".list-header").text(), userList.title)
  })

  it("should should show the description", async () => {
    const { wrapper } = await render()
    assert.equal(
      wrapper.find(".list-description").text(),
      userList.short_description
    )
  })

  it("should show a scrollable list of items", async () => {
    const { wrapper } = await render()
    assert.isTrue(wrapper.find("UserListItemSortableCards").exists())
  })

  it("should not show the description if not there", async () => {
    userList.short_description = undefined
    const { wrapper } = await render()
    assert.isNotOk(wrapper.find(".list-description").exists())
  })

  //
  ;[true, false].forEach(usersOwnList => {
    it(`${shouldIf(usersOwnList)} show some editing controls if ${
      usersOwnList ? "is" : "is not"
    } the users own list`, async () => {
      if (usersOwnList) {
        // $FlowFixMe: flow thinks this is invalid for who knows what reason
        userList.author = SETTINGS.user_id
      }
      const { wrapper } = await render()
      assert.equal(wrapper.find(".list-edit-controls").exists(), usersOwnList)
    })
  })

  it("should let the user edit their list", async () => {
    // $FlowFixMe: flow thinks this is invalid for who knows what reason
    userList.author = SETTINGS.user_id
    const { wrapper } = await render()
    wrapper.find(".edit-link").simulate("click")
    const editor = wrapper.find("UserListFormDialog")
    assert.ok(editor.exists())
    assert.deepEqual(editor.prop("userList"), userList)
    editor.prop("hide")()
    wrapper.update()
    assert.isNotOk(wrapper.find("UserListFormDialog").exists())
  })

  //
  ;[
    [0, false],
    [1, false],
    [2, true],
    [3, true]
  ].forEach(([itemCount, shouldShowButton]) => {
    it(`${shouldIf(
      shouldShowButton
    )} show the reorder button for LP with ${String(
      itemCount
    )} items`, async () => {
      // $FlowFixMe: flow thinks this is invalid for who knows what reason
      userList.author = SETTINGS.user_id
      userList.list_type = LR_TYPE_LEARNINGPATH
      userList.item_count = itemCount
      const { wrapper } = await render()
      assert.equal(wrapper.find(".sort-list").exists(), shouldShowButton)
    })
  })

  it("should let the user reorder their learning path", async () => {
    // $FlowFixMe: flow thinks this is invalid for who knows what reason
    userList.author = SETTINGS.user_id
    userList.list_type = LR_TYPE_LEARNINGPATH
    const { wrapper } = await render()
    assert.isFalse(wrapper.find("UserListItemSortableCards").prop("isSorting"))
    wrapper.find(".sort-list").simulate("click")
    assert.isTrue(wrapper.find("UserListItemSortableCards").prop("isSorting"))
  })

  it("should hide the reorder button for a user list", async () => {
    // $FlowFixMe: flow thinks this is invalid for who knows what reason
    userList.author = SETTINGS.user_id
    userList.list_type = LR_TYPE_USERLIST
    const { wrapper } = await render()
    assert.isNotOk(wrapper.find(".sort-list").exists())
  })
})

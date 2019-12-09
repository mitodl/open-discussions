// @flow
/* global SETTINGS:false */
import { assert } from "chai"

import UserListsPage from "./UserListsPage"

import IntegrationTestHelper from "../util/integration_test_helper"
import {
  makeUserList,
  makeFavoritesResponse
} from "../factories/learning_resources"
import { queryListResponse } from "../lib/test_utils"
import { userListApiURL, favoritesURL, topicApiURL } from "../lib/url"
import * as util from "../lib/util"
import { FAVORITES_PSEUDO_LIST } from "../lib/constants"

describe("UserListsPage tests", () => {
  let helper, userLists, render, favorites
  const userId = 92932

  beforeEach(() => {
    userLists = [makeUserList(), makeUserList(), makeUserList()]
    userLists[0].author = userId
    userLists[1].author = userId
    userLists[2].author = userId + 1
    helper = new IntegrationTestHelper()

    helper.handleRequestStub
      .withArgs(userListApiURL.toString())
      .returns(queryListResponse(userLists))
    favorites = makeFavoritesResponse()
    helper.handleRequestStub
      .withArgs(favoritesURL)
      .returns(queryListResponse(favorites))
    helper.handleRequestStub
      .withArgs(topicApiURL)
      .returns(queryListResponse([]))
    render = helper.configureReduxQueryRenderer(UserListsPage)
  })

  afterEach(() => {
    helper.cleanup()
  })

  //
  ;[[userId, 2], [null, 0]].forEach(([authorId, numLists]) => {
    it(`should pass ${numLists} user lists down to user list card`, async () => {
      SETTINGS.user_id = authorId
      const { wrapper } = await render()
      const cards = wrapper.find("UserListCard")
      // Expect <numLists> cards, plus 1 for favorites
      assert.equal(cards.length, numLists + 1)
      userLists.slice(0, numLists).forEach((list, i) => {
        assert.equal(
          list,
          wrapper
            .find("UserListCard")
            .at(i + 1)
            .prop("userList")
        )
      })
    })
  })

  it("should pass favorites down to user list card", async () => {
    helper.handleRequestStub
      .withArgs(userListApiURL.toString())
      .returns(queryListResponse([]))
    const { wrapper } = await render()
    const card = wrapper.find("UserListCard").at(0)
    assert.isTrue(card.prop("hideUserListOptions"))
    const { title, list_type, items } = card.prop("userList") // eslint-disable-line camelcase
    assert.equal(title, "My Favorites")
    assert.equal(list_type, FAVORITES_PSEUDO_LIST)
    assert.deepEqual(
      items.map(item => item.id).sort(),
      favorites.map(item => item.content_data.id).sort()
    )
  })

  it("should hide and show the create list dialog", async () => {
    const { wrapper } = await render()
    assert.isNotOk(wrapper.find("UserListFormDialog").exists())
    wrapper.find(".blue-btn").simulate("click")
    assert.ok(wrapper.find("UserListFormDialog").exists())
    wrapper.find("UserListFormDialog").prop("hide")()
    wrapper.update()
    assert.isNotOk(wrapper.find("UserListFormDialog").exists())
  })

  it("should not open create list dialog for anonymous users", async () => {
    helper.sandbox.stub(util, "userIsAnonymous").returns(true)
    const { wrapper } = await render()
    assert.isNotOk(wrapper.find("UserListFormDialog").exists())
    wrapper.find(".blue-btn").simulate("click")
    assert.isNotOk(wrapper.find("UserListFormDialog").exists())
  })
})

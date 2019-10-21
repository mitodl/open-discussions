// @flow
import { assert } from "chai"

import UserListPage from "./UserListPage"

import IntegrationTestHelper from "../util/integration_test_helper"
import { makeUserList } from "../factories/learning_resources"
import { queryListResponse } from "../lib/test_utils"
import { userListApiURL } from "../lib/url"

describe("UserListPage tests", () => {
  let helper, userLists, render

  beforeEach(() => {
    userLists = [makeUserList(), makeUserList(), makeUserList()]
    helper = new IntegrationTestHelper()

    helper.handleRequestStub
      .withArgs(userListApiURL)
      .returns(queryListResponse(userLists))
    render = helper.configureReduxQueryRenderer(UserListPage)
  })

  afterEach(() => {
    helper.cleanup()
  })

  it("should pass user lists down to user list card", async () => {
    const { wrapper } = await render()
    userLists.forEach((list, i) => {
      assert.equal(
        list,
        wrapper
          .find("UserListCard")
          .at(i)
          .prop("userList")
      )
    })
  })
})

// @flow
import { assert } from "chai"

import UserListsPage from "./UserListsPage"

import IntegrationTestHelper from "../util/integration_test_helper"
import { makeUserList } from "../factories/learning_resources"
import { queryListResponse } from "../lib/test_utils"
import { userListApiURL } from "../lib/url"
import * as util from "../lib/util"

describe("UserListsPage tests", () => {
  let helper, userLists, render

  beforeEach(() => {
    userLists = [makeUserList(), makeUserList(), makeUserList()]
    helper = new IntegrationTestHelper()

    helper.handleRequestStub
      .withArgs(userListApiURL)
      .returns(queryListResponse(userLists))
    render = helper.configureReduxQueryRenderer(UserListsPage)
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

  it("should hide and show the create list dialog", async () => {
    const { wrapper } = await render()
    assert.isNotOk(wrapper.find("CreateUserListDialog").exists())
    wrapper.find(".blue-btn").simulate("click")
    assert.ok(wrapper.find("CreateUserListDialog").exists())
    wrapper.find("CreateUserListDialog").prop("hide")()
    wrapper.update()
    assert.isNotOk(wrapper.find("CreateUserListDialog").exists())
  })

  it("should not open create list dialog for anonymous users", async () => {
    helper.sandbox.stub(util, "userIsAnonymous").returns(true)
    const { wrapper } = await render()
    assert.isNotOk(wrapper.find("CreateUserListDialog").exists())
    wrapper.find(".blue-btn").simulate("click")
    assert.isNotOk(wrapper.find("CreateUserListDialog").exists())
  })
})

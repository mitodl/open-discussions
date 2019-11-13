// @flow
import { assert } from "chai"
import R from "ramda"

import UserListDetailPage from "./UserListDetailPage"
import { LearningResourceCard } from "../components/LearningResourceCard"

import IntegrationTestHelper from "../util/integration_test_helper"
import { makeUserList } from "../factories/learning_resources"
import { userListApiURL } from "../lib/url"
import { queryListResponse } from "../lib/test_utils"

describe("UserListDetailPage tests", () => {
  let helper, userList, render

  beforeEach(() => {
    userList = makeUserList()
    helper = new IntegrationTestHelper()
    helper.handleRequestStub
      .withArgs(`${userListApiURL}/${userList.id}/`)
      .returns({
        status: 200,
        body:   userList
      })
    helper.handleRequestStub
      .withArgs(userListApiURL)
      .returns(queryListResponse([]))
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

  it("should not show the description if not there", async () => {
    userList.short_description = undefined
    const { wrapper } = await render()
    assert.isNotOk(wrapper.find(".list-description").exists())
  })

  it("should render the list items", async () => {
    const { wrapper } = await render()
    R.zip([...wrapper.find(LearningResourceCard)], userList.items).forEach(
      ([card, item]) => {
        assert.deepEqual(card.props.object, item.content_data)
      }
    )
  })
})

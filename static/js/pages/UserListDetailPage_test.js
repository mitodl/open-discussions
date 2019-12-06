// @flow
/* global SETTINGS: false */
import { assert } from "chai"
import R from "ramda"
import arrayMove from "array-move"

import UserListDetailPage from "./UserListDetailPage"
import { LearningResourceCard } from "../components/LearningResourceCard"
import { SortableContainer } from "../components/SortableList"

import IntegrationTestHelper from "../util/integration_test_helper"
import { makeUserList } from "../factories/learning_resources"
import { userListApiURL } from "../lib/url"
import { shouldIf } from "../lib/test_utils"
import { LR_TYPE_LEARNINGPATH, LR_TYPE_USERLIST } from "../lib/constants"

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
  ;[[0, false], [1, false], [2, true], [3, true]].forEach(
    ([listItems, shouldShowButton]) => {
      it(`${shouldIf(
        shouldShowButton
      )} show the reorder button for LP with ${String(
        listItems
      )} items`, async () => {
        // $FlowFixMe: flow thinks this is invalid for who knows what reason
        userList.author = SETTINGS.user_id
        userList.list_type = LR_TYPE_LEARNINGPATH
        userList.items = userList.items.slice(0, listItems)
        const { wrapper } = await render()
        assert.equal(wrapper.find(".sort-list").exists(), shouldShowButton)
      })
    }
  )

  it("should hide the reorder button for a user list", async () => {
    // $FlowFixMe: flow thinks this is invalid for who knows what reason
    userList.author = SETTINGS.user_id
    userList.list_type = LR_TYPE_USERLIST
    const { wrapper } = await render()
    assert.isNotOk(wrapper.find(".sort-list").exists())
  })

  it("should let the user reorder their learning path", async () => {
    // $FlowFixMe: flow thinks this is invalid for who knows what reason
    userList.author = SETTINGS.user_id
    userList.list_type = LR_TYPE_LEARNINGPATH
    const { wrapper } = await render()
    wrapper.find(".sort-list").simulate("click")
    wrapper.find("LearningResourceCard").forEach(card => {
      assert.isTrue(card.prop("reordering"))
    })

    wrapper.find(SortableContainer).prop("onSortEnd")({
      oldIndex: 1,
      newIndex: 2
    })
    const [url, method, { body }] = helper.handleRequestStub.args[1]
    assert.equal(method, "PATCH")
    assert.equal(url, `${userListApiURL}/${userList.id}/`)
    assert.deepEqual(body.id, userList.id)
    assert.deepEqual(
      body.items,
      arrayMove(userList.items, 1, 2).map((item, idx) => ({
        id:       item.id,
        position: idx
      }))
    )
  })
})

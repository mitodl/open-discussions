// @flow
import { assert } from "chai"
import R from "ramda"
import sinon from "sinon"

import UserListCard from "./UserListCard"
import DropdownMenu from "./DropdownMenu"
import Dialog from "./Dialog"

import IntegrationTestHelper from "../util/integration_test_helper"
import { makeUserList, makeUserListItem } from "../factories/learning_resources"
import { LR_TYPE_COURSE, readableLearningResources } from "../lib/constants"
import { userListApiURL } from "../lib/url"
import * as urlLib from "../lib/url"

describe("UserListCard tests", () => {
  let userList, helper, renderUserListCard

  beforeEach(() => {
    userList = makeUserList()
    helper = new IntegrationTestHelper()
    renderUserListCard = helper.configureReduxQueryRenderer(UserListCard, {
      userList
    })
  })

  afterEach(() => {
    helper.cleanup()
  })

  const getDeleteDialog = wrapper => {
    wrapper.find(".more_vert").simulate("click")
    wrapper.update()
    wrapper
      .find(DropdownMenu)
      .find("div")
      .simulate("click")
    return wrapper.find(Dialog)
  }

  it("should print the list type (learning path || list)", async () => {
    const { wrapper } = await renderUserListCard()
    assert.equal(
      wrapper.find(".platform").text(),
      readableLearningResources[userList.list_type]
    )
  })

  it("should put the title", async () => {
    const { wrapper } = await renderUserListCard()
    assert.equal(
      wrapper
        .find(".ul-title")
        .at(0)
        .text(),
      userList.title
    )
  })

  //
  ;[[0, "Items"], [1, "Item"], [2, "Items"], [10, "Items"]].forEach(
    ([itemCount, expectedText]) => {
      it(`should have a properly-formatted count of ${String(
        itemCount
      )} items`, async () => {
        userList.items = R.times(
          () => makeUserListItem(LR_TYPE_COURSE),
          itemCount
        )
        const { wrapper } = await renderUserListCard()
        const text = wrapper.find(".count").text()
        assert.include(text, expectedText)
      })
    }
  )

  it("should render the image of the first list item", async () => {
    helper.sandbox.stub(urlLib, "embedlyThumbnail").returns("南瓜")
    const { wrapper } = await renderUserListCard()
    const { src } = wrapper.find("img").props()
    assert.equal(src, "南瓜")
  })

  it("should have a button to open a delete menu, which should confirm", async () => {
    const { wrapper } = await renderUserListCard()
    const dialog = getDeleteDialog(wrapper)
    const { submitText, title, hideDialog } = dialog.props()
    assert.equal(submitText, "Delete")
    assert.equal(
      title,
      `Delete this ${readableLearningResources[userList.list_type]}?`
    )
    hideDialog()
    wrapper.update()
    assert.isNotOk(wrapper.find("Dialog").exists())
  })

  it("should issue a DELETE request if the user confirms", async () => {
    const { wrapper } = await renderUserListCard()
    const { onAccept } = getDeleteDialog(wrapper).props()
    await onAccept()

    sinon.assert.calledWith(
      helper.handleRequestStub,
      `${userListApiURL}/${userList.id}/`,
      "DELETE"
    )
  })
})

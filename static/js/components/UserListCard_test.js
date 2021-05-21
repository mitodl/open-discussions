// @flow
import { assert } from "chai"
import R from "ramda"
import sinon from "sinon"

import UserListCard from "./UserListCard"
import DropdownMenu from "./DropdownMenu"
import Dialog from "./Dialog"
import UserListFormDialog from "./UserListFormDialog"

import IntegrationTestHelper from "../util/integration_test_helper"
import { makeUserList } from "../factories/learning_resources"
import { readableLearningResources } from "../lib/constants"
import { topicApiURL, userListDetailApiURL } from "../lib/url"
import * as urlLib from "../lib/url"
import { queryListResponse } from "../lib/test_utils"

describe("UserListCard tests", () => {
  let userList, helper, renderUserListCard

  beforeEach(() => {
    userList = makeUserList()
    helper = new IntegrationTestHelper()
    helper.handleRequestStub
      .withArgs(topicApiURL)
      .returns(queryListResponse([]))
    renderUserListCard = helper.configureReduxQueryRenderer(UserListCard, {
      userList
    })
  })

  afterEach(() => {
    helper.cleanup()
  })

  const getDialog = R.curry((index, Component, wrapper) => {
    wrapper.find(".more_vert").simulate("click")
    wrapper.update()
    wrapper
      .find(DropdownMenu)
      .find("div")
      .at(index)
      .simulate("click")
    return wrapper.find(Component)
  })

  const getDeleteDialog = getDialog(0, Dialog)
  const getEditDialog = getDialog(1, UserListFormDialog)

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
  ;[
    [0, "Items"],
    [1, "Item"],
    [2, "Items"],
    [10, "Items"]
  ].forEach(([itemCount, expectedText]) => {
    it(`should have a properly-formatted count of ${String(
      itemCount
    )} items`, async () => {
      userList.item_count = itemCount
      const { wrapper } = await renderUserListCard()
      const text = wrapper.find(".count").text()
      assert.include(text, expectedText)
    })
  })

  it("should render the image of the first list item", async () => {
    helper.sandbox.stub(urlLib, "embedlyThumbnail").returns("南瓜")
    const { wrapper } = await renderUserListCard()
    const { src } = wrapper.find("img").props()
    assert.equal(src, "南瓜")
  })

  it("should hide the dropdown menu if you pass the flag", async () => {
    const { wrapper } = await renderUserListCard({ hideUserListOptions: true })
    assert.isNotOk(wrapper.find(".more_vert").exists())
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
    assert.isNotOk(wrapper.find(Dialog).exists())
  })

  it("should issue a DELETE request if the user confirms", async () => {
    const { wrapper } = await renderUserListCard()
    const { onAccept } = getDeleteDialog(wrapper).props()
    await onAccept()

    sinon.assert.calledWith(
      helper.handleRequestStub,
      userListDetailApiURL.param({ userListId: userList.id }).toString(),
      "DELETE"
    )
  })

  it("should let you open a dialog to edit the UserList", async () => {
    const { wrapper } = await renderUserListCard()
    const dialog = getEditDialog(wrapper)
    assert.deepEqual(dialog.prop("userList"), userList)
    dialog.prop("hide")()
    wrapper.update()
    assert.isNotOk(wrapper.find(Dialog).exists())
  })
})

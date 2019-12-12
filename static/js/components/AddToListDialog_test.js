// @flow
/* global SETTINGS:false */
import { assert } from "chai"
import { times } from "ramda"
import { Checkbox } from "@rmwc/checkbox"

import UserListFormDialog from "./UserListFormDialog"
import AddToListDialog from "./AddToListDialog"

import IntegrationTestHelper from "../util/integration_test_helper"
import { makeCourse, makeUserList } from "../factories/learning_resources"
import { courseURL, topicApiURL, userListApiURL } from "../lib/url"
import { queryListResponse, shouldIf } from "../lib/test_utils"
import { DIALOG_ADD_TO_LIST, setDialogData } from "../actions/ui"
import { LR_TYPE_USERLIST } from "../lib/constants"

describe("AddToListDialog", () => {
  let renderDialog, userLists, helper, course
  SETTINGS.user_id = 92932

  beforeEach(() => {
    userLists = times(makeUserList, 7)
    userLists.forEach((userList, idx) => {
      userList.author = idx < 5 ? SETTINGS.user_id : 121212
    })
    course = makeCourse()
    helper = new IntegrationTestHelper()
    renderDialog = helper.configureReduxQueryRenderer(AddToListDialog)
    helper.handleRequestStub
      .withArgs(userListApiURL)
      .returns(queryListResponse(userLists))
    helper.handleRequestStub
      .withArgs(topicApiURL)
      .returns(queryListResponse([]))
    helper.handleRequestStub.withArgs(`${courseURL}/${course.id}/`).returns({
      status: 200,
      body:   course
    })
  })

  afterEach(() => {
    helper.cleanup()
  })

  const render = async (object = course) => {
    const { wrapper, store } = await renderDialog({}, [
      setDialogData({ dialogKey: DIALOG_ADD_TO_LIST, data: object })
    ])
    return { wrapper, store }
  }

  it("should render a dialog with all the right checkboxes", async () => {
    const { wrapper } = await render()
    const checkboxes = wrapper.find(Checkbox)

    // Should be 1 checkbox for each list, plus 1 for favorites, minus 2 for non-authored lists
    assert.equal(checkboxes.length, userLists.length - 1)

    // 1st checkbox for Favorites
    const favoriteCheck = checkboxes.at(0)
    assert.equal(favoriteCheck.find("label").text(), "Favorites")

    const userListCheck = checkboxes.at(1)
    assert.equal(userListCheck.find("label").text(), userLists[0].title)
  })

  it("if resource is a list, dont let user add that list to itself", async () => {
    const object = userLists[0]
    helper.handleRequestStub
      .withArgs(`${userListApiURL}/${object.id}/`)
      .returns({
        status: 200,
        body:   object
      })
    const { wrapper } = await render(object)
    const checkboxes = wrapper.find(Checkbox)

    // Should be 1 checkbox for each list, plus 1 for favorites, -2 for non-authored lists, -1 for excluded list
    assert.equal(checkboxes.length, userLists.length - 2)

    const userListCheck = checkboxes.at(1)
    assert.equal(userListCheck.find("label").text(), userLists[1].title)
  })

  it("if list is in a resource's items, dont let user add that resource to the list", async () => {
    const object = userLists[0]
    object.items.push({
      content_type: LR_TYPE_USERLIST,
      object_id:    userLists[1].id
    })
    helper.handleRequestStub
      .withArgs(`${userListApiURL}/${object.id}/`)
      .returns({
        status: 200,
        body:   object
      })
    const { wrapper } = await render(object)
    const checkboxes = wrapper.find(Checkbox)

    // Should be 1 checkbox for each list, plus 1 for favorites, -2 for non-authored lists, -2 for excluded lists
    assert.equal(checkboxes.length, userLists.length - 3)

    const userListCheck = checkboxes.at(1)
    assert.equal(userListCheck.find("label").text(), userLists[2].title)
  })

  //
  ;[true, false].forEach(inList => {
    it(`${shouldIf(inList)} precheck a userlist if the resource is ${
      inList ? "" : "not"
    } in it`, async () => {
      if (inList) {
        course.lists.push({ list_id: userLists[0].id, item_id: 1 })
      }
      const { wrapper } = await render(course)
      assert.equal(
        wrapper
          .find(Checkbox)
          .at(1)
          .prop("checked"),
        inList
      )
    })
  })

  it(`should uncheck the correct userlist`, async () => {
    course.lists.push({ list_id: userLists[0].id, item_id: 1 })
    course.lists.push({ list_id: userLists[1].id, item_id: 1 })
    course.lists.push({ list_id: userLists[2].id, item_id: 1 })

    const { wrapper } = await render(course)
    ;[1, 2, 3].forEach(idx => {
      assert.equal(
        wrapper
          .find(Checkbox)
          .at(idx)
          .prop("checked"),
        true
      )
    })
    wrapper
      .find(Checkbox)
      .at(2)
      .find("input")
      .simulate("change", { target: { checked: false } })
    assert.equal(
      wrapper
        .find(Checkbox)
        .at(2)
        .prop("checked"),
      false
    )
  })

  it("should have a button for making a new list", async () => {
    const { wrapper } = await render(course)
    wrapper.find(".create-new-list").simulate("click")
    assert.ok(wrapper.find(UserListFormDialog).exists())
  })
})

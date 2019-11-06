// @flow
import { assert } from "chai"
import { times } from "ramda"
import { Checkbox } from "@rmwc/checkbox"

import IntegrationTestHelper from "../util/integration_test_helper"
import { AddToListDialog } from "./AddToListDialog"
import {
  makeCourse,
  makeUserList
} from "../factories/learning_resources"
import {
  courseURL,
  userListApiURL,
} from "../lib/url"
import { queryListResponse, shouldIf } from "../lib/test_utils"

describe("AddToListDialog", () => {
  let render,
    userLists,
    helper,
    course

  beforeEach(() => {
    userLists = times(makeUserList, 5)
    course = makeCourse()
    helper = new IntegrationTestHelper()
    render = helper.configureReduxQueryRenderer(AddToListDialog, {
      object: course
    })
    helper.handleRequestStub
      .withArgs(userListApiURL)
      .returns(queryListResponse(userLists))
    helper.handleRequestStub.withArgs(`${courseURL}/${course.id}/`).returns({
      status: 200,
      body:   course
    })
  })

  afterEach(() => {
    helper.cleanup()
  })

  it("should render a dialog with all the right checkboxes", async () => {
    const { wrapper } = await render()
    const checkboxes = wrapper.find(Checkbox)

    // Should be 1 checkbox for each list, plus 1 for favorites
    assert.equal(checkboxes.length, userLists.length + 1)

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
    const { wrapper } = await render({
      object
    })
    const checkboxes = wrapper.find(Checkbox)

    // Should be 1 checkbox for each list, plus 1 for favorites, -1 for excluded list
    assert.equal(checkboxes.length, userLists.length)

    const userListCheck = checkboxes.at(1)
    assert.equal(userListCheck.find("label").text(), userLists[1].title)
  })

  //
  ;[true, false].forEach(inList => {
    it(`${shouldIf(inList)} precheck a userlist if the resource is ${
      inList ? "" : "not"
    } in it`, async () => {
      course.id = inList ? userLists[0].items[0].object_id : course.id
      helper.handleRequestStub.withArgs(`${courseURL}/${course.id}/`).returns({
        status: 200,
        body:   course
      })
      const { wrapper } = await render()
      assert.equal(
        wrapper
          .find(Checkbox)
          .at(1)
          .prop("checked"),
        inList
      )
    })
  })
})

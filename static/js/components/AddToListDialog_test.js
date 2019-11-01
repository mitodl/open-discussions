// @flow
import sinon from "sinon"
import { assert } from "chai"
import { times } from "ramda"
import { Checkbox } from "@rmwc/checkbox"

import IntegrationTestHelper from "../util/integration_test_helper"
import { AddToListDialog } from "./AddToListDialog"
import {
  makeCourse,
  makeLearningResource,
  makeUserList
} from "../factories/learning_resources"
import { courseURL, userListApiURL } from "../lib/url"
import { queryListResponse, shouldIf } from "../lib/test_utils"
import { LR_TYPE_ALL, LR_TYPE_COURSE } from "../lib/constants"

describe("AddToListDialog", () => {
  let render,
    userLists,
    helper,
    course,
    hideStub,
    toggleFavoriteStub,
    toggleListItemStub

  beforeEach(() => {
    userLists = times(makeUserList, 5)
    course = makeCourse()
    helper = new IntegrationTestHelper()
    hideStub = helper.sandbox.stub()
    toggleFavoriteStub = helper.sandbox.stub()
    toggleListItemStub = helper.sandbox.stub()
    render = helper.configureReduxQueryRenderer(AddToListDialog, {
      hide:           hideStub,
      toggleFavorite: toggleFavoriteStub,
      toggleListItem: toggleListItemStub,
      resource:       course
    })
    helper.handleRequestStub
      .withArgs(userListApiURL)
      .returns(queryListResponse(userLists))
    helper.handleRequestStub
      .withArgs(courseURL)
      .returns(queryListResponse([course]))
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

  //
  ;[true, false].forEach(inList => {
    it(`${shouldIf(inList)} precheck a userlist if the resource is ${
      inList ? "" : "not"
    } in it`, async () => {
      course.id = inList ? userLists[0].items[0].object_id : course.id
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

  LR_TYPE_ALL.forEach(objectType => {
    it(`should call toggleFavorite when Favorite checkbox checked for ${objectType}`, async () => {
      const object = makeLearningResource(objectType)
      const { wrapper } = await render({
        resource: object
      })
      const event = { target: { checked: true, name: "foo", value: "bar" } }
      wrapper
        .find("input")
        .at(0)
        .prop("onChange")(event)
      sinon.assert.calledWith(toggleFavoriteStub, object)
    })
  })

  LR_TYPE_ALL.forEach(objectType => {
    [true, false].forEach(checked => {
      it(`should call toggleListItem ${
        checked ? "" : "w/remove=true"
      } when a List checkbox is ${
        checked ? "" : "un"
      }checked for a ${objectType}`, async () => {
        const object = makeLearningResource(objectType)
        const { wrapper } = await render({
          resource: object
        })
        const event = {
          target: { checked: checked, name: "foo", value: "bar" }
        }
        const userList = userLists[0]
        userList.items = [
          {
            content_type: LR_TYPE_COURSE,
            object_id:    object.id,
            remove:       !checked
          }
        ]
        wrapper
          .find("input")
          .at(1)
          .prop("onChange")(event)
        sinon.assert.calledWith(toggleListItemStub, object, userList, !checked)
      })
    })
  })
})

/* global SETTINGS: false */
import React from "react"
import { mount } from "enzyme"
import { assert } from "chai"
import { Provider } from "react-redux"

import ProfileImage, { DIALOG_PROFILE_IMAGE } from "./ProfileImage"
import IntegrationTestHelper from "../util/integration_test_helper"
import { showDialog } from "../actions/ui"
import { startPhotoEdit } from "../actions/image_upload"

describe("ProfileImage", () => {
  let helper, div

  const thatProfile = {
    name:               "test_name",
    bio:                "test_bio",
    headline:           "test_headline",
    image_file:         null,
    image_small_file:   null,
    image_medium_file:  null,
    image:              null,
    image_small:        null,
    image_medium:       null,
    username:           "test_username"
  }

  const renderProfileImage = (props = {}) => {
    div = document.createElement("div")
    return mount(
      <Provider store={helper.store}>
        <ProfileImage profile={thatProfile} {...props} />
      </Provider>,
      {
        attachTo: div
      }
    )
  }

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    // thatProfile is the logged in user
    SETTINGS.username = thatProfile.username
    helper.updateProfileImageStub
      .returns(Promise.resolve(''))
    helper.getProfileStub
      .returns(Promise.resolve(thatProfile))
  })

  afterEach(() => {
    helper.cleanup()
  })

  describe("upload button", () => {
    it("should be hidden if not editable", () => {
      for (const editable of [true, false]) {
        const image = renderProfileImage({
          editable: editable
        })
        assert.equal(image.find(".open-photo-dialog").length === 1, editable)
      }
    })

    it("should have a ProfileImageUploader only if editable === true", () => {
      for (const editable of [true, false]) {
        const image = renderProfileImage({ editable })
        assert.equal(image.find("ProfileImageUploader").length === 1, editable)
      }
    })

    describe("save button", () => {
      it("should call updateProfileImageStub when the save button is pressed", () => {
        const image = renderProfileImage({
          editable: true
        })
        image.find(".open-photo-dialog").at(0).simulate("click")
        helper.store.dispatch(showDialog(DIALOG_PROFILE_IMAGE))
        helper.store.dispatch(startPhotoEdit({ name: "a name" }))
        const dialog = image.find("ProfileImageUploader").find('Dialog')
        const saveButton = dialog.find(".edit-button").at(0)
        saveButton.simulate("click")
        assert.isTrue(helper.updateProfileImageStub.called)
      })
    })
  })
})


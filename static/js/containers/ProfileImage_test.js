/* global SETTINGS: false */
import React from "react"
import { mount } from "enzyme"
import { assert } from "chai"
import { Provider } from "react-redux"

import ProfileImage, {
  PROFILE_IMAGE_MICRO,
  PROFILE_IMAGE_SMALL,
  PROFILE_IMAGE_MEDIUM
} from "./ProfileImage"

import IntegrationTestHelper from "../util/integration_test_helper"
import { startPhotoEdit } from "../actions/image_upload"
import { defaultProfileImageUrl } from "../lib/util"
import * as utilFuncs from "../lib/util"

describe("ProfileImage", () => {
  let helper, div, makeProfileImageUrlStub

  const thatProfile = {
    name:              "test_name",
    bio:               "test_bio",
    headline:          "test_headline",
    image_file:        null,
    image_small_file:  null,
    image_medium_file: null,
    image:             null,
    image_small:       null,
    image_medium:      null,
    username:          "test_username"
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
    helper.patchProfileImageStub.returns(Promise.resolve(""))
    helper.getProfileStub.returns(Promise.resolve(thatProfile))
    makeProfileImageUrlStub = helper.sandbox
      .stub(utilFuncs, "makeProfileImageUrl")
      .returns(defaultProfileImageUrl)
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
      it("should call patchProfileImageStub when the save button is pressed", () => {
        const image = renderProfileImage({
          editable: true,
          userName: "a username"
        })
        helper.store.dispatch(startPhotoEdit({ name: "a name" }))
        image
          .find(".open-photo-dialog")
          .at(0)
          .simulate("click")
        const dialog = image.find("ProfileImageUploader").find("Dialog")
        const saveButton = dialog.find(".edit-button").at(0)
        saveButton.simulate("click")
        assert.isTrue(helper.patchProfileImageStub.called)
      })

      it("should not be visible if no photo is selected", () => {
        const image = renderProfileImage({
          editable: true
        })
        image
          .find(".open-photo-dialog")
          .at(0)
          .simulate("click")
        const dialog = image.find("ProfileImageUploader").find("Dialog")
        assert.equal(dialog.find(".edit-button").length, 0)
      })
    })
  })

  it("should set imageSize as a className", () => {
    [PROFILE_IMAGE_MICRO, PROFILE_IMAGE_SMALL, PROFILE_IMAGE_MEDIUM].forEach(
      imageSize => {
        const image = renderProfileImage({
          imageSize
        })
        assert.include(
          image.find(".profile-image").props().className,
          imageSize
        )
      }
    )
  })

  //
  ;[
    [PROFILE_IMAGE_MICRO, true],
    [PROFILE_IMAGE_SMALL, true],
    [PROFILE_IMAGE_MEDIUM, false]
  ].forEach(([imageSize, exp]) => {
    it(`should call makeProfileImageUrl with ${exp} if imageSize is ${imageSize}`, () => {
      renderProfileImage({ imageSize })
      assert.ok(makeProfileImageUrlStub.calledWith(thatProfile, exp))
    })
  })
})

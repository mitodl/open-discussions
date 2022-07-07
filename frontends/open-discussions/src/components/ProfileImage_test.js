// @flow
/* global SETTINGS: false */
import React from "react"
import sinon from "sinon"
import { mount } from "enzyme"
import { assert } from "chai"
import { Provider } from "react-redux"

import ProfileImage, {
  PROFILE_IMAGE_MICRO,
  PROFILE_IMAGE_SMALL,
  PROFILE_IMAGE_MEDIUM
} from "./ProfileImage"

import { actions } from "../actions"
import IntegrationTestHelper from "../util/integration_test_helper"
import { defaultProfileImageUrl, wait } from "../lib/util"
import { HIDE_DIALOG } from "../actions/ui"
import { shouldIf } from "../lib/test_utils"

describe("ProfileImage", () => {
  let helper, div, listenForActions

  const thatProfile = {
    name:                 "test_name",
    bio:                  "test_bio",
    headline:             "test_headline",
    image_file:           null,
    image_small_file:     null,
    image_medium_file:    null,
    image:                null,
    image_small:          null,
    image_medium:         null,
    username:             "test_username",
    profile_image_small:  defaultProfileImageUrl,
    profile_image_medium: defaultProfileImageUrl
  }

  const renderProfileImage = (props = {}) => {
    div = document.createElement("div")
    return mount(
      <Provider store={helper.store}>
        <ProfileImage
          profile={thatProfile}
          imageSize={PROFILE_IMAGE_MEDIUM}
          {...props}
        />
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
    listenForActions = helper.listenForActions
    helper.patchProfileImageStub.returns(Promise.resolve(""))
    helper.getProfileStub.returns(Promise.resolve(thatProfile))
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

    it("should use className props", () => {
      const image = renderProfileImage({
        className: "testcss"
      })
      assert.ok(image.find(".testcss").exists())
    })

    it("should have a ImageUploaderForm only if editable === true", () => {
      for (const editable of [true, false]) {
        const image = renderProfileImage({ editable })
        assert.equal(image.find("ImageUploaderForm").length === 1, editable)
      }
    })

    it("should have a description in the upload dialog", () => {
      const image = renderProfileImage({ editable: true })
      assert.include(image.find("DialogTitle").text(), "Upload a Profile Image")
    })

    describe("save button", () => {
      it("should call patchProfileImageStub when the save button is pressed", async () => {
        const username = "a username"
        const image = renderProfileImage({
          editable: true,
          userName: username
        })
        const props = image.find("ImageUploaderForm").props()
        // set initial state to populate a form with an image loaded
        props.formBeginEdit()
        props.onUpdate({
          target: {
            name:  "image",
            value: { name: "a name" }
          }
        })
        image.find(".open-photo-dialog").at(0).simulate("click")
        const dialog = image.find("ImageUploaderForm").find("OurDialog")
        const saveButton = dialog.find(".submit").at(0)
        saveButton.simulate("click")
        // do a cycle for rerender based on promises
        await wait(0)
        assert.isTrue(helper.patchProfileImageStub.called)
        sinon.assert.calledWith(helper.getProfileStub, username)
        assert.deepEqual(helper.store.getState().ui.dialogs, new Map())
      })

      it("should show a validation message if the image upload fails", async () => {
        const image = renderProfileImage({
          editable: true,
          userName: "a username"
        })
        const props = image.find("ImageUploaderForm").props()
        // set initial state to populate a form with an image loaded
        props.formBeginEdit()
        props.onUpdate({
          target: {
            name:  "image",
            value: { name: "a name" }
          }
        })
        helper.patchProfileImageStub.returns(Promise.reject("abc"))
        image.find(".open-photo-dialog").at(0).simulate("click")
        const dialog = image.find("ImageUploaderForm").find("OurDialog")
        const saveButton = dialog.find(".submit").at(0)
        saveButton.simulate("click")
        // do a cycle for rerender based on promises
        await wait(0)
        image.update()
        assert.equal(
          image.find('div[role="alert"]').text(),
          "Error uploading image"
        )
        assert.isTrue(helper.patchProfileImageStub.called)
      })

      it("should populate the file in the state from the drag and drop", async () => {
        const image = renderProfileImage({
          editable: true,
          userName: "a username"
        })
        const validFile = new Blob(["bytes"], { type: "image/png" })
        // $FlowFixMe: adding a fake name to the Blob to make it more like a File
        validFile.name = "name.png"
        image.find(".photo-dropzone").at(0).props().onDrop([validFile])
        // do a cycle for rerender based on promises
        await wait(0)
        image.update()
        assert.equal(image.find('div[role="alert"]').length, 0)
        assert.deepEqual(
          helper.store.getState().forms["image:upload:profile"],
          {
            errors: {},
            value:  {
              edit:  null,
              image: validFile
            }
          }
        )
      })

      it("should show a validation message if the drag and drop fails", async () => {
        const image = renderProfileImage({
          editable: true,
          userName: "a username"
        })
        image.find(".photo-dropzone").at(0).props().onDropRejected()
        // do a cycle for rerender based on promises
        await wait(0)
        image.update()
        assert.equal(
          image.find('div[role="alert"]').text(),
          "Please select a valid photo"
        )
      })

      it("should update the edited blob", async () => {
        const image = renderProfileImage({
          editable: true,
          userName: "a username"
        })
        const props = image.find("ImageUploaderForm").props()
        // set initial state to populate a form with an image loaded
        const file = new Blob(["nothing here", { type: "image/png" }])
        // $FlowFixMe: adding a fake name to the Blob to make it more like a File
        file.name = "a name"
        props.formBeginEdit()
        props.onUpdate({
          target: {
            name:  "image",
            value: file
          }
        })
        // do a cycle for rerender based on promises
        await wait(0)
        image.update()
        assert.equal(image.find(".cropper-text").text(), "Crop your image")

        const updatedBlob = new Blob(["updated"])
        image.find("CropperWrapper").props().updatePhotoEdit(updatedBlob)
        assert.deepEqual(
          helper.store.getState().forms["image:upload:profile"],
          {
            errors: {},
            value:  {
              edit:  updatedBlob,
              image: file
            }
          }
        )
      })

      it("clears the form when the cancel button is clicked", async () => {
        const image = renderProfileImage({
          editable: true,
          userName: "a username"
        })
        image.find(".open-photo-dialog").at(0).simulate("click")
        const dialog = image.find("ImageUploaderForm").find("OurDialog")
        const cancelButton = dialog.find(".cancel").at(0)
        await listenForActions(
          [actions.forms.FORM_BEGIN_EDIT, HIDE_DIALOG, HIDE_DIALOG],
          () => {
            cancelButton.simulate("click")
          }
        )
      })

      it("removes the form when the component is unmounted", async () => {
        const image = renderProfileImage({
          editable: true,
          userName: "a username"
        })
        await listenForActions([actions.forms.FORM_END_EDIT], () => {
          image.unmount()
        })
      })

      it("hides the dialog", async () => {
        const image = renderProfileImage({
          editable: true,
          userName: "a username"
        })
        image.find(".open-photo-dialog").at(0).simulate("click")
        const dialog = image.find("ImageUploaderForm").find("OurDialog")
        await listenForActions([HIDE_DIALOG, HIDE_DIALOG], () => {
          dialog.props().hideDialog()
        })
      })

      it("should not be visible if no photo is selected", () => {
        const image = renderProfileImage({
          editable: true
        })
        image.find(".open-photo-dialog").at(0).simulate("click")
        const dialog = image.find("ImageUploaderForm").find("Dialog")
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

  it("should pass the processing value", async () => {
    const render = helper.configureHOCRenderer(
      ProfileImage,
      "ProfileImage",
      {
        profileImage: {
          processing: true
        }
      },
      { editable: true }
    )

    const { inner } = await render()
    assert.equal(
      inner.find("Connect(withForm(ImageUploader))").props().processing,
      true
    )
  })

  //
  ;[
    [PROFILE_IMAGE_MICRO, true],
    [PROFILE_IMAGE_SMALL, true],
    [PROFILE_IMAGE_MEDIUM, false]
  ].forEach(([imageSize, exp]) => {
    it(`image url ${shouldIf(
      exp
    )} be small if imageSize is ${imageSize}`, () => {
      const image = renderProfileImage({ imageSize })
      assert.equal(
        image.find(".profile-image").props().src,
        thatProfile.profile_image_small
      )
    })
  })
})

// @flow
import sinon from "sinon"
import { assert } from "chai"

import ImageUploader from "./ImageUploader"
import IntegrationTestHelper from "../util/integration_test_helper"

describe("ImageUploader", () => {
  let helper, renderPage

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    renderPage = helper.configureHOCRenderer(ImageUploader, "ImageUploader", {
      ui: {
        dialogs: new Map()
      }
    })
  })

  afterEach(() => {
    helper.cleanup()
  })

  it("calls onUpdate when onSubmit is invoked", async () => {
    const onUpdate = helper.sandbox.stub()
    const name = "name",
      image = "image",
      edit = "edit"
    const { inner } = await renderPage({}, { name, onUpdate })
    inner.props().onSubmit({ image, edit })
    sinon.assert.calledWith(onUpdate, {
      target: {
        name,
        value: {
          edit,
          image
        }
      }
    })
  })

  it("passes processing to the form", async () => {
    const { wrapper } = await renderPage({}, { processing: true })
    assert.isTrue(wrapper.find("withForm(ImageUploader)").props().processing)
  })
})

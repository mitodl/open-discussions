// @flow
import { assert } from "chai"
import sinon from "sinon"
import Dropzone from "react-dropzone"
import R from "ramda"

import CoverImageInput from "./CoverImageInput"

import { configureShallowRenderer } from "../lib/test_utils"
import { makeEvent } from "../lib/test_utils"

describe("CoverImageInput", () => {
  let renderInput,
    onUpdateStub,
    setPhotoErrorStub,
    imageFile,
    sandbox,
    hideCoverImageInputStub

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    onUpdateStub = sandbox.stub()
    setPhotoErrorStub = sandbox.stub()
    hideCoverImageInputStub = sandbox.stub()
    imageFile = new File([], "foobar.jpg")
    renderInput = configureShallowRenderer(CoverImageInput, {
      onUpdate:            onUpdateStub,
      setPhotoError:       setPhotoErrorStub,
      hideCoverImageInput: hideCoverImageInputStub
    })
  })

  afterEach(() => {
    sandbox.restore()
  })

  it("should render a dropzone", () => {
    const wrapper = renderInput()
    const dropZone = wrapper.find(Dropzone)
    assert.ok(dropZone.exists())
    assert.ok(dropZone.find("button").exists())
    const { className, accept } = dropZone.props()
    assert.equal(className, "photo-active-item photo-dropzone dashed-border")
    assert.deepEqual(accept, "image/*")
  })

  it("should have an onDrop function wired up right on the dropzone", () => {
    const dropZone = renderInput().find(Dropzone)
    const { onDrop } = dropZone.props()
    onDrop([imageFile])
    const event = R.omit(
      ["preventDefault"],
      makeEvent("cover_image", imageFile)
    )
    sinon.assert.calledWith(onUpdateStub, event)
  })

  it("should have an onDropRejected function wired up right on the dropzone", () => {
    const dropZone = renderInput().find(Dropzone)
    const { onDropRejected } = dropZone.props()
    onDropRejected()
    sinon.assert.calledWith(setPhotoErrorStub, "Please select a valid photo")
  })

  it("should render an image if the prop is provided", () => {
    sandbox.stub(URL, "createObjectURL").returns("image!")
    ;[(imageFile, "http://example.com/foo.jpg")].forEach(image => {
      const wrapper = renderInput({ image })
      const img = wrapper.find("img")
      assert.ok(img.exists())
      const { src } = img.props()
      if (typeof image === "string" || image instanceof String) {
        assert.equal(image, src)
      } else {
        assert.equal("image!", src)
      }
    })
  })

  it("should show a button to clear input if an image is present", () => {
    const wrapper = renderInput({ image: imageFile })
    const btn = wrapper.find("button")
    assert.equal(btn.text(), "remove image")
    btn.props().onClick()
    sinon.assert.calledWith(
      onUpdateStub,
      R.omit(["preventDefault"], makeEvent("cover_image", undefined))
    )
  })

  it("should show a button to remove the input", () => {
    const wrapper = renderInput()
    const btn = wrapper.find("a.navy")
    assert.equal(btn.text(), "remove cover image")
    const event = {
      preventDefault:  sandbox.stub(),
      stopPropagation: sandbox.stub()
    }
    btn.props().onClick(event)
    sinon.assert.called(hideCoverImageInputStub)
    sinon.assert.called(event.preventDefault)
    sinon.assert.called(event.stopPropagation)
  })
})

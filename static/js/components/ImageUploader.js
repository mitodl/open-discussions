// @flow
import React from "react"
import { Dialog } from "@mitodl/mdl-react-components"
import R from "ramda"
import Dropzone from "react-dropzone"

import CropperWrapper from "./CropperWrapper"
import { validationMessage } from "../lib/validation"
import type { FormProps } from "../flow/formTypes"
import type { FormErrors, FormValue } from "../flow/formTypes"

const onDrop = R.curry((startPhotoEdit, files) => startPhotoEdit(...files))

const dropZone = (startPhotoEdit, setPhotoError) => (
  <Dropzone
    onDrop={onDrop(startPhotoEdit)}
    className="photo-upload-dialog photo-active-item photo-dropzone dashed-border"
    style={{ height: uploaderBodyHeight() }}
    accept="image/*"
    onDropRejected={() => setPhotoError("Please select a valid photo")}
  >
    <div className="desktop-upload-message">
      Drag a photo here or click to select a photo.
    </div>
    <div className="mobile-upload-message">Click to select a photo.</div>
  </Dropzone>
)

const spinner = () => (
  <div
    className="photo-upload-dialog photo-active-item photo-dropzone dashed-border"
    style={{ height: uploaderBodyHeight() }}
  >
    <div className="sk-fading-circle">
      <div className="sk-circle1 sk-circle" />
      <div className="sk-circle2 sk-circle" />
      <div className="sk-circle3 sk-circle" />
      <div className="sk-circle4 sk-circle" />
      <div className="sk-circle5 sk-circle" />
      <div className="sk-circle6 sk-circle" />
      <div className="sk-circle7 sk-circle" />
      <div className="sk-circle8 sk-circle" />
      <div className="sk-circle9 sk-circle" />
      <div className="sk-circle10 sk-circle" />
      <div className="sk-circle11 sk-circle" />
      <div className="sk-circle12 sk-circle" />
    </div>
  </div>
)

const uploaderBodyHeight = (): number => R.min(500, window.innerHeight * 0.44)

const dialogContents = (
  updatePhotoEdit,
  photo,
  startPhotoEdit,
  setPhotoError,
  inFlight
) => {
  if (inFlight) {
    return spinner()
  } else if (photo) {
    return (
      <span>
        <CropperWrapper
          updatePhotoEdit={updatePhotoEdit}
          photo={photo}
          guides={true}
          uploaderBodyHeight={uploaderBodyHeight}
        />
        <span className="cropper-text">Crop your image</span>
      </span>
    )
  } else {
    return dropZone(startPhotoEdit, setPhotoError)
  }
}

type ImageUploaderProps<Form> = {
  description: string,
  dialogOpen: boolean,
  setDialogVisibility: (b: boolean) => void,
  processing: boolean,
  validateForm: (FormValue<Form>) => { value: FormErrors<Form> },
  formBeginEdit: () => Action,
  formEndEdit: () => Action,
  formValidate: ($Shape<Form>) => Action
} & FormProps<Form>

export default class ImageUploader<Form> extends React.Component<
  ImageUploaderProps<Form>
> {
  startPhotoEdit = (photo: File) => {
    const { formBeginEdit, onUpdate } = this.props
    formBeginEdit()
    onUpdate({
      target: {
        name:  "image",
        value: photo
      }
    })
  }

  clearPhotoEdit = () => {
    const { formBeginEdit } = this.props
    formBeginEdit()
  }

  updatePhotoEdit = (blob: Blob) => {
    const { onUpdate } = this.props

    onUpdate({
      target: {
        value: blob,
        name:  "edit"
      }
    })
  }

  setPhotoError = (message: string) => {
    const { formValidate } = this.props
    formValidate({ image: message })
  }

  render() {
    const {
      description,
      dialogOpen,
      setDialogVisibility,
      processing,
      form: { image },
      onSubmit,
      validation
    } = this.props

    return (
      <Dialog
        title={`Upload a ${description}`}
        autoScrollBodyContent={true}
        contentStyle={{ maxWidth: "620px" }}
        open={dialogOpen}
        onAccept={image && !processing ? onSubmit : null}
        onCancel={() => {
          this.clearPhotoEdit()
          setDialogVisibility(false)
        }}
        validateOnClick={true}
        hideDialog={() => {
          setDialogVisibility(false)
        }}
      >
        {validationMessage(validation.image)}
        {dialogContents(
          this.updatePhotoEdit,
          image,
          this.startPhotoEdit,
          this.setPhotoError,
          processing
        )}
      </Dialog>
    )
  }
}

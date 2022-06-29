// @flow
import React from "react"
import R from "ramda"
import Dropzone from "react-dropzone"

import CropperWrapper from "./CropperWrapper"
import Dialog from "./Dialog"

import { ValidationError } from "ol-forms"

import type { FormProps } from "../flow/formTypes"
import type { FormErrors, FormValue } from "../flow/formTypes"

const uploaderBodyHeight = (): number => R.min(500, window.innerHeight * 0.44)

type ImageUploaderProps<Form> = {
  description: string,
  dialogOpen: boolean,
  setDialogVisibility: (b: boolean) => void,
  processing: boolean,
  validateForm: (FormValue<Form>) => { value: FormErrors<Form> },
  formBeginEdit: () => Action,
  formEndEdit: () => Action,
  formValidate: ($Shape<Form>) => Action,
  height: number,
  width: number
} & FormProps<Form>

type ImageForm = {
  image: any
}

export default class ImageUploaderForm extends React.Component<
  ImageUploaderProps<ImageForm>
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

  dialogContents = () => {
    const {
      height,
      width,
      form: { image },
      processing
    } = this.props

    if (processing) {
      return this.spinner()
    } else if (image) {
      return (
        <span>
          <CropperWrapper
            updatePhotoEdit={this.updatePhotoEdit}
            photo={image}
            guides={true}
            uploaderBodyHeight={uploaderBodyHeight}
            height={height}
            width={width}
          />
          <span className="cropper-text">Crop your image</span>
        </span>
      )
    } else {
      return this.dropZone()
    }
  }

  spinner = () => (
    <div
      className="photo-upload-dialog photo-active-item photo-dropzone dashed-border"
      style={{ height: uploaderBodyHeight(), width: uploaderBodyHeight() }}
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

  dropZone = () => {
    const onDrop = R.curry((startPhotoEdit, files) => startPhotoEdit(...files))

    return (
      <Dropzone
        onDrop={onDrop(this.startPhotoEdit)}
        className="photo-upload-dialog photo-active-item photo-dropzone dashed-border"
        style={{ height: uploaderBodyHeight(), width: uploaderBodyHeight() }}
        accept="image/*"
        onDropRejected={() => this.setPhotoError("Please select a valid photo")}
      >
        <div className="desktop-upload-message">
          Drag an image here
          <br />
          or
          <br />
          <button type="button" className="outlined">
            Click to select an image
          </button>
        </div>
        <div className="mobile-upload-message">Click to select a photo.</div>
      </Dropzone>
    )
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
        className="photo-upload-dialog"
        autoScrollBodyContent={true}
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
        submitText="Save"
      >
        {<ValidationError className="text-center" message={validation.image} />}
        {this.dialogContents()}
      </Dialog>
    )
  }
}

// @flow
import React from "react"
import { Dialog } from "@mitodl/mdl-react-components"
import R from "ramda"
import Dropzone from "react-dropzone"

import CropperWrapper from "./CropperWrapper"
import { FETCH_PROCESSING } from "../actions"
import type { ImageUploadState } from "../reducers/image_upload"

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

const imageError = err => <div className="img-error">{err}</div>

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
      <CropperWrapper
        updatePhotoEdit={updatePhotoEdit}
        photo={photo}
        uploaderBodyHeight={uploaderBodyHeight}
      />
    )
  } else {
    return dropZone(startPhotoEdit, setPhotoError)
  }
}

type ImageUploadProps = {
  photoDialogOpen: boolean,
  setDialogVisibility: (b: boolean) => void,
  startPhotoEdit: (p: File) => void,
  clearPhotoEdit: () => void,
  imageUpload: ImageUploadState,
  updateUserPhoto: (i: string) => Promise<string>,
  updatePhotoEdit: (b: Blob) => void,
  setPhotoError: (s: string) => void
}

const ProfileImageUploader = ({
  photoDialogOpen,
  setDialogVisibility,
  startPhotoEdit,
  clearPhotoEdit,
  updatePhotoEdit,
  imageUpload: { photo, error, patchStatus },
  updateUserPhoto,
  setPhotoError
}: ImageUploadProps) => {
  const inFlight = patchStatus === FETCH_PROCESSING

  return (
    <Dialog
      title="Upload a Profile Photo"
      autoScrollBodyContent={true}
      contentStyle={{ maxWidth: "620px" }}
      open={photoDialogOpen}
      onAccept={photo || inFlight ? updateUserPhoto : null}
      onCancel={clearPhotoEdit}
      hideDialog={() => {
        setDialogVisibility(false)
      }}
    >
      {imageError(error)}
      {dialogContents(
        updatePhotoEdit,
        photo,
        startPhotoEdit,
        setPhotoError,
        inFlight
      )}
    </Dialog>
  )
}

export default ProfileImageUploader

// @flow
import React from "react"
import { Dialog } from "@mitodl/mdl-react-components"
import R from "ramda"
import Dropzone from "react-dropzone"

import CropperWrapper from "./CropperWrapper"
import SpinnerButton from "../components/SpinnerButton"
import { FETCH_PROCESSING } from "../actions"
import type { ImageUploadState } from "../reducers/image_upload"

const onDrop = R.curry((startPhotoEdit, files) => startPhotoEdit(...files))

const dropZone = (startPhotoEdit, setPhotoError) => (
  <Dropzone
    onDrop={onDrop(startPhotoEdit)}
    style={{ height: uploaderBodyHeight() }}
    className="photo-upload-dialog photo-active-item photo-dropzone dashed-border"
    accept="image/*"
    onDropRejected={() => setPhotoError("Please select a valid photo")}
  >
    <div
      className="photo-upload-dialog photo-active-item photo-dropzone dashed-border"
      style={{ height: uploaderBodyHeight() }}
    >
      <div className="desktop-upload-message">
        Drag a photo here or click to select a photo.
      </div>
      <div className="mobile-upload-message">Click to select a photo.</div>
    </div>
  </Dropzone>
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
    return (
      <div
        className="photo-active-item dashed-border spinner"
        style={{ height: uploaderBodyHeight() }}
      >
        <SpinnerButton />
      </div>
    )
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
  const disabled = patchStatus === FETCH_PROCESSING || !photo

  return (
    <Dialog
      title="Upload a Profile Photo"
      onRequestClose={() => setDialogVisibility(false)}
      autoScrollBodyContent={true}
      contentStyle={{ maxWidth: "620px" }}
      open={photoDialogOpen}
      onAccept={updateUserPhoto}
      hideDialog={() => {
        clearPhotoEdit()
        setDialogVisibility(false)
      }}
      onCancel={() => {
        clearPhotoEdit()
      }}
      disabled={disabled}
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

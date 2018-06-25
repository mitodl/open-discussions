// @flow
/* global SETTINGS: false */
import React from "react"
import { connect } from "react-redux"

import ProfileImageUploader from "../components/ProfileImageUploader"

import { createActionHelper } from "../lib/redux_rest"
import {
  startPhotoEdit,
  clearPhotoEdit,
  updatePhotoEdit,
  setPhotoError
} from "../actions/image_upload"
import { defaultProfileImageUrl, makeProfileImageUrl } from "../lib/util"
import { showDialog, hideDialog, DIALOG_PROFILE_IMAGE } from "../actions/ui"
import { actions } from "../actions"
import { updateProfilePhoto } from "../reducers/image_upload"
import { initials } from "../lib/profile"

import type { Profile } from "../flow/discussionTypes"
import type { Dispatch } from "redux"

const formatPhotoName = photo => `${photo.name.replace(/\.\w*$/, "")}.jpg`

export const PROFILE_IMAGE_MICRO: "micro" = "micro"
export const PROFILE_IMAGE_SMALL: "small" = "small"
export const PROFILE_IMAGE_MEDIUM: "medium" = "medium"

type ImageSize =
  | typeof PROFILE_IMAGE_MICRO
  | typeof PROFILE_IMAGE_SMALL
  | typeof PROFILE_IMAGE_MEDIUM

type ProfileImageProps = {
  clearPhotoEdit: () => void,
  dispatch: Dispatch<any>,
  editable: boolean,
  imageUpload: Object,
  photoDialogOpen: boolean,
  profile: Profile,
  userName?: ?string,
  setPhotoError: (s: string) => void,
  startPhotoEdit: (p: File) => void,
  updatePhotoEdit: (b: Blob) => void,
  imageSize: ImageSize,
  onClick?: Function
}

class ProfileImage extends React.Component<ProfileImageProps> {
  static defaultProps = {
    editable: false
  }

  saveProfilePhoto = async () => {
    const {
      imageUpload: { edit, photo },
      dispatch,
      clearPhotoEdit,
      userName
    } = this.props

    if (userName) {
      await dispatch(updateProfilePhoto(userName, edit, formatPhotoName(photo)))

      clearPhotoEdit()
      this.setDialogVisibility(false)
      dispatch(actions.profiles.get(userName))
    }
  }

  setDialogVisibility = (visibility: boolean) => {
    const { dispatch } = this.props
    if (visibility) {
      dispatch(showDialog(DIALOG_PROFILE_IMAGE))
    } else {
      dispatch(hideDialog(DIALOG_PROFILE_IMAGE))
    }
  }

  render() {
    const { profile, imageSize, editable, onClick } = this.props

    const imageUrl = makeProfileImageUrl(
      profile,
      imageSize === "micro" || imageSize === "small"
    )

    return (
      <div className="profile-image-container">
        <div className="avatar" onClick={onClick}>
          {imageUrl.endsWith(defaultProfileImageUrl) &&
          profile &&
          profile.name ? (
              <div className={`profile-image ${imageSize}`}>
                <div className={`profile-initials ${imageSize}`}>
                  {initials(profile.name)}
                </div>
              </div>
            ) : (
              <img
                src={imageUrl}
                alt={`Profile image for ${profile ? profile.name : "anonymous"}`}
                className={`profile-image ${imageSize}`}
              />
            )}
          {editable ? (
            <span>
              <ProfileImageUploader
                {...this.props}
                updateUserPhoto={this.saveProfilePhoto}
                setDialogVisibility={this.setDialogVisibility}
              />
              <button
                className="open-photo-dialog"
                onClick={() => {
                  this.setDialogVisibility(true)
                }}
              >
                {imageUrl === defaultProfileImageUrl ? (
                  <i name="camera_alt" className="material-icons add">
                    add
                  </i>
                ) : (
                  <i name="camera_alt" className="material-icons edit">
                    edit
                  </i>
                )}
              </button>
            </span>
          ) : null}
        </div>
      </div>
    )
  }
}

const mapStateToProps = state => {
  const { ui, imageUpload } = state
  const photoDialogOpen = ui.dialogs.has(DIALOG_PROFILE_IMAGE)

  return {
    imageUpload,
    photoDialogOpen
  }
}

const mapDispatchToProps = (dispatch: Dispatch<*>) => ({
  startPhotoEdit:  createActionHelper(dispatch, startPhotoEdit),
  clearPhotoEdit:  createActionHelper(dispatch, clearPhotoEdit),
  updatePhotoEdit: createActionHelper(dispatch, updatePhotoEdit),
  setPhotoError:   createActionHelper(dispatch, setPhotoError),
  dispatch:        dispatch
})

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ProfileImage)

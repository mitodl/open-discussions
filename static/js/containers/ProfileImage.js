// @flow
/* global SETTINGS: false */
import React from "react"
import { connect } from "react-redux"
import type { Dispatch } from "redux"

import { makeProfileImageUrl } from "../util/util"
import type { Profile } from "../flow/discussionTypes"
import ProfileImageUploader from "../components/ProfileImageUploader"
import { createActionHelper } from "../lib/redux_rest"
import {
  startPhotoEdit,
  clearPhotoEdit,
  updatePhotoEdit,
  setPhotoError
} from "../actions/image_upload"

import { showDialog, hideDialog, DIALOG_PROFILE_IMAGE } from "../actions/ui"
import { actions } from "../actions"
import { updateProfilePhoto } from "../reducers/profiles"

const formatPhotoName = photo => `${photo.name.replace(/\.\w*$/, "")}.jpg`

class ProfileImage extends React.Component<*> {
  props: {
    clearPhotoEdit: () => void,
    dispatch: Dispatch,
    editable: boolean,
    imageUpload: Object,
    photoDialogOpen: boolean,
    profile: Profile,
    userName: string,
    setPhotoError: (s: string) => void,
    startPhotoEdit: (p: File) => void,
    updatePhotoEdit: (b: Blob) => void,
    useSmall?: boolean
  }

  static defaultProps = {
    editable: false
  }

  updateUserPhoto = () => {
    const {
      imageUpload: { edit, photo },
      dispatch,
      clearPhotoEdit,
      userName
    } = this.props

    return dispatch(
      updateProfilePhoto(userName, edit, formatPhotoName(photo))
    ).then(() => {
      clearPhotoEdit()
      this.setDialogVisibility(false)
      dispatch(actions.profiles.get(userName))
    })
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
    const { profile, useSmall, editable } = this.props

    const imageUrl = makeProfileImageUrl(profile, useSmall)
    const imageSizeClass = useSmall ? "small" : "medium"

    return (
      <div className="profile-image-edit">
        <div className="avatar">
          <img
            src={imageUrl}
            alt={`Profile image for ${profile.name}`}
            className={`profile-image ${imageSizeClass}`}
          />
          {editable ? (
            <span>
              <ProfileImageUploader
                {...this.props}
                updateUserPhoto={this.updateUserPhoto}
                setDialogVisibility={this.setDialogVisibility}
              />
              <button
                className="open-photo-dialog"
                onClick={() => {
                  this.setDialogVisibility(true)
                }}
              >
                <i name="camera_alt" className="material-icons camera">
                  camera_alt
                </i>
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

const mapDispatchToProps = dispatch => ({
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

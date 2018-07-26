// @flow
/* global SETTINGS: false */
import React from "react"
import R from "ramda"
import { connect } from "react-redux"

import ImageUploader from "../components/ImageUploader"
import withForm from "../hoc/withForm"

import { defaultProfileImageUrl, makeProfileImageUrl } from "../lib/util"
import { showDialog, hideDialog, DIALOG_PROFILE_IMAGE } from "../actions/ui"
import { actions } from "../actions"
import { initials } from "../lib/profile"
import { configureForm } from "../lib/forms"
import { newProfileImageForm } from "../lib/profile"
import { mergeAndInjectProps } from "../lib/redux_props"
import { validateImageForm } from "../lib/validation"
import type { Profile, ProfileImageForm } from "../flow/discussionTypes"
import type { WithFormProps } from "../flow/formTypes"
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
  dispatch: Dispatch<any>,
  editable: boolean,
  getProfile: (username: string) => Promise<*>,
  photoDialogOpen: boolean,
  profile: Profile,
  userName?: ?string,
  updateProfilePhoto: (
    username: string,
    image: Blob,
    name: string
  ) => Promise<*>,
  imageSize: ImageSize,
  onClick?: Function,
  showDialog: () => void,
  hideDialog: () => void
} & WithFormProps<ProfileImageForm>

const PROFILE_IMAGE_KEY = "profile:image"
const { getForm, actionCreators } = configureForm(
  PROFILE_IMAGE_KEY,
  newProfileImageForm
)

class ProfileImage extends React.Component<ProfileImageProps> {
  static defaultProps = {
    editable: false
  }

  setDialogVisibility = (visibility: boolean) => {
    const { showDialog, hideDialog } = this.props
    if (visibility) {
      showDialog()
    } else {
      hideDialog()
    }
  }

  render() {
    const {
      profile,
      imageSize,
      editable,
      onClick,
      renderForm,
      photoDialogOpen,
      formBeginEdit,
      formEndEdit,
      formValidate
    } = this.props

    const imageUrl = profile
      ? imageSize === "micro" || imageSize === "small"
        ? profile.profile_image_small
        : profile.profile_image_medium
      : defaultProfileImageUrl

    return (
      <div className="profile-image-container">
        <div className="avatar" onClick={onClick}>
          <img
            src={imageUrl}
            alt={`Profile image for ${profile ? profile.name : "anonymous"}`}
            className={`profile-image ${imageSize}`}
          />
          {editable ? (
            <span>
              {renderForm({
                setDialogVisibility: this.setDialogVisibility,
                dialogOpen:          photoDialogOpen,
                formBeginEdit:       formBeginEdit,
                formEndEdit:         formEndEdit,
                formValidate:        formValidate
              })}
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

const mapStateToProps = (state, ownProps) => {
  const { ui, profileImage } = state
  const photoDialogOpen = ui.dialogs.has(DIALOG_PROFILE_IMAGE)
  const processing = profileImage.processing

  return {
    photoDialogOpen,
    processing,
    userName:     ownProps.userName,
    editable:     ownProps.editable,
    validateForm: validateImageForm,
    form:         getForm(state)
  }
}

const onSubmit = actions.profileImage.patch
const getProfile = actions.profiles.get

const onSubmitError = formValidate =>
  formValidate({ image: `Error uploading image` })

const mergeProps = mergeAndInjectProps(
  (
    { userName, editable },
    {
      formValidate,
      formBeginEdit,
      formEndEdit,
      hideDialog,
      getProfile,
      onSubmit
    }
  ) => ({
    onSubmitResult: () => {
      formBeginEdit()
      hideDialog()
      getProfile(userName)
    },
    onSubmitError: () => onSubmitError(formValidate),
    onSubmit:      ({ image, edit }) =>
      onSubmit(userName, edit, formatPhotoName(image)),
    formValidate:  formValidate,
    formBeginEdit: () => (editable ? formBeginEdit() : () => null),
    formEndEdit:   () => (editable ? formEndEdit() : () => null)
  })
)

export default R.compose(
  connect(
    mapStateToProps,
    {
      onSubmit,
      getProfile,
      showDialog: () => showDialog(DIALOG_PROFILE_IMAGE),
      hideDialog: () => hideDialog(DIALOG_PROFILE_IMAGE),
      ...actionCreators
    },
    mergeProps
  ),
  withForm(ImageUploader)
)(ProfileImage)

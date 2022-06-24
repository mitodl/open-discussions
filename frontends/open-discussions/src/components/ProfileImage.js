// @flow
import React from "react"
import { connect } from "react-redux"

import ImageUploader from "./ImageUploader"

import { defaultProfileImageUrl } from "../lib/util"
import { actions } from "../actions"

import type { Profile } from "../flow/discussionTypes"

export const PROFILE_IMAGE_MICRO: "micro" = "micro"
export const PROFILE_IMAGE_SMALL: "small" = "small"
export const PROFILE_IMAGE_MEDIUM: "medium" = "medium"

type ImageSize =
  | typeof PROFILE_IMAGE_MICRO
  | typeof PROFILE_IMAGE_SMALL
  | typeof PROFILE_IMAGE_MEDIUM

type OwnProps = {|
  imageSize: ImageSize,
  profile: ?Profile,
  userName?: ?string,
  editable?: boolean,
  className?: string
|}

type StateProps = {|
  processing: boolean
|}

type DispatchProps = {|
  getProfile: (username: string) => Promise<*>,
  submitImage: (username: string, edit: Blob, name: string) => Promise<*>
|}

type Props = {|
  ...OwnProps,
  ...StateProps,
  ...DispatchProps
|}

const formatPhotoName = photo => `${photo.name.replace(/\.\w*$/, "")}.jpg`

class ProfileImage extends React.Component<Props> {
  static defaultProps = {
    editable: false
  }

  submitImage = async (event: Object) => {
    const { submitImage, getProfile, userName } = this.props
    if (!userName) {
      throw new Error(
        "Expected userName to be specified for editable ProfileImages"
      )
    }

    const {
      target: {
        value: { image, edit }
      }
    } = event
    await submitImage(userName, edit, formatPhotoName(image))
    await getProfile(userName)
  }

  render() {
    const { editable, profile, imageSize, processing, className } = this.props

    let imageUrl, profileName
    if (profile) {
      profileName = profile.name
      imageUrl =
        imageSize === "micro" || imageSize === "small"
          ? profile.profile_image_small
          : profile.profile_image_medium
    } else {
      profileName = "anonymous"
      imageUrl = defaultProfileImageUrl
    }

    const isAdd = imageUrl === defaultProfileImageUrl
    return (
      <div className={`profile-image-container ${className || ""}`}>
        <div className="avatar">
          <img
            src={imageUrl}
            alt={`Profile image for ${profileName}`}
            className={`profile-image ${imageSize}`}
          />
          {editable ? (
            <ImageUploader
              name="profile"
              onUpdate={this.submitImage}
              showButton={true}
              isAdd={isAdd}
              description="Profile Image"
              width={512}
              height={512}
              processing={processing}
            />
          ) : null}
        </div>
      </div>
    )
  }
}

const mapStateToProps = (state: Object): StateProps => ({
  processing: state.profileImage.processing
})

export default connect<Props, OwnProps, _, DispatchProps, _, _>(
  mapStateToProps,
  {
    submitImage: actions.profileImage.patch,
    getProfile:  actions.profiles.get
  }
)(ProfileImage)

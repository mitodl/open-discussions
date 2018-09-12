// @flow
/* global SETTINGS: false */
import React from "react"
import { connect } from "react-redux"
import { bindActionCreators } from "redux"

import ImageUploader, { makeDialogKey } from "./ImageUploader"

import {
  getDefaultChannelAvatarUrl,
  defaultChannelAvatarUrlPrefix
} from "../lib/util"
import { showDialog } from "../actions/ui"
import { initials } from "../lib/profile"

import type { Dispatch } from "redux"
import type { Channel } from "../flow/discussionTypes"

export const CHANNEL_AVATAR_SMALL: "small" = "small"
export const CHANNEL_AVATAR_MEDIUM: "medium" = "medium"
export const CHANNEL_AVATAR_LARGE: "large" = "large"

type ImageSize =
  | typeof CHANNEL_AVATAR_SMALL
  | typeof CHANNEL_AVATAR_MEDIUM
  | typeof CHANNEL_AVATAR_LARGE

type Props = {
  imageSize: ImageSize,
  channel: Channel,
  editable?: boolean,
  formImageUrl?: ?string,
  showDialog?: () => any,
  name?: string,
  onUpdate?: (event: Object) => Promise<*>
}

const getImage = (channel: Channel, imageSize: ImageSize) =>
  imageSize === CHANNEL_AVATAR_SMALL
    ? channel.avatar_small
    : channel.avatar_medium

class ChannelAvatar extends React.Component<Props> {
  static defaultProps = {
    editable: false
  }

  render() {
    const {
      channel,
      editable,
      formImageUrl,
      onUpdate,
      name,
      imageSize
    } = this.props

    const imageUrl =
      formImageUrl ||
      getImage(channel, imageSize) ||
      getDefaultChannelAvatarUrl(channel.name)
    const isAdd = imageUrl.startsWith(defaultChannelAvatarUrlPrefix)

    return (
      <div className={`avatar-container row ${imageSize}-size`}>
        <div className="avatar">
          {isAdd ? (
            <div
              className="avatar-initials"
              style={{ backgroundImage: `url(${imageUrl})` }}
            >
              {initials(channel.title)}
            </div>
          ) : (
            <img
              src={imageUrl}
              alt={`Channel avatar for ${channel.name}`}
              className={`avatar-image`}
            />
          )}
          {editable ? (
            <ImageUploader
              name={name}
              onUpdate={onUpdate}
              isAdd={isAdd}
              description="Channel Avatar"
              width={512}
              height={512}
              showButton={true}
            />
          ) : null}
        </div>
      </div>
    )
  }
}

const mapDispatchToProps = (dispatch: Dispatch<*>, ownProps) =>
  // $FlowFixMe
  bindActionCreators(
    {
      // $FlowFixMe
      showDialog: () => showDialog(makeDialogKey(ownProps.name))
    },
    dispatch
  )

export default connect(
  null,
  mapDispatchToProps
)(ChannelAvatar)

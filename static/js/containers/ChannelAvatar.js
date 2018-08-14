// @flow
/* global SETTINGS: false */
import React from "react"
import { connect } from "react-redux"
import { bindActionCreators } from "redux"

import ImageUploader, { makeDialogKey } from "./ImageUploader"

import { defaultChannelAvatarUrl } from "../lib/util"
import { showDialog } from "../actions/ui"
import { initials } from "../lib/profile"

import type { Dispatch } from "redux"
import type { Channel } from "../flow/discussionTypes"

type Props = {
  editable: boolean,
  channel: Channel,
  channelName?: ?string,
  formImageUrl: ?string,
  showDialog: () => any,
  name: string,
  onUpdate: (event: Object) => Promise<*>
}

class ChannelAvatar extends React.Component<Props> {
  static defaultProps = {
    editable: false
  }

  render() {
    const {
      channel,
      editable,
      formImageUrl,
      showDialog,
      onUpdate,
      name
    } = this.props

    const imageUrl = formImageUrl || channel.avatar || defaultChannelAvatarUrl
    const isAdd = imageUrl === defaultChannelAvatarUrl

    return (
      <div className="avatar-container row">
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
              showButton={false}
            />
          ) : null}
        </div>
        {editable ? (
          <a className="upload-avatar" onClick={showDialog}>
            Upload Avatar
          </a>
        ) : null}
      </div>
    )
  }
}

const mapDispatchToProps = (dispatch: Dispatch<*>, ownProps) =>
  bindActionCreators(
    {
      showDialog: () => showDialog(makeDialogKey(ownProps.name))
    },
    dispatch
  )

export default connect(
  null,
  mapDispatchToProps
)(ChannelAvatar)

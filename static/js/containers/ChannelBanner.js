// @flow
/* global SETTINGS: false */
import React from "react"
import { connect } from "react-redux"
import { bindActionCreators } from "redux"

import ImageUploader, { makeDialogKey } from "./ImageUploader"

import { defaultChannelBannerUrl } from "../lib/util"
import { showDialog } from "../actions/ui"

import type { Dispatch } from "redux"
import type { Channel } from "../flow/discussionTypes"

type Props = {
  channel: Channel,
  editable?: boolean,
  formImageUrl?: ?string,
  showDialog?: () => any,
  name?: string,
  onUpdate?: (event: Object) => Promise<*>
}

class ChannelBanner extends React.Component<Props> {
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

    const imageUrl = formImageUrl || channel.banner || defaultChannelBannerUrl

    return (
      <div className="banner-container row">
        <div className="channel-banner">
          <img
            src={imageUrl}
            alt={`Channel banner for ${channel.name}`}
            className={`banner-image`}
          />
          <div className="gradient" />
          {editable ? (
            <React.Fragment>
              <ImageUploader
                name={name}
                showButton={false}
                onUpdate={onUpdate}
                isAdd={imageUrl === defaultChannelBannerUrl}
                description="Channel Banner"
                width={1150}
                height={125}
              />
              <a onClick={showDialog} className="upload-banner grey-surround">
                Upload cover image
              </a>
            </React.Fragment>
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
)(ChannelBanner)

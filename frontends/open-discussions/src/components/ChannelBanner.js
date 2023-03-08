// @flow
/* global SETTINGS: false */
import React from "react"
import { connect } from "react-redux"
import { bindActionCreators } from "redux"

import ImageUploader, { makeDialogKey } from "./ImageUploader"

import { BannerContainer, BannerImage, Gradient } from "./PageBanner"

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

const ChannelBanner = (props: Props) => {
  const { channel, editable, formImageUrl, showDialog, onUpdate, name } = props

  const imageUrl = formImageUrl || channel.banner

  return (
    <BannerContainer className="channel-banner">
      <BannerImage src={imageUrl} alt={`Channel banner for ${channel.name}`} />
      <Gradient />
      {editable ? (
        <React.Fragment>
          <ImageUploader
            name={name}
            showButton={false}
            onUpdate={onUpdate}
            isAdd={!imageUrl}
            description="Channel Banner"
            width={1150}
            height={200}
          />
          <a onClick={showDialog} className="upload-banner grey-surround">
            Upload cover image
          </a>
        </React.Fragment>
      ) : null}
    </BannerContainer>
  )
}

const mapDispatchToProps = (dispatch: Dispatch<*>, ownProps: Props) =>
  // $FlowFixMe
  bindActionCreators(
    {
      // $FlowFixMe
      showDialog: () => showDialog(makeDialogKey(ownProps.name))
    },
    dispatch
  )

export default connect<Props, Props, _, _, _, _>(
  null,
  mapDispatchToProps
)(ChannelBanner)

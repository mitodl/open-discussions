// @flow
import React from "react"

import Embedly, { EmbedlyLoader } from "./Embedly"

import {
  isLinkTypeAllowed,
  userCanPost,
  LINK_TYPE_LINK,
  LINK_TYPE_TEXT
} from "../lib/channels"
import { goBackAndHandleEvent } from "../lib/util"
import { validationMessage } from "../lib/validation"

import type { Channel, PostForm, PostValidation } from "../flow/discussionTypes"

type Props = {
  onSubmit: Function,
  onUpdate: Function,
  updatePostType: (postType: ?string) => void,
  postForm: ?PostForm,
  validation: PostValidation,
  channel: Channel,
  history: Object,
  processing: boolean,
  channels: Map<string, Channel>,
  updateChannelSelection: Function,
  embedly: Object,
  embedlyInFlight: boolean
}

const channelOptions = (channels: Map<string, Channel>) =>
  Array.from(channels)
    .filter(([, channel]) => userCanPost(channel))
    .map(([key, value], index) => (
      <option label={value.title} value={key} key={index}>
        {value.title}
      </option>
    ))

export default class CreatePostForm extends React.Component<Props> {
  postTypeButtons = () => {
    const { channel, updatePostType, validation } = this.props

    return (
      <div className="row post-type-row">
        <div className="post-types">
          {isLinkTypeAllowed(channel, LINK_TYPE_TEXT) ? (
            <button
              className="write-something"
              onClick={() => updatePostType(LINK_TYPE_TEXT)}
            >
              <i className="material-icons notes">notes</i>
              Write something
            </button>
          ) : null}
          {isLinkTypeAllowed(channel, LINK_TYPE_LINK) ? (
            <button
              className="share-a-link"
              onClick={() => updatePostType(LINK_TYPE_LINK)}
            >
              <i className="material-icons open_in_new">open_in_new</i>
              Share a link
            </button>
          ) : null}
        </div>
        {validationMessage(validation.post_type)}
      </div>
    )
  }

  renderEmbed = () => {
    const { embedly } = this.props

    return (
      <div className="embedly-preview">
        <Embedly embedly={embedly} />
      </div>
    )
  }

  postContentInputs = () => {
    const {
      postForm,
      onUpdate,
      validation,
      updatePostType,
      embedlyInFlight,
      embedly
    } = this.props
    if (!postForm) {
      return null
    }

    const { postType, text, url } = postForm

    return postType === LINK_TYPE_TEXT ? (
      <div className="text row post-content">
        <textarea placeholder="" name="text" value={text} onChange={onUpdate} />
        <div className="close-button" onClick={() => updatePostType(null)}>
          <i className="material-icons clear">clear</i>
        </div>
        {validationMessage(validation.text)}
      </div>
    ) : (
      <div className="url row post-content">
        {url !== "" && embedly && embedly.type !== "error" ? (
          this.renderEmbed()
        ) : (
          <input
            type="url"
            placeholder="Paste a link to something related to the title..."
            name="url"
            value={url}
            onChange={onUpdate}
          />
        )}
        {embedlyInFlight && !embedly ? (
          <EmbedlyLoader primaryColor="#c9bfbf" secondaryColor="#c9c8c8" />
        ) : null}
        <div className="close-button" onClick={() => updatePostType(null)}>
          <i className="material-icons clear">clear</i>
        </div>
        {validationMessage(validation.url)}
      </div>
    )
  }

  render() {
    const {
      channel,
      postForm,
      onUpdate,
      onSubmit,
      history,
      processing,
      channels,
      updateChannelSelection,
      validation
    } = this.props
    if (!postForm) {
      return null
    }

    const { postType, title } = postForm

    return (
      <div className="new-post-form">
        <form onSubmit={onSubmit} className="form">
          <div className="row channel-select">
            <label>Will be published in:</label>
            <select
              onChange={updateChannelSelection}
              name="channel"
              value={channel ? channel.name : ""}
            >
              <option label="Select a channel" value="">
                Select a channel
              </option>
              {channelOptions(channels)}
            </select>
            {validationMessage(validation.channel)}
          </div>
          <div className="titlefield row">
            <textarea
              type="text"
              placeholder="Add the title of your post..."
              name="title"
              value={title}
              onChange={onUpdate}
              rows="1"
              className="no-height"
            />
            {validationMessage(validation.title)}
          </div>
          {postType === null
            ? this.postTypeButtons()
            : this.postContentInputs()}
          <div className="actions row">
            <button
              className="cancel"
              onClick={goBackAndHandleEvent(history)}
              disabled={processing}
            >
              Cancel
            </button>
            <button
              className={`submit-post ${processing ? "disabled" : ""}`}
              type="submit"
              disabled={processing}
            >
              Post
            </button>
          </div>
        </form>
      </div>
    )
  }
}

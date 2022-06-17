/* global SETTINGS: false */
// @flow
import React from "react"

import Embedly, { EmbedlyLoader } from "./Embedly"
import Editor, { editorUpdateFormShim } from "./Editor"
import CloseButton from "./CloseButton"
import ArticleEditor from "./ArticleEditor"
import CoverImageInput from "./CoverImageInput"

import {
  isLinkTypeAllowed,
  userCanPost,
  LINK_TYPE_LINK,
  LINK_TYPE_TEXT,
  LINK_TYPE_ARTICLE
} from "../lib/channels"
import { goBackAndHandleEvent, preventDefaultAndInvoke } from "../lib/util"
import { validationMessage } from "../lib/validation"
import { postFormIsContentless } from "../lib/posts"

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
  embedlyInFlight: boolean,
  openClearPostTypeDialog: Function,
  setPhotoError: Function,
  hideCoverImageInput: Function
}

type State = {
  showCoverImage: boolean
}

const channelOptions = (channels: Map<string, Channel>) =>
  Array.from(channels)
    .filter(([, channel]) => userCanPost(channel))
    .map(([key, value], index) => (
      <option label={value.title} value={key} key={index}>
        {value.title}
      </option>
    ))

export default class CreatePostForm extends React.Component<Props, State> {
  postTypeButtons = () => {
    const { channel, updatePostType, validation } = this.props

    return (
      <div className="row post-type-row">
        <div className="post-types">
          {isLinkTypeAllowed(channel, LINK_TYPE_TEXT) ? (
            <button
              className="write-something dark-outlined compact"
              onClick={() => updatePostType(LINK_TYPE_TEXT)}
            >
              Short post
            </button>
          ) : null}
          {isLinkTypeAllowed(channel, LINK_TYPE_LINK) ? (
            <button
              className="share-a-link dark-outlined compact"
              onClick={() => updatePostType(LINK_TYPE_LINK)}
            >
              Share a link
            </button>
          ) : null}
          {SETTINGS.article_ui_enabled &&
          isLinkTypeAllowed(channel, LINK_TYPE_ARTICLE) ? (
              <button
                className="write-an-article dark-outlined compact"
                onClick={() => updatePostType(LINK_TYPE_ARTICLE)}
              >
              Write an Article
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

  clearInputClickHandler = () => {
    const { postForm, updatePostType, openClearPostTypeDialog } = this.props
    if (postFormIsContentless(postForm)) {
      updatePostType(null)
    } else {
      openClearPostTypeDialog()
    }
  }

  clearInputButton = () => {
    const { channel } = this.props

    return !channel || channel.allowed_post_types.length > 1 ? (
      <CloseButton
        onClick={preventDefaultAndInvoke(this.clearInputClickHandler)}
      />
    ) : null
  }

  postContentInputs = () => {
    const {
      postForm,
      onUpdate,
      validation,
      embedlyInFlight,
      embedly,
      setPhotoError,
      hideCoverImageInput
    } = this.props
    if (!postForm) {
      return null
    }

    const { postType, url } = postForm

    if (postType === LINK_TYPE_TEXT) {
      return (
        <div className="text row post-content">
          <Editor onChange={editorUpdateFormShim("text", onUpdate)} />
          {this.clearInputButton()}
          {validationMessage(validation.text)}
        </div>
      )
    } else if (postType === LINK_TYPE_ARTICLE) {
      return (
        <div className="article row post-content">
          {postForm.show_cover_image ? (
            <CoverImageInput
              image={postForm.cover_image}
              setPhotoError={setPhotoError}
              onUpdate={onUpdate}
              hideCoverImageInput={hideCoverImageInput}
            />
          ) : null}
          {validationMessage(validation.coverImage)}
          <ArticleEditor
            onChange={editorUpdateFormShim("article_content", onUpdate)}
          />
          {this.clearInputButton()}
          {validationMessage(validation.article_content)}
        </div>
      )
    } else {
      return (
        <div className="url row post-content">
          {url !== "" && embedly && embedly.type !== "error" ? (
            this.renderEmbed()
          ) : (
            <input
              type="text"
              placeholder="Paste a link to something related to the title..."
              name="url"
              value={url}
              onChange={onUpdate}
            />
          )}
          {embedlyInFlight && !embedly ? (
            <EmbedlyLoader primaryColor="#c9bfbf" secondaryColor="#c9c8c8" />
          ) : null}
          {this.clearInputButton()}
          {validationMessage(validation.url)}
        </div>
      )
    }
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
            <label>Select a channel:</label>
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
            <input
              type="text"
              className="title h1"
              placeholder="title"
              name="title"
              value={title}
              onChange={onUpdate}
            />
            {validationMessage(validation.title)}
          </div>
          {postType === null
            ? this.postTypeButtons()
            : this.postContentInputs()}
          <div className="actions row">
            <button
              className="cancel"
              type="button"
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

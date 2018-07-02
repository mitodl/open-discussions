// @flow
import React from "react"
import { Link } from "react-router-dom"

import Card from "../components/Card"
import { ChannelBreadcrumbs } from "../components/ChannelBreadcrumbs"
import Embedly from "./Embedly"

import { userCanPost } from "../lib/channels"
import { CONTENT_POLICY_URL } from "../lib/url"
import { goBackAndHandleEvent } from "../lib/util"
import { validationMessage } from "../lib/validation"

import type { Channel, PostForm, PostValidation } from "../flow/discussionTypes"

type CreatePostFormProps = {
  onSubmit: Function,
  onUpdate: Function,
  updateIsText: (isText: boolean) => void,
  postForm: ?PostForm,
  validation: PostValidation,
  channel: Channel,
  history: Object,
  processing: boolean,
  channels: Map<string, Channel>,
  updateChannelSelection: Function,
  embedly: Object
}

const channelOptions = (channels: Map<string, Channel>) =>
  Array.from(channels)
    .filter(([, channel]) => userCanPost(channel))
    .map(([key, value], index) => (
      <option label={value.title} value={key} key={index}>
        {value.title}
      </option>
    ))

export default class CreatePostForm extends React.Component<*, void> {
  props: CreatePostFormProps

  render() {
    const {
      channel,
      postForm,
      onUpdate,
      onSubmit,
      updateIsText,
      history,
      processing,
      channels,
      updateChannelSelection,
      validation,
      embedly
    } = this.props
    if (!postForm) {
      return null
    }

    const { isText, text, url, title } = postForm

    return (
      <div>
        {channel ? <ChannelBreadcrumbs channel={channel} /> : null}
        <Card className="new-post-card">
          <form onSubmit={onSubmit} className="form">
            <div className="post-types row">
              <div
                className={`new-text-post ${isText ? "active" : ""}`}
                onClick={() => updateIsText(true)}
              >
                New text post
              </div>
              <div
                className={`new-link-post ${isText ? "" : "active"}`}
                onClick={() => updateIsText(false)}
              >
                New link post
              </div>
            </div>
            <div className="titlefield row">
              <label>Title</label>
              <textarea
                type="text"
                placeholder=""
                name="title"
                value={title}
                onChange={onUpdate}
                rows="1"
                className="no-height"
              />
              {validationMessage(validation.title)}
            </div>
            {isText ? (
              <div className="text row">
                <label>Type Your Post Here</label>
                <textarea
                  placeholder=""
                  name="text"
                  value={text}
                  onChange={onUpdate}
                />
                {validationMessage(validation.text)}
              </div>
            ) : (
              <div className="url row">
                <label>Link URL</label>
                <input
                  type="url"
                  placeholder="https://www.example.com"
                  name="url"
                  value={url}
                  onChange={onUpdate}
                />
                {validationMessage(validation.url)}
              </div>
            )}
            {!isText && embedly && embedly.type !== "error" ? (
              <div className="embedly-preview row">
                <div className="preview-header">
                  this is a preview of your post
                </div>
                <Embedly embedly={embedly} />
              </div>
            ) : null}
            <div className="row channel-select">
              <label>Channel</label>
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
            <div className="posting-policy row">
              <span>
                Please be mindful of{" "}
                <Link to={CONTENT_POLICY_URL}>
                  MicroMasters Discussions Community Guidelines
                </Link>{" "}
                and practice good online etiquette.
              </span>
            </div>
            <div className="actions row">
              <button
                className={`submit-post ${processing ? "disabled" : ""}`}
                type="submit"
                disabled={processing}
              >
                Submit Post
              </button>
              <button
                className="cancel"
                onClick={goBackAndHandleEvent(history)}
                disabled={processing}
              >
                Cancel
              </button>
            </div>
          </form>
        </Card>
      </div>
    )
  }
}

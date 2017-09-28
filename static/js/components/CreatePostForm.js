// @flow
import React from "react"
import R from "ramda"

import Card from "../components/Card"
import ChannelBreadcrumbs from "../components/ChannelBreadcrumbs"

import { isEmptyText } from "../lib/util"

import type { Channel, PostForm } from "../flow/discussionTypes"

type CreatePostFormProps = {
  onSubmit: Function,
  onUpdate: Function,
  updateIsText: (isText: boolean) => void,
  postForm: ?PostForm,
  channel: Channel,
  history: Object,
  processing: boolean,
  channels: Map<string, Channel>,
  updateChannelSelection: Function
}

const goBackAndHandleEvent = R.curry((history, e) => {
  e.preventDefault()
  history.goBack()
})

const channelOptions = (channels: Map<string, Channel>) =>
  Array.from(channels).map(([key, value], index) =>
    <option label={value.title} value={key} key={index}>
      {value.title}
    </option>
  )

export default class CreatePostForm extends React.Component {
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
      updateChannelSelection
    } = this.props
    if (!postForm) {
      return null
    }

    const { isText, text, url, title } = postForm

    const shouldDisableSubmit = isText
      ? isEmptyText(text) || isEmptyText(title)
      : isEmptyText(url) || isEmptyText(title)

    return (
      <div>
        {channel ? <ChannelBreadcrumbs channel={channel} /> : null}
        <Card className="new-post-card">
          <form onSubmit={onSubmit}>
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
              <input
                type="text"
                placeholder=""
                name="title"
                value={title}
                onChange={onUpdate}
              />
            </div>
            {isText
              ? <div className="text row">
                <label>Type Your Post Here</label>
                <textarea
                  placeholder=""
                  name="text"
                  value={text}
                  onChange={onUpdate}
                />
              </div>
              : <div className="url row">
                <label>Link URL</label>
                <input
                  type="url"
                  placeholder="www.example.com"
                  name="url"
                  value={url}
                  onChange={onUpdate}
                />
              </div>}
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
            </div>
            <div className="posting-policy row">
              <span>
                Please be mindful of{" "}
                <a href="#">MIT Discussion content policy</a> and practice good
                online etiquette.
              </span>
            </div>
            <div className="actions row">
              <button
                className={`submit-post ${processing ? "disabled" : ""}`}
                type="submit"
                disabled={processing || shouldDisableSubmit}
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

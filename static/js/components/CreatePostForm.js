// @flow
import React from "react"
import R from "ramda"

import Card from "../components/Card"
import ChannelBreadcrumbs from "../components/ChannelBreadcrumbs"
import type { Channel, PostForm } from "../flow/discussionTypes"

type CreatePostFormProps = {
  onSubmit: Function,
  onUpdate: Function,
  updateIsText: (isText: boolean) => void,
  postForm: ?PostForm,
  channel: Channel,
  history: Object,
  processing: boolean
}

const goBackAndHandleEvent = R.curry((history, e) => {
  e.preventDefault()
  history.goBack()
})

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
      processing
    } = this.props
    if (!postForm) {
      return null
    }

    const { isText, text, url, title } = postForm

    return (
      <div>
        <ChannelBreadcrumbs channel={channel} />
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

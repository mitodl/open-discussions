// @flow
import React from "react"

import Card from "../components/Card"
import ChannelBreadcrumbs from "../components/ChannelBreadcrumbs"
import type { Channel, PostForm } from "../flow/discussionTypes"

type CreatePostFormProps = {
  onSubmit: Function,
  onUpdate: Function,
  updateIsText: (isText: boolean) => void,
  postForm: ?PostForm,
  channel: Channel,
  history: Object
}

export default class CreatePostForm extends React.Component {
  props: CreatePostFormProps

  render() {
    const { channel, postForm, onUpdate, onSubmit, updateIsText, history } = this.props
    if (!postForm) {
      return null
    }

    const { isText, text, url, title } = postForm

    return (
      <div className="single-column">
        <ChannelBreadcrumbs channel={channel} />
        <Card className="new-post-card">
          <form onSubmit={onSubmit}>
            <div className="post-types row">
              <div className={`new-text-post ${isText ? "active" : ""}`} onClick={() => updateIsText(true)}>
                New text post
              </div>
              <div className={`new-link-post ${isText ? "" : "active"}`} onClick={() => updateIsText(false)}>
                New link post
              </div>
            </div>
            <div className="title row">
              <input type="text" placeholder="Title" name="title" value={title} onChange={onUpdate} />
            </div>
            {isText
              ? <div className="text row">
                <textarea placeholder="Type your post here..." name="text" value={text} onChange={onUpdate} />
              </div>
              : <div className="url row">
                <input type="url" placeholder="URL" name="url" value={url} onChange={onUpdate} />
              </div>}
            <div className="channel row">
              Posting to {channel.title}
            </div>
            <div className="row">
              <span>
                Please be mindful of <a href="#">MIT Discussion content policy</a> and practice good online etiquette.
              </span>
            </div>
            <div className="actions row">
              <button className="submit-post" type="submit">
                Submit Post
              </button>
              <button className="cancel" onClick={() => history.goBack()}>
                Cancel
              </button>
            </div>
          </form>
        </Card>
      </div>
    )
  }
}

// @flow
import React from "react"

import {
  CHANNEL_TYPE_PUBLIC,
  CHANNEL_TYPE_PRIVATE,
} from "../../lib/channels"

import type { ChannelEditable } from "../../flow/discussionTypes"

export default class ChannelEditForm extends React.Component {
  props: {
    onSubmit: Function,
    onUpdate: Function,
    channel:  ?ChannelEditable,
  }

  render() {
    const { onSubmit, onUpdate , channel } = this.props
    if (channel === null || channel === undefined) {
      return null
    }
    return (
      <form onSubmit={onSubmit} className="form">
        <div className="form-item">
          <label htmlFor="title" className="label">Title</label>
          <input
            name="title"
            type="text"
            className="input"
            value={channel.title}
            onChange={onUpdate}
          />
        </div>
        <div className="form-item">
          <label htmlFor="name" className="label">Name</label>
          <input
            name="name"
            type="text"
            className="input"
            value={channel.name}
            onChange={onUpdate}
          />
        </div>
        <div className="form-item">
          <label htmlFor="public_description" className="label">Description</label>
          <textarea
            name="public_description"
            type="text"
            className="input"
            value={channel.public_description}
            onChange={onUpdate}
          />
        </div>
        <div className="form-item">
          <div className="label">Channel Type</div>
          <div className="input">
            <input
              id="channel_public"
              type="radio"
              name="channel_type"
              value={CHANNEL_TYPE_PUBLIC}
              checked={channel.channel_type === CHANNEL_TYPE_PUBLIC}
              onChange={onUpdate}
            />
            <label htmlFor="channel_public">Public</label>
            <input
              id="channel_private"
              type="radio"
              name="channel_type"
              value={CHANNEL_TYPE_PRIVATE}
              checked={channel.channel_type === CHANNEL_TYPE_PRIVATE}
              onChange={onUpdate}
            />
            <label htmlFor="channel_private">Private</label>
          </div>
        </div>

        <button type="submit">Save</button>
      </form>
    )
  }
}

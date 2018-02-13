// @flow
import React from "react"

import { CHANNEL_TYPE_PUBLIC, CHANNEL_TYPE_PRIVATE } from "../../lib/channels"

import type { ChannelForm } from "../../flow/discussionTypes"

export default class ChannelCreateForm extends React.Component<*, void> {
  props: {
    onSubmit: Function,
    onUpdate: Function,
    form: ChannelForm
  }

  render() {
    const { onSubmit, onUpdate, form } = this.props

    return (
      <form onSubmit={onSubmit} className="form">
        <div className="form-item">
          <label htmlFor="title" className="label">
            Title
          </label>
          <input
            name="title"
            type="text"
            className="input"
            value={form.title}
            onChange={onUpdate}
          />
        </div>
        <div className="form-item">
          <label htmlFor="name" className="label">
            Name
          </label>
          <input
            name="name"
            type="text"
            className="input"
            value={form.name}
            onChange={onUpdate}
          />
        </div>
        <div className="form-item">
          <label htmlFor="description" className="label">
            Description
          </label>
          <textarea
            name="description"
            type="text"
            className="input"
            value={form.description}
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
              checked={form.channel_type === CHANNEL_TYPE_PUBLIC}
              onChange={onUpdate}
            />
            <label htmlFor="channel_public">Public</label>
            <input
              id="channel_private"
              type="radio"
              name="channel_type"
              value={CHANNEL_TYPE_PRIVATE}
              checked={form.channel_type === CHANNEL_TYPE_PRIVATE}
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

// @flow
import React from "react"

import { channelURL } from "../../lib/url"
import {
  CHANNEL_TYPE_PUBLIC,
  CHANNEL_TYPE_RESTRICTED,
  CHANNEL_TYPE_PRIVATE
} from "../../lib/channels"

import Card from "../Card"
import type {
  ChannelForm,
  ChannelAppearanceEditValidation
} from "../../flow/discussionTypes"

export default class EditChannelBasicForm extends React.Component<*, void> {
  props: {
    onSubmit: Function,
    onUpdate: Function,
    form: ChannelForm,
    history: Object,
    validation: ChannelAppearanceEditValidation,
    processing: boolean
  }

  render() {
    const { onSubmit, onUpdate, form, processing, history } = this.props
    return (
      <form onSubmit={onSubmit} className="form channel-form">
        <Card title="Type">
          <label>
            <input
              type="radio"
              name="channel_type"
              value={CHANNEL_TYPE_PUBLIC}
              checked={form.channel_type === CHANNEL_TYPE_PUBLIC}
              onChange={onUpdate}
            />{" "}
            Public (everybody can see & create posts)
          </label>
          <label>
            <input
              type="radio"
              name="channel_type"
              value={CHANNEL_TYPE_RESTRICTED}
              checked={form.channel_type === CHANNEL_TYPE_RESTRICTED}
              onChange={onUpdate}
            />{" "}
            Restricted (everybody can see & only you can create posts)
          </label>
          <label>
            <input
              type="radio"
              name="channel_type"
              value={CHANNEL_TYPE_PRIVATE}
              checked={form.channel_type === CHANNEL_TYPE_PRIVATE}
              onChange={onUpdate}
            />{" "}
            Private (only invited members can see & create posts)
          </label>
        </Card>

        <div className="row actions">
          <button
            className="cancel"
            onClick={() => history.push(channelURL(form.name))}
            disabled={processing}
          >
            Cancel
          </button>
          <button type="submit" className="save-changes" disabled={processing}>
            Save
          </button>
        </div>
      </form>
    )
  }
}

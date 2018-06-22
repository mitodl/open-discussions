// @flow
import React from "react"

import Card from "../Card"

import { channelURL } from "../../lib/url"
import {
  CHANNEL_TYPE_PUBLIC,
  CHANNEL_TYPE_RESTRICTED,
  CHANNEL_TYPE_PRIVATE
} from "../../lib/channels"

import type {
  ChannelForm,
  ChannelAppearanceEditValidation
} from "../../flow/discussionTypes"

const makeChannelTypeOption = (
  value: string,
  text: string,
  form: ChannelForm,
  onUpdate: Function
) => (
  <label>
    <input
      type="radio"
      name="channel_type"
      value={value}
      checked={form.channel_type === value}
      onChange={onUpdate}
    />{" "}
    {text}
  </label>
)

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
          {makeChannelTypeOption(
            CHANNEL_TYPE_PUBLIC,
            "Public (everybody can see & create posts)",
            form,
            onUpdate
          )}
          {makeChannelTypeOption(
            CHANNEL_TYPE_RESTRICTED,
            "Restricted (everybody can see & only you can create posts)",
            form,
            onUpdate
          )}
          {makeChannelTypeOption(
            CHANNEL_TYPE_PRIVATE,
            "Private (only invited members can see & create posts)",
            form,
            onUpdate
          )}
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

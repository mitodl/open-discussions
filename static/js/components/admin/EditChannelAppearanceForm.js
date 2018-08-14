// @flow
import React from "react"

import Card from "../Card"
import ChannelAvatar from "../../containers/ChannelAvatar"
import ChannelBanner from "../../containers/ChannelBanner"

import { channelURL } from "../../lib/url"
import { validationMessage } from "../../lib/validation"

import type {
  ChannelForm,
  ChannelAppearanceEditValidation,
  Channel
} from "../../flow/discussionTypes"

type Props = {
  channel: Channel,
  onSubmit: Function,
  onUpdate: Function,
  form: ChannelForm,
  history: Object,
  validation: ChannelAppearanceEditValidation,
  processing: boolean
}

export default class EditChannelAppearanceForm extends React.Component<Props> {
  render() {
    const {
      channel,
      onSubmit,
      onUpdate,
      form,
      processing,
      validation,
      history
    } = this.props
    return (
      <form onSubmit={onSubmit} className="form channel-form">
        <Card>
          <ChannelAvatar
            channel={channel}
            channelName={form.name}
            editable={true}
            name="avatar"
            onUpdate={onUpdate}
            formImageUrl={
              form.avatar &&
              form.avatar.edit &&
              URL.createObjectURL(form.avatar.edit)
            }
            imageSize="medium"
          />

          <div className="row description">
            <label htmlFor="description" className="label">
              Description
            </label>
            <textarea
              name="description"
              className="input"
              value={form.description}
              onChange={onUpdate}
            />
            {validationMessage(validation.description)}
          </div>

          <ChannelBanner
            channel={channel}
            channelName={form.name}
            editable={true}
            name="banner"
            onUpdate={onUpdate}
            formImageUrl={
              form.banner &&
              form.banner.edit &&
              URL.createObjectURL(form.banner.edit)
            }
          />

          <div className="row actions">
            <button
              className="cancel"
              onClick={() => history.push(channelURL(form.name))}
              disabled={processing}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="save-changes"
              disabled={processing}
            >
              Save
            </button>
          </div>
        </Card>
      </form>
    )
  }
}

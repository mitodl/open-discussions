// @flow
/* global SETTINGS */
import React from "react"

import { Card } from "ol-util"
import ChannelAvatar from "../ChannelAvatar"
import ChannelBanner from "../ChannelBanner"

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

    let titleInputProps, titleInputMessage
    if (SETTINGS.is_admin) {
      titleInputProps = {}
      titleInputMessage = null
    } else {
      titleInputProps = { disabled: true }
      titleInputMessage = (
        <label className="bottom-label">
          Need to change the channel title?{" "}
          <a
            href={`mailto:${SETTINGS.support_email}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Contact us
          </a>
        </label>
      )
    }

    return (
      <form onSubmit={onSubmit} className="form channel-form">
        <Card>
          <div className="row avatar-and-title">
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
            <div className="title-container">
              <input
                type="text"
                name="title"
                placeholder="Title"
                value={form.title}
                onChange={onUpdate}
                {...titleInputProps}
              />
              {titleInputMessage}
              {validationMessage(validation.title)}
            </div>
          </div>
          <div className="row">
            <input
              type="text"
              name="public_description"
              className="input"
              placeholder="Headline"
              value={form.public_description}
              onChange={onUpdate}
            />
            <label htmlFor="public_description" className="max-characters">
              Max 80 Characters
            </label>
            {validationMessage(validation.public_description)}
          </div>
          <div className="channel-banner-wrapper">
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
          </div>
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

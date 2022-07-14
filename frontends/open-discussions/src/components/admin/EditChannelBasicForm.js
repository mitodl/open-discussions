// @flow
/* global SETTINGS: false */
import React from "react"
import { Checkbox } from "@rmwc/checkbox"
import R from "ramda"

import { Card } from "ol-util"

import { channelURL } from "../../lib/url"
import {
  CHANNEL_TYPE_PUBLIC,
  CHANNEL_TYPE_RESTRICTED,
  CHANNEL_TYPE_PRIVATE,
  LINK_TYPE_LINK,
  LINK_TYPE_TEXT,
  LINK_TYPE_ARTICLE
} from "../../lib/channels"
import { validationMessage } from "../../lib/validation"

import type {
  ChannelForm,
  ChannelBasicEditValidation
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

type Props = {
  onSubmit: Function,
  onUpdate: Function,
  form: ChannelForm,
  history: Object,
  validation: ChannelBasicEditValidation,
  processing: boolean
}

export default function EditChannelBasicForm(props: Props) {
  const { onSubmit, onUpdate, form, processing, validation, history } = props
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
      <Card title="Allowed post types">
        <div className="post-types">
          <Checkbox
            name="allowed_post_types"
            value={LINK_TYPE_TEXT}
            checked={R.contains(LINK_TYPE_TEXT, form.allowed_post_types)}
            onChange={onUpdate}
          >
            Short text posts
          </Checkbox>
          <Checkbox
            name="allowed_post_types"
            value={LINK_TYPE_LINK}
            checked={R.contains(LINK_TYPE_LINK, form.allowed_post_types)}
            onChange={onUpdate}
          >
            Links to external sites
          </Checkbox>
          {SETTINGS.article_ui_enabled ? (
            <Checkbox
              name="allowed_post_types"
              value={LINK_TYPE_ARTICLE}
              checked={R.contains(LINK_TYPE_ARTICLE, form.allowed_post_types)}
              onChange={onUpdate}
            >
              Article posts
            </Checkbox>
          ) : null}
        </div>
        <div className="row">
          {validationMessage(validation.allowed_post_types)}
        </div>
      </Card>
      <Card title="Notifications">
        <div className="moderator_notifications">
          <Checkbox
            name="moderator_notifications"
            checked={!!form.moderator_notifications}
            onChange={onUpdate}
          >
            Notify channel moderators when new articles are posted in this
            channel
          </Checkbox>
        </div>
      </Card>
      <Card title="Analytics">
        <div className="analytics">
          <input
            type="text"
            name="ga_tracking_id"
            className="input"
            placeholder="Enter a UTM- or G- code for google analytics"
            value={form.ga_tracking_id || ""}
            onChange={onUpdate}
          />
          {validationMessage(validation.ga_tracking_id)}
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

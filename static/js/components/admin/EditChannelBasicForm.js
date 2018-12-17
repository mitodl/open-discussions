// @flow
/* global SETTINGS: false */
import React from "react"
import Checkbox from "rmwc/Checkbox"
import R from "ramda"

import Card from "../Card"

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

export default class EditChannelBasicForm extends React.Component<Props> {
  render() {
    const {
      onSubmit,
      onUpdate,
      form,
      processing,
      validation,
      history
    } = this.props
    return (
      <form onSubmit={onSubmit} className="form channel-form">
        <Card title="Description">
          <div className="row">
            <textarea
              name="description"
              placeholder="Description"
              value={form.description}
              onChange={onUpdate}
            />
          </div>
        </Card>
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

// @flow
import React from "react"

import Card from "../Card"

import { channelURL } from "../../lib/url"
import { validationMessage } from "../../lib/validation"

import type {
  ChannelForm,
  ChannelAppearanceEditValidation
} from "../../flow/discussionTypes"

export default class EditChannelAppearanceForm extends React.Component<
  *,
  void
> {
  props: {
    onSubmit: Function,
    onUpdate: Function,
    form: ChannelForm,
    history: Object,
    validation: ChannelAppearanceEditValidation,
    processing: boolean
  }

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
        <Card>
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

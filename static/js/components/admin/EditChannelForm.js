// @flow
import React from "react"

import { goBackAndHandleEvent } from "../../lib/util"
import { validationMessage } from "../../lib/validation"

import type {
  ChannelForm,
  ChannelEditValidation
} from "../../flow/discussionTypes"

export default class EditChannelForm extends React.Component<*, void> {
  props: {
    onSubmit: Function,
    onUpdate: Function,
    form: ChannelForm,
    history: Object,
    validation: ChannelEditValidation,
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
        <div className="row description">
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
          {validationMessage(validation.description)}
        </div>

        <div className="row">
          <button type="submit" className="save-changes" disabled={processing}>
            Save
          </button>
          <button
            className="cancel"
            onClick={goBackAndHandleEvent(history)}
            disabled={processing}
          >
            Cancel
          </button>
        </div>
      </form>
    )
  }
}

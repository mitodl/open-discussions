// @flow
import React from "react"

import { validationMessage } from "../../lib/validation"

import type { FormProps } from "../../flow/formTypes"
import type { AddMemberForm } from "../../flow/discussionTypes"

type Props = {
  memberTypeDescription: string
} & FormProps<AddMemberForm>

export default class EditChannelMembersForm extends React.Component<Props> {
  render() {
    const {
      processing,
      validation,
      form,
      onUpdate,
      onSubmit,
      memberTypeDescription
    } = this.props

    return (
      <div className="members">
        <React.Fragment>
          <form className="add-member-form" onSubmit={onSubmit}>
            <input
              type="textbox"
              onChange={onUpdate}
              name="email"
              placeholder={`The email of the ${memberTypeDescription} you want to add`}
              value={form.email}
            />{" "}
            <button type="submit" disabled={processing}>
              Submit
            </button>
          </form>
          {validationMessage(validation.email)}
        </React.Fragment>
      </div>
    )
  }
}

// @flow
import React from "react"

import { validationMessage } from "../../lib/validation"

import type { FormProps } from "../../flow/formTypes"
import type { AddMemberForm } from "../../flow/discussionTypes"

type Props = {
  memberTypeDescription: string
} & FormProps<AddMemberForm>

const EditChannelMembersForm = ({
  processing,
  validation,
  form,
  onUpdate,
  onSubmit,
  memberTypeDescription
}: Props) => (
  <div className="members">
    <form className="add-member-form" onSubmit={onSubmit}>
      <input
        type="text"
        onChange={onUpdate}
        name="email"
        placeholder={`The email of the ${memberTypeDescription} you want to add`}
        value={form.email}
      />{" "}
      <button type="submit" className="outlined" disabled={processing}>
        Submit
      </button>
    </form>
    {validationMessage(validation.email)}
  </div>
)

export default EditChannelMembersForm

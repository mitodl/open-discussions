// @flow
import React from "react"
import { Link } from "react-router-dom"

import { MISSING_TEXT } from "../../lib/channels"
import { validationMessage } from "../../lib/validation"
import { profileURL } from "../../lib/url"

import type {
  AddMemberForm,
  AddMemberValidation,
  Channel,
  Member
} from "../../flow/discussionTypes"

type Props = {
  members: Array<Member>,
  usernameGetter: (member: Member) => string,
  addMember: Function,
  removeMember: Function,
  updateEmail: Function,
  channel: Channel,
  validation: AddMemberValidation,
  form: AddMemberForm,
  processing: boolean,
  beginFormEdit: Function,
  memberTypeDescription: string
}

export default class EditChannelMembersForm extends React.Component<Props> {
  onUpdateEmail = (e: Object) => {
    const { updateEmail } = this.props
    e.preventDefault()
    updateEmail(e.target.value)
  }

  render() {
    const {
      addMember,
      removeMember,
      processing,
      validation,
      channel,
      members,
      usernameGetter,
      form,
      memberTypeDescription
    } = this.props

    const editable = !channel.membership_is_managed

    return (
      <div className="members">
        {!editable ? (
          <div className="membership-notice">
            Membership is managed via MicroMasters
          </div>
        ) : (
          <React.Fragment>
            <div className="add-member-form">
              <input
                type="textbox"
                onChange={this.onUpdateEmail}
                name="email"
                placeholder={`The email of the ${memberTypeDescription} you want to add`}
                value={form.email}
              />{" "}
              <button onClick={addMember} type="submit" disabled={processing}>
                Submit
              </button>
            </div>
            {validationMessage(validation.email)}
          </React.Fragment>
        )}
        <table>
          <tbody>
            {members.map((member, index) => (
              <tr
                key={index}
                className={`row ${editable ? "three-cols" : "two-cols"}`}
              >
                <td>
                  {member.full_name ? (
                    <Link
                      className="name"
                      to={profileURL(usernameGetter(member))}
                    >
                      {member.full_name}
                    </Link>
                  ) : (
                    <span className="name">{MISSING_TEXT}</span>
                  )}
                </td>
                <td>
                  <span className="email">{member.email || MISSING_TEXT}</span>
                </td>
                {editable ? (
                  <td>
                    <a
                      className="remove"
                      onClick={() => removeMember(usernameGetter(member))}
                    >
                      Remove
                    </a>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }
}

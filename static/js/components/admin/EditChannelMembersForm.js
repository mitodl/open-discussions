// @flow
import React from "react"
import { Link } from "react-router-dom"

import { MISSING_TEXT } from "../../lib/channels"
import { profileURL } from "../../lib/url"

import type { Member } from "../../flow/discussionTypes"

type Props = {
  members: Array<Member>,
  usernameGetter: (member: Member) => string
}

export default class EditChannelMembersForm extends React.Component<Props> {
  render() {
    const { members, usernameGetter } = this.props
    return (
      <div className="members">
        {members.map((member, index) => (
          <div key={index} className="row">
            {member.full_name ? (
              <Link className="name" to={profileURL(usernameGetter(member))}>
                {member.full_name}
              </Link>
            ) : (
              <span className="name">{MISSING_TEXT}</span>
            )}
            <span className="email">{member.email || MISSING_TEXT}</span>
          </div>
        ))}
      </div>
    )
  }
}

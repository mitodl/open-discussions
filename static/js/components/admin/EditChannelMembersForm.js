// @flow
import React from "react"
import { Link } from "react-router-dom"

import Card from "../Card"
import MembersNavbar from "./MembersNavbar"

import { MISSING_TEXT } from "../../lib/channels"
import { profileURL } from "../../lib/url"

import type { Member } from "../../flow/discussionTypes"

type Props = {
  channelName: string,
  members: Array<Member>,
  usernameField: string
}

export default class EditChannelMembersForm extends React.Component<Props> {
  render() {
    const { channelName, members, usernameField } = this.props
    return (
      <Card>
        <MembersNavbar channelName={channelName} />
        <div className="members">
          {members.map((member, index) => (
            <div key={index} className="row">
              {member.full_name ? (
                <Link className="name" to={profileURL(member[usernameField])}>
                  {member.full_name}
                </Link>
              ) : (
                <span className="name">{MISSING_TEXT}</span>
              )}
              <span className="email">{member.email || MISSING_TEXT}</span>
            </div>
          ))}
        </div>
      </Card>
    )
  }
}

// @flow
import React from "react"
import { Link } from "react-router-dom"

import { profileURL } from "../../lib/url"
import { MISSING_TEXT } from "../../lib/channels"

import type { Channel, Member } from "../../flow/discussionTypes"

type Props = {
  channel: Channel,
  editable: boolean,
  members: Array<Member>,
  usernameGetter: (member: Member) => string,
  removeMember: (channel: Channel, username: string) => Promise<*>
}

export default class MembersList extends React.Component<Props> {
  render() {
    const {
      channel,
      members,
      editable,
      usernameGetter,
      removeMember
    } = this.props

    return (
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
                    onClick={() =>
                      removeMember(channel, usernameGetter(member))
                    }
                  >
                    Remove
                  </a>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    )
  }
}

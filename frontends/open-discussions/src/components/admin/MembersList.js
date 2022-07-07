// @flow
/* global SETTINGS: false */
import React from "react"
import { Link } from "react-router-dom"

import Dialog from "../Dialog"

import { profileURL } from "../../lib/url"
import { MISSING_TEXT } from "../../lib/channels"

import type { Channel, Member } from "../../flow/discussionTypes"
import { Loading } from "../Loading"

type Props = {
  channel: Channel,
  dialogOpen: boolean,
  setDialogVisibility: (b: boolean) => void,
  memberToRemove: ?Member,
  setDialogData: (data: any) => void,
  editable: boolean,
  members: Array<Member>,
  usernameGetter: (member: Member) => string,
  removeMember: (channel: Channel, member: Member) => Promise<*>,
  memberTypeDescription: string
}

export default class MembersList extends React.Component<Props> {
  removeMember = () => {
    const { removeMember, channel, memberToRemove } = this.props
    if (!memberToRemove) {
      throw new Error("Expected memberToRemove to be set")
    }

    return removeMember(channel, memberToRemove)
  }

  showRemoveDialog = (member: Member): void => {
    const { setDialogData, setDialogVisibility } = this.props

    setDialogVisibility(true)
    setDialogData(member)
  }

  render() {
    const {
      members,
      editable,
      usernameGetter,
      setDialogVisibility,
      dialogOpen,
      memberToRemove,
      memberTypeDescription
    } = this.props

    if (!members) {
      return <Loading />
    }

    return (
      <div className="members-list">
        <table>
          <tbody>
            {members.map((member, index) => (
              <tr
                key={index}
                className={`row ${editable ? "three-cols" : "two-cols"}`}
              >
                {usernameGetter(member) === SETTINGS.username ? (
                  <React.Fragment>
                    <td colSpan="2">
                      You are a {memberTypeDescription} of this channel
                    </td>
                    {editable ? (
                      <td>
                        <a
                          className="remove grey-surround"
                          onClick={() => this.showRemoveDialog(member)}
                        >
                          Leave
                        </a>
                      </td>
                    ) : null}
                  </React.Fragment>
                ) : (
                  <React.Fragment>
                    <td>
                      {member.full_name ? (
                        <Link
                          className="navy name"
                          to={profileURL(usernameGetter(member))}
                        >
                          {member.full_name}
                        </Link>
                      ) : (
                        <span className="name">{MISSING_TEXT}</span>
                      )}
                    </td>
                    <td>
                      <span className="email">
                        {member.email || MISSING_TEXT}
                      </span>
                    </td>
                    {editable ? (
                      <td>
                        {member.can_remove === false ? (
                          <span className="cant_remove">Can't remove</span>
                        ) : (
                          <a
                            className="remove grey-surround"
                            onClick={() => this.showRemoveDialog(member)}
                          >
                            Remove
                          </a>
                        )}
                      </td>
                    ) : null}
                  </React.Fragment>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        <Dialog
          id="remove-member"
          open={dialogOpen}
          onAccept={this.removeMember}
          hideDialog={() => setDialogVisibility(false)}
          submitText="Remove"
          title={`Remove ${
            (memberToRemove &&
              (usernameGetter(memberToRemove) === SETTINGS.username
                ? "yourself"
                : memberToRemove.full_name)) ||
            "member"
          }?`}
        />
      </div>
    )
  }
}

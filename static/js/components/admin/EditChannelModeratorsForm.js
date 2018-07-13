// @flow
import React from "react"
import { Link } from "react-router-dom"

import Card from "../Card"
import MembersNavbar from "./MembersNavbar"

import { profileURL } from "../../lib/url"

import type { ChannelModerators } from "../../flow/discussionTypes"

export default class EditChannelModeratorsForm extends React.Component<
  *,
  void
> {
  props: {
    channelName: string,
    moderators: ChannelModerators
  }

  render() {
    const { channelName, moderators } = this.props
    return (
      <Card>
        <MembersNavbar channelName={channelName} />
        <div className="moderators">
          {moderators.map((moderator, index) => (
            <div key={index} className="row">
              {moderator.full_name ? (
                <Link
                  className="name"
                  to={profileURL(moderator.moderator_name)}
                >
                  {moderator.full_name}
                </Link>
              ) : (
                <span className="name">{"<missing>"}</span>
              )}
              <span className="email">{moderator.email || "<missing>"}</span>
            </div>
          ))}
        </div>
      </Card>
    )
  }
}

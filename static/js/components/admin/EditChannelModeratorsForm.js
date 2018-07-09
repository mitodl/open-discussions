// @flow
import React from "react"
import { Link } from "react-router-dom"

import Card from "../Card"
import MembersNavbar from "./MembersNavbar"

import { profileURL } from "../../lib/url"

import type { ChannelModeratorsForm } from "../../flow/discussionTypes"

export default class EditChannelModeratorsForm extends React.Component<
  *,
  void
> {
  props: {
    form: ChannelModeratorsForm
  }

  render() {
    const { form } = this.props
    return (
      <form className="form moderators-form">
        <Card>
          <MembersNavbar channelName={form.channel.name} />
          <div className="moderators">
            {form.moderators.map((moderator, index) => (
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
      </form>
    )
  }
}

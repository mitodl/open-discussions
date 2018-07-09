// @flow
import React from "react"
import { Link } from "react-router-dom"

import Card from "../Card"
import MembersNavbar from "./MembersNavbar"

import { profileURL } from "../../lib/url"

import type { ChannelContributorsForm } from "../../flow/discussionTypes"

export default class EditChannelContributorsForm extends React.Component<
  *,
  void
> {
  props: {
    form: ChannelContributorsForm
  }

  render() {
    const { form } = this.props
    return (
      <form className="form contributors-form">
        <Card>
          <MembersNavbar channelName={form.channel.name} />
          <div className="contributors">
            {form.contributors.map((contributor, index) => (
              <div key={index} className="row">
                {contributor.full_name ? (
                  <Link
                    className="name"
                    to={profileURL(contributor.contributor_name)}
                  >
                    {contributor.full_name}
                  </Link>
                ) : (
                  <span className="name">{"<missing>"}</span>
                )}
                <span className="email">
                  {contributor.email || "<missing>"}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </form>
    )
  }
}

// @flow
import React from "react"
import { Link } from "react-router-dom"

import Card from "../Card"
import MembersNavbar from "./MembersNavbar"

import { profileURL } from "../../lib/url"

import type { ChannelContributors } from "../../flow/discussionTypes"

export default class EditChannelContributorsForm extends React.Component<
  *,
  void
> {
  props: {
    channelName: string,
    contributors: ChannelContributors
  }

  render() {
    const { channelName, contributors } = this.props
    return (
      <Card>
        <MembersNavbar channelName={channelName} />
        <div className="contributors">
          {contributors.map((contributor, index) => (
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
              <span className="email">{contributor.email || "<missing>"}</span>
            </div>
          ))}
        </div>
      </Card>
    )
  }
}

// @flow
import React from "react"
import { Route } from "react-router-dom"
import R from "ramda"

import CreateChannelPage from "./CreateChannelPage"
import EditChannelAppearancePage from "./EditChannelAppearancePage"
import EditChannelBasicPage from "./EditChannelBasicPage"

import withMemberForm from "../../hoc/withMemberForm"

import type { Match } from "react-router"

type Props = {
  match: Match
}

export default class AdminPage extends React.Component<Props> {
  render() {
    const { match } = this.props
    return (
      <React.Fragment>
        <Route path={`${match.url}/c/new`} component={CreateChannelPage} />
        <Route
          path={`${match.url}/c/edit/:channelName/basic`}
          component={EditChannelBasicPage}
        />
        <Route
          path={`${match.url}/c/edit/:channelName/appearance`}
          component={EditChannelAppearancePage}
        />
        <Route
          path={`${match.url}/c/edit/:channelName/members/moderators`}
          component={withMemberForm(
            "moderator",
            "channelModerators",
            R.prop("moderator_name")
          )}
        />
        <Route
          path={`${match.url}/c/edit/:channelName/members/contributors`}
          component={withMemberForm(
            "contributor",
            "channelContributors",
            R.prop("contributor_name")
          )}
        />
      </React.Fragment>
    )
  }
}

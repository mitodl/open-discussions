// @flow
import React from "react"

import EditChannelMembersPage from "./EditChannelMembersPage"

type Props = {
  history: Object,
  match: Object
}

class EditChannelContributorsPage extends React.Component<Props> {
  render() {
    const { history, match } = this.props

    return (
      <EditChannelMembersPage
        reducerName="channelContributors"
        usernameField="contributor_name"
        history={history}
        match={match}
      />
    )
  }
}

export default EditChannelContributorsPage

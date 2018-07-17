// @flow
import React from "react"
import R from "ramda"

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
        usernameGetter={R.prop("contributor_name")}
        history={history}
        match={match}
      />
    )
  }
}

export default EditChannelContributorsPage

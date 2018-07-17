// @flow
import React from "react"

import EditChannelMembersPage from "./EditChannelMembersPage"

type Props = {
  history: Object,
  match: Object
}

class EditChannelModeratorsPage extends React.Component<Props> {
  render() {
    const { history, match } = this.props

    return (
      <EditChannelMembersPage
        reducerName="channelModerators"
        usernameField="moderator_name"
        history={history}
        match={match}
      />
    )
  }
}

export default EditChannelModeratorsPage

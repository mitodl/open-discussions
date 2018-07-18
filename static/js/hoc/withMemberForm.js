// @flow
import React from "react"

import EditChannelMembersPage from "../containers/admin/EditChannelMembersPage"

import type { Member } from "../flow/discussionTypes"

const withMemberForm = (
  noun: string, reducerName: string, usernameGetter: (member: Member) => string
) => {
  class withMemberForm extends React.Component<*> {
    render() {
      return <EditChannelMembersPage
        noun={noun}
        reducerName={reducerName}
        usernameGetter={usernameGetter}
        {...this.props}
      />
    }
  }
  return withMemberForm
}

export default withMemberForm

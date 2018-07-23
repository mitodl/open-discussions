// @flow
import React from "react"
import R from "ramda"

import Card from "../components/Card"
import EditChannelMembersForm from "../components/admin/EditChannelMembersForm"
import EditChannelNavbar from "../components/admin/EditChannelNavbar"
import MembersNavbar from "../components/admin/MembersNavbar"

import type { Channel, Member } from "../flow/discussionTypes"

const shouldLoadData = R.complement(R.allPass([R.eqProps("channelName")]))

const withMemberForm = (WrappedComponent: *) => {
  type Props = {
    channel: Channel,
    loadChannel: () => Promise<*>,
    loadMembers: () => Promise<*>,
    members: Array<Member>,
    usernameGetter: (member: Member) => string
  }

  class withMemberForm extends React.Component<Props> {
    componentDidMount() {
      this.loadData()
    }

    componentDidUpdate(prevProps: Props) {
      if (shouldLoadData(prevProps, this.props)) {
        this.loadData()
      }
    }

    loadData = async () => {
      const { channel, loadChannel, loadMembers, members } = this.props
      if (!channel) {
        await loadChannel()
      }

      if (!members) {
        await loadMembers()
      }
    }

    renderBody = () => {
      const { channel, members, usernameGetter } = this.props

      if (!channel || !members) {
        return null
      }

      return (
        <React.Fragment>
          <EditChannelNavbar channelName={channel.name} />
          <Card>
            <MembersNavbar channel={channel} />
            <EditChannelMembersForm
              members={members}
              usernameGetter={usernameGetter}
            />
          </Card>
        </React.Fragment>
      )
    }

    render() {
      return <WrappedComponent {...this.props} renderBody={this.renderBody} />
    }
  }
  return withMemberForm
}

export default withMemberForm

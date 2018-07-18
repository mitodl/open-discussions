// @flow
import React from "react"
import R from "ramda"
import { connect } from "react-redux"
import { MetaTags } from "react-meta-tags"

import Card from "../../components/Card"
import EditChannelMembersForm from "../../components/admin/EditChannelMembersForm"
import EditChannelNavbar from "../../components/admin/EditChannelNavbar"
import withSingleColumn from "../../hoc/withSingleColumn"

import { actions } from "../../actions"
import { formatTitle } from "../../lib/title"
import { getChannelName } from "../../lib/util"

import type { Dispatch } from "redux"
import type { Channel, Member } from "../../flow/discussionTypes"

const shouldLoadData = R.complement(R.allPass([R.eqProps("channelName")]))

type Props = {
  dispatch: Dispatch<*>,
  history: Object,
  channel: Channel,
  channelName: string,
  reducerName: string,
  members: Array<Member>,
  usernameGetter: (member: Member) => string
}

class EditChannelMembersPage extends React.Component<Props> {
  componentDidMount() {
    this.loadData()
  }

  componentDidUpdate(prevProps) {
    if (shouldLoadData(prevProps, this.props)) {
      this.loadData()
    }
  }

  loadData = async () => {
    const { dispatch, channel, channelName, reducerName, members } = this.props
    if (!channel) {
      await dispatch(actions.channels.get(channelName))
    }

    if (!members) {
      await dispatch(actions[reducerName].get(channelName))
    }
  }

  render() {
    const { channel, members, usernameGetter } = this.props

    if (!channel || !members) {
      return null
    }

    return (
      <React.Fragment>
        <MetaTags>
          <title>{formatTitle("Edit Channel")}</title>
        </MetaTags>
        <EditChannelNavbar channelName={channel.name} />
        <Card>
          <EditChannelMembersForm
            channelName={channel.name}
            members={members}
            usernameGetter={usernameGetter}
          />
        </Card>
      </React.Fragment>
    )
  }
}

const mapStateToProps = (state, ownProps) => {
  const reducerName = ownProps.reducerName
  const channelName = getChannelName(ownProps)
  const channel = state.channels.data.get(channelName)
  const processing = state.channels.processing || state[reducerName].processing
  const members = state[reducerName].data.get(channelName)
  return {
    channel,
    members,
    channelName,
    processing
  }
}

export default R.compose(
  connect(mapStateToProps),
  withSingleColumn("edit-channel")
)(EditChannelMembersPage)

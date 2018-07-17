// @flow
import React from "react"
import R from "ramda"
import { connect } from "react-redux"
import { MetaTags } from "react-meta-tags"

import EditChannelModeratorsForm from "../../components/admin/EditChannelModeratorsForm"
import EditChannelNavbar from "../../components/admin/EditChannelNavbar"
import withSingleColumn from "../../hoc/withSingleColumn"

import { actions } from "../../actions"
import { formatTitle } from "../../lib/title"
import { getChannelName } from "../../lib/util"

import type { Dispatch } from "redux"
import type { Channel, ChannelModerators } from "../../flow/discussionTypes"

const shouldLoadData = R.complement(R.allPass([R.eqProps("channelName")]))

class EditChannelModeratorsPage extends React.Component<*, void> {
  props: {
    dispatch: Dispatch<*>,
    history: Object,
    channel: Channel,
    channelName: string,
    moderators: ChannelModerators
  }

  componentDidMount() {
    this.loadData()
  }

  componentDidUpdate(prevProps) {
    if (shouldLoadData(prevProps, this.props)) {
      this.loadData()
    }
  }

  loadData = async () => {
    const { dispatch, channel, channelName, moderators } = this.props
    if (!channel) {
      await dispatch(actions.channels.get(channelName))
    }

    if (!moderators) {
      await dispatch(actions.channelModerators.get(channelName))
    }
  }

  render() {
    const { channel, moderators } = this.props

    if (!channel || !moderators) {
      return null
    }

    return (
      <React.Fragment>
        <MetaTags>
          <title>{formatTitle("Edit Channel")}</title>
        </MetaTags>
        <EditChannelNavbar channelName={channel.name} />
        <EditChannelModeratorsForm
          moderators={moderators}
          channelName={channel.name}
        />
      </React.Fragment>
    )
  }
}

const mapStateToProps = (state, ownProps) => {
  const channelName = getChannelName(ownProps)
  const channel = state.channels.data.get(channelName)
  const processing =
    state.channels.processing || state.channelModerators.processing
  const moderators = state.channelModerators.data.get(channelName)
  return {
    channel,
    moderators,
    channelName,
    processing
  }
}

export default R.compose(
  connect(mapStateToProps),
  withSingleColumn("edit-channel")
)(EditChannelModeratorsPage)

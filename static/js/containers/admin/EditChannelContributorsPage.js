// @flow
import React from "react"
import R from "ramda"
import { connect } from "react-redux"
import { MetaTags } from "react-meta-tags"

import EditChannelContributorsForm from "../../components/admin/EditChannelContributorsForm"
import EditChannelNavbar from "../../components/admin/EditChannelNavbar"
import withSingleColumn from "../../hoc/withSingleColumn"

import { actions } from "../../actions"
import { formatTitle } from "../../lib/title"
import { getChannelName } from "../../lib/util"

import type { Dispatch } from "redux"
import type { Channel, ChannelContributors } from "../../flow/discussionTypes"

const shouldLoadData = R.complement(R.allPass([R.eqProps("channelName")]))

class EditChannelContributorsPage extends React.Component<*, void> {
  props: {
    dispatch: Dispatch<*>,
    history: Object,
    channel: Channel,
    channelName: string,
    contributors: ChannelContributors
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
    const { dispatch, channel, channelName, contributors } = this.props
    if (!channel) {
      await dispatch(actions.channels.get(channelName))
    }

    if (!contributors) {
      await dispatch(actions.channelContributors.get(channelName))
    }
  }

  render() {
    const { channel, contributors } = this.props

    if (!channel || !contributors) {
      return null
    }

    return (
      <React.Fragment>
        <MetaTags>
          <title>{formatTitle("Edit Channel")}</title>
        </MetaTags>
        <EditChannelNavbar channelName={channel.name} />
        <EditChannelContributorsForm
          channelName={channel.name}
          contributors={contributors}
        />
      </React.Fragment>
    )
  }
}

const mapStateToProps = (state, ownProps) => {
  const channelName = getChannelName(ownProps)
  const channel = state.channels.data.get(channelName)
  const processing =
    state.channels.processing || state.channelContributors.processing
  const contributors = state.channelContributors.data.get(channelName)
  return {
    channel,
    contributors,
    channelName,
    processing
  }
}

export default R.compose(
  connect(mapStateToProps),
  withSingleColumn("edit-channel")
)(EditChannelContributorsPage)

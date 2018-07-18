// @flow
import React from "react"
import R from "ramda"
import { MetaTags } from "react-meta-tags"
import { connect } from "react-redux"

import withMemberForm from "../../hoc/withMemberForm"
import withSingleColumn from "../../hoc/withSingleColumn"

import { formatTitle } from "../../lib/title"
import { actions } from "../../actions"
import { getChannelName } from "../../lib/util"

import type { Dispatch } from "redux"

type Props = {
  renderBody: () => React$Element<*>
}

export class EditChannelContributorsPage extends React.Component<Props> {
  render() {
    const { renderBody } = this.props

    return (
      <React.Fragment>
        <MetaTags>
          <title>{formatTitle("Edit Channel")}</title>
        </MetaTags>
        {renderBody()}
      </React.Fragment>
    )
  }
}

const mapDispatchToProps = (dispatch: Dispatch<*>, ownProps) => ({
  loadMembers: () =>
    dispatch(actions.channelContributors.get(getChannelName(ownProps))),
  loadChannel:    () => dispatch(actions.channels.get(getChannelName(ownProps))),
  usernameGetter: (member: any): string => member.contributor_name
})

const mapStateToProps = (state, ownProps) => {
  const channelName = getChannelName(ownProps)
  const channel = state.channels.data.get(channelName)
  const processing =
    state.channels.processing || state.channelContributors.processing
  const members = state.channelContributors.data.get(channelName)
  return {
    channel,
    members,
    channelName,
    processing
  }
}

export default R.compose(
  connect(
    mapStateToProps,
    mapDispatchToProps
  ),
  withMemberForm,
  withSingleColumn("edit-channel")
)(EditChannelContributorsPage)

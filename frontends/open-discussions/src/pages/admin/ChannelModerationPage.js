// @flow
/* global SETTINGS: false */
import React from "react"
import R from "ramda"
import { connect } from "react-redux"
import { MetaTags } from "react-meta-tags"
import { Redirect } from "react-router"

import Card from "../../components/Card"
import {
  withPostModeration,
  postModerationSelector
} from "../../hoc/withPostModeration"
import CompactPostDisplay from "../../components/CompactPostDisplay"
import Comment from "../../components/Comment"

import { commentPermalink, channelURL } from "../../lib/url"
import { actions } from "../../actions"
import { formatTitle } from "../../lib/title"
import { isPrivate } from "../../lib/channels"

import type { Match } from "react-router"
import type { Dispatch } from "redux"
import type {
  Channel,
  PostReportRecord,
  ReportRecord
} from "../../flow/discussionTypes"
import EditChannelNavbar from "../../components/admin/EditChannelNavbar"
import withSingleColumn from "../../hoc/withSingleColumn"
import withChannelHeader from "../../hoc/withChannelHeader"
import { renderDeferredLoading, Loading } from "../../components/Loading"

type Props = {
  match: Match,
  dispatch: Dispatch<*>,
  channelName: string,
  channel: Channel,
  errored: boolean,
  reports: Array<PostReportRecord>,
  isModerator: boolean,
  notAuthorized: boolean,
  notFound: boolean,
  removePost: Function,
  ignorePostReports: Function,
  dropdownMenus: Set<string>,
  loaded: boolean
}

export class ChannelModerationPage extends React.Component<Props> {
  componentDidMount() {
    this.loadData()
  }

  loadData = async () => {
    const { dispatch, channelName, loaded } = this.props

    try {
      if (!loaded) {
        await dispatch(actions.channels.get(channelName))
      }
      // force refresh of reports whenever the user revisits the page
      await dispatch(actions.reports.get(channelName))
    } catch (_) {} // eslint-disable-line no-empty
  }

  renderReports = () => {
    const { reports } = this.props
    return reports.length === 0 ? (
      <Card title="Reported Posts & Comments">
        <div className="empty-message">No outstanding reports</div>
      </Card>
    ) : (
      // $FlowFixMe: flow being mad pedantic
      reports.map(this.renderReport)
    )
  }

  renderReport = (report: ReportRecord) => {
    const { isModerator, removePost, channel, channelName, ignorePostReports } =
      this.props

    if (report.post) {
      return (
        <CompactPostDisplay
          post={report.post}
          isModerator={isModerator}
          removePost={removePost}
          key={report.post.id}
          ignorePostReports={ignorePostReports}
        />
      )
    } else {
      return (
        <Comment
          comment={report.comment}
          commentPermalink={commentPermalink(
            channelName,
            report.comment.post_id,
            null
          )}
          key={`${report.comment.id}-${report.comment.post_id}`}
          moderationUI
          isModerator={isModerator}
          isPrivateChannel={isPrivate(channel)}
          channelName={channelName}
          shouldGetReports
        />
      )
    }
  }

  render() {
    const { channel, errored, loaded, notAuthorized, notFound, isModerator } =
      this.props

    if (!channel) {
      return null
    }

    return isModerator ? (
      <React.Fragment>
        <MetaTags>
          <title>{formatTitle("Edit Channel")}</title>
        </MetaTags>
        <EditChannelNavbar channelName={channel.name} />

        <div className="channel-moderation">
          {renderDeferredLoading({
            errored,
            loaded,
            notAuthorized,
            notFound,
            LoadingComponent: Loading,
            render:           this.renderReports
          })}
        </div>
      </React.Fragment>
    ) : (
      <Redirect to={channelURL(channel.name)} />
    )
  }
}

const mapStateToProps = (state, ownProps) => ({
  ...postModerationSelector(state, ownProps),
  shouldGetReports: true,
  dropdownMenus:    state.ui.dropdownMenus
})

export default R.compose(
  connect(mapStateToProps),
  withPostModeration,
  withChannelHeader,
  withSingleColumn("edit-channel")
)(ChannelModerationPage)

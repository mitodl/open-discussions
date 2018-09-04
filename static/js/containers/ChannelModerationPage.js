// @flow
/* global SETTINGS: false */
import React from "react"
import R from "ramda"
import { connect } from "react-redux"
import { MetaTags } from "react-meta-tags"
import { Redirect } from "react-router"

import Card from "../components/Card"
import {
  withPostModeration,
  postModerationSelector
} from "../hoc/withPostModeration"
import {
  withCommentModeration,
  commentModerationSelector
} from "../hoc/withCommentModeration"
import withLoading from "../components/Loading"
import withChannelSidebar from "../hoc/withChannelSidebar"
import CompactPostDisplay from "../components/CompactPostDisplay"
import CommentTree from "../components/CommentTree"
import { ChannelModerationBreadcrumbs } from "../components/ChannelBreadcrumbs"
import CanonicalLink from "../components/CanonicalLink"

import { commentPermalink, channelURL } from "../lib/url"
import { actions } from "../actions"
import { formatTitle } from "../lib/title"
import { dropdownMenuFuncs } from "../lib/ui"

import type { Match } from "react-router"
import type { Dispatch } from "redux"
import type {
  Channel,
  PostReportRecord,
  ReportRecord
} from "../flow/discussionTypes"

const addDummyReplies = R.over(R.lensPath(["replies"]), () => [])

type Props = {
  match: Match,
  dispatch: Dispatch<*>,
  channelName: string,
  channel: Channel,
  reports: Array<PostReportRecord>,
  isModerator: boolean,
  removePost: Function,
  ignorePostReports: Function,
  approveComment: Function,
  removeComment: Function,
  ignoreCommentReports: Function,
  dropdownMenus: Set<string>
}

export class ChannelModerationPage extends React.Component<Props> {
  componentDidMount() {
    this.loadData()
  }

  loadData = async () => {
    const { dispatch, channelName } = this.props

    try {
      await dispatch(actions.channels.get(channelName))
      await dispatch(actions.reports.get(channelName))
    } catch (_) {} // eslint-disable-line no-empty
  }

  renderReport = (report: ReportRecord) => {
    const {
      isModerator,
      removePost,
      approveComment,
      removeComment,
      channelName,
      ignorePostReports,
      ignoreCommentReports,
      dropdownMenus,
      dispatch
    } = this.props

    if (report.post) {
      return (
        <CompactPostDisplay
          post={report.post}
          report={report}
          isModerator={isModerator}
          removePost={removePost}
          key={report.post.id}
          ignorePostReports={ignorePostReports}
        />
      )
    } else {
      return (
        <CommentTree
          comments={[addDummyReplies(report.comment)]}
          commentPermalink={commentPermalink(
            channelName,
            report.comment.post_id,
            null
          )}
          approve={approveComment}
          remove={removeComment}
          ignoreCommentReports={ignoreCommentReports}
          key={`${report.comment.id}-${report.comment.post_id}`}
          moderationUI
          isModerator={isModerator}
          dropdownMenus={dropdownMenus}
          curriedDropdownMenufunc={dropdownMenuFuncs(dispatch)}
        />
      )
    }
  }

  render() {
    const { channel, reports, isModerator, match } = this.props

    return isModerator ? (
      <div className="channel-moderation">
        <MetaTags>
          <title>{formatTitle(`${channel.title} moderation`)}</title>
          <CanonicalLink match={match} />
        </MetaTags>
        <ChannelModerationBreadcrumbs channel={channel} />
        {reports.length === 0 ? (
          <Card title="Reported Posts & Comments">
            <div className="empty-message">No outstanding reports</div>
          </Card>
        ) : (
          reports.map(this.renderReport)
        )}
      </div>
    ) : (
      <Redirect to={channelURL(channel.name)} />
    )
  }
}

const mapStateToProps = (state, ownProps) => ({
  ...postModerationSelector(state, ownProps),
  ...commentModerationSelector(state, ownProps),
  shouldGetReports: true,
  dropdownMenus:    state.ui.dropdownMenus
})

export default R.compose(
  connect(mapStateToProps),
  withPostModeration,
  withCommentModeration,
  withChannelSidebar("channel-moderation-page"),
  withLoading
)(ChannelModerationPage)

// @flow
/* global SETTINGS: false */
import React from "react"
import R from "ramda"
import { connect } from "react-redux"
import DocumentTitle from "react-document-title"
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
import withNavAndChannelSidebars from "../hoc/withNavAndChannelSidebars"
import CompactPostDisplay from "../components/CompactPostDisplay"
import CommentTree from "../components/CommentTree"
import { ChannelModerationBreadcrumbs } from "../components/ChannelBreadcrumbs"

import { commentPermalink, channelURL } from "../lib/url"
import { actions } from "../actions"
import { formatTitle } from "../lib/title"

const addDummyReplies = R.over(R.lensPath(["replies"]), () => [])

class ChannelModerationPage extends React.Component<*, *> {
  componentWillMount() {
    this.loadData()
  }

  loadData = async () => {
    const { dispatch, channelName } = this.props

    try {
      await dispatch(actions.channels.get(channelName))
      await dispatch(actions.channelModerators.get(channelName))
      await dispatch(actions.reports.get(channelName))
    } catch (_) {} // eslint-disable-line no-empty
  }

  renderReport = report => {
    const {
      isModerator,
      removePost,
      approveComment,
      removeComment,
      channelName,
      ignorePostReports,
      ignoreCommentReports,
      commentReports
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
          commentReports={commentReports}
          commentPermalink={commentPermalink(
            channelName,
            report.comment.post_id
          )}
          approve={approveComment}
          remove={removeComment}
          ignoreCommentReports={ignoreCommentReports}
          key={`${report.comment.id}-${report.comment.post_id}`}
          moderationUI
          isModerator={isModerator}
        />
      )
    }
  }

  render() {
    const { channel, reports, isModerator } = this.props

    return isModerator ? (
      <div className="channel-moderation">
        <DocumentTitle title={formatTitle(`${channel.title} moderation`)} />
        <ChannelModerationBreadcrumbs channel={channel} />
        <Card title="Reported Posts & Comments">
          {reports.length === 0 ? (
            <div className="empty-message">No outstanding reports</div>
          ) : (
            reports.map(this.renderReport)
          )}
        </Card>
      </div>
    ) : (
      <Redirect to={channelURL(channel.name)} />
    )
  }
}

const mapStateToProps = (state, ownProps) => {
  return {
    ...postModerationSelector(state, ownProps),
    ...commentModerationSelector(state, ownProps),
    shouldGetReports: true
  }
}

export default R.compose(
  connect(mapStateToProps),
  withPostModeration,
  withCommentModeration,
  withNavAndChannelSidebars("channel-moderation-page"),
  withLoading
)(ChannelModerationPage)

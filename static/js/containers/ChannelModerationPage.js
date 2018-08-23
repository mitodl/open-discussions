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
import Loading from "../components/Loading"
import withChannelSidebar from "../hoc/withChannelSidebar"
import CompactPostDisplay from "../components/CompactPostDisplay"
import CommentTree from "../components/CommentTree"
import { ChannelModerationBreadcrumbs } from "../components/ChannelBreadcrumbs"

import { commentPermalink, channelURL } from "../lib/url"
import { actions } from "../actions"
import { formatTitle } from "../lib/title"

import type { Dispatch } from "redux"
import type {
  Channel,
  PostReportRecord,
  CommentReportRecord
} from "../flow/discussionTypes"
import type { LoadingProps } from "../components/Loading"

const addDummyReplies = R.over(R.lensPath(["replies"]), () => [])

type Props = {
  dispatch: Dispatch<*>,
  channelName: string,
  channel: Channel,
  reports: Array<PostReportRecord>,
  commentReports: Array<CommentReportRecord>,
  isModerator: boolean,
  removePost: Function,
  ignorePostReports: Function,
  approveComment: Function,
  removeComment: Function,
  ignoreCommentReports: Function
} & LoadingProps

class ChannelModerationPage extends React.Component<Props> {
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
        <Card>
          <CommentTree
            comments={[addDummyReplies(report.comment)]}
            commentReports={commentReports}
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
          />
        </Card>
      )
    }
  }

  renderPage = () => {
    const { channel, reports, isModerator } = this.props

    return isModerator ? (
      <div className="channel-moderation">
        <MetaTags>
          <title>{formatTitle(`${channel.title} moderation`)} </title>
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

  render() {
    const { loaded, errored, notAuthorized, notFound } = this.props
    return (
      <Loading
        loaded={loaded}
        errored={errored}
        notAuthorized={notAuthorized}
        notFound={notFound}
      >
        {this.renderPage()}
      </Loading>
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
  withChannelSidebar("channel-moderation-page")
)(ChannelModerationPage)

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
import {
  withCommentModeration,
  commentModerationSelector
} from "../../hoc/withCommentModeration"
import CompactPostDisplay from "../../components/CompactPostDisplay"
import CommentTree from "../../components/CommentTree"

import { commentPermalink, channelURL } from "../../lib/url"
import { actions } from "../../actions"
import { formatTitle } from "../../lib/title"
import { dropdownMenuFuncs } from "../../lib/ui"
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

const addDummyReplies = R.over(R.lensPath(["replies"]), () => [])

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
  approveComment: Function,
  removeComment: Function,
  ignoreCommentReports: Function,
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
      reports.map(this.renderReport)
    )
  }

  renderReport = (report: ReportRecord) => {
    const {
      isModerator,
      removePost,
      approveComment,
      removeComment,
      channel,
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
          isPrivateChannel={isPrivate(channel)}
          dropdownMenus={dropdownMenus}
          curriedDropdownMenufunc={dropdownMenuFuncs(dispatch)}
        />
      )
    }
  }

  render() {
    const {
      channel,
      errored,
      loaded,
      notAuthorized,
      notFound,
      isModerator
    } = this.props

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
  ...commentModerationSelector(state, ownProps),
  shouldGetReports: true,
  dropdownMenus:    state.ui.dropdownMenus
})

export default R.compose(
  connect(mapStateToProps),
  withPostModeration,
  withCommentModeration,
  withChannelHeader,
  withSingleColumn("edit-channel")
)(ChannelModerationPage)

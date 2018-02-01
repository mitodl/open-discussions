// @flow
/* global SETTINGS: false */
import React from "react"
import { connect } from "react-redux"
import R from "ramda"
import DocumentTitle from "react-document-title"
import { Dialog } from "@mitodl/mdl-react-components"
import { Link } from "react-router-dom"
import qs from "query-string"

import Card from "../components/Card"
import withLoading from "../components/Loading"
import ExpandedPostDisplay from "../components/ExpandedPostDisplay"
import CommentTree from "../components/CommentTree"
import ReportForm from "../components/ReportForm"
import { ReplyToPostForm } from "../components/CommentForms"
import withNavSidebar from "../hoc/withNavSidebar"
import NotFound from "../components/404"
import {
  withPostModeration,
  postModerationSelector
} from "../hoc/withPostModeration"
import {
  withCommentModeration,
  commentModerationSelector
} from "../hoc/withCommentModeration"
import { ChannelBreadcrumbs } from "../components/ChannelBreadcrumbs"
import { CommentSortPicker } from "../components/SortPicker"
import { updateCommentSortParam, COMMENT_SORT_BEST } from "../lib/sorting"

import { formatCommentsCount } from "../lib/posts"
import { validateContentReportForm } from "../lib/validation"
import { actions } from "../actions"
import { replaceMoreComments } from "../actions/comment"
import { setFocusedComment, clearFocusedComment } from "../actions/focus"
import { formBeginEdit, formEndEdit } from "../actions/forms"
import { setSnackbarMessage, showDialog, hideDialog } from "../actions/ui"
import { toggleUpvote } from "../util/api_actions"
import { getChannelName, getPostID, getCommentID } from "../lib/util"
import { isModerator } from "../lib/channels"
import { anyErrorExcept404 } from "../util/rest"
import { getSubscribedChannels } from "../lib/redux_selectors"
import { beginEditing } from "../components/CommentForms"
import { formatTitle } from "../lib/title"
import { channelURL, postDetailURL, commentPermalink } from "../lib/url"
import { clearPostError } from "../actions/post"

import type { Dispatch } from "redux"
import type { Match, Location } from "react-router"
import type { FormsState } from "../flow/formTypes"
import type {
  Channel,
  ChannelModerators,
  CommentInTree,
  GenericComment,
  MoreCommentsInTree,
  Post,
  CommentReportRecord,
  PostReportRecord
} from "../flow/discussionTypes"

type PostPageProps = {
  match: Match,
  dispatch: Dispatch,
  post: Post,
  channel: Channel,
  moderators: ChannelModerators,
  isModerator: boolean,
  focusedComment: ?CommentInTree,
  showRemoveCommentDialog: boolean,
  commentsTree: Array<GenericComment>,
  forms: FormsState,
  commentInFlight: boolean,
  // from the router match
  channelName: string,
  postID: string,
  commentID?: string,
  history: Object,
  postDeleteDialogVisible: boolean,
  commentDeleteDialogVisible: boolean,
  postReportDialogVisible: boolean,
  commentReportDialogVisible: boolean,
  notFound: boolean,
  errored: boolean,
  commentReports: Map<string, CommentReportRecord>,
  approvePost: (p: Post) => void,
  removePost: (p: Post) => void,
  approveComment: (c: Comment) => void,
  removeComment: (c: Comment) => void,
  postReports: Map<string, PostReportRecord>,
  location: Location
}

const DELETE_POST_DIALOG = "DELETE_POST_DIALOG"
const DELETE_COMMENT_DIALOG = "DELETE_COMMENT_DIALOG"

const REPORT_POST_DIALOG = "REPORT_POST_DIALOG"
const REPORT_COMMENT_DIALOG = "REPORT_COMMENT_DIALOG"

const REPORT_FORM_KEY = "report:content"
const REPORT_CONTENT_PAYLOAD = {
  formKey: REPORT_FORM_KEY
}
const REPORT_CONTENT_NEW_FORM = {
  ...REPORT_CONTENT_PAYLOAD,
  value: {
    reason: ""
  }
}

const getReportForm = R.prop(REPORT_FORM_KEY)

// if postId, channelName, or commentID don't match
const shouldLoadData = R.complement(
  R.allPass([
    R.eqProps("postID"),
    R.eqProps("channelName"),
    R.eqProps("commentID"),
    R.eqBy(R.path(["location", "search"]))
  ])
)

class PostPage extends React.Component<*, void> {
  props: PostPageProps

  componentWillMount() {
    this.loadData()
  }

  componentWillUnmount() {
    const { dispatch, errored, notFound } = this.props

    if (errored || notFound) {
      dispatch(clearPostError())
    }
  }

  componentDidUpdate(prevProps) {
    if (shouldLoadData(prevProps, this.props)) {
      this.loadData()
    }
  }

  downvote = async (comment: CommentInTree) => {
    const { dispatch } = this.props
    await dispatch(
      actions.comments.patch(comment.id, {
        downvoted: !comment.downvoted
      })
    )
  }

  loadData = async () => {
    const {
      dispatch,
      channelName,
      postID,
      commentID,
      channel,
      location: { search }
    } = this.props
    let { moderators } = this.props

    if (!postID || !channelName) {
      // should not happen, this should be guaranteed by react-router
      throw Error("Match error")
    }

    try {
      await Promise.all([
        dispatch(actions.posts.get(postID)),
        dispatch(actions.comments.get(postID, commentID, qs.parse(search)))
      ])
    } catch (_) {} // eslint-disable-line no-empty

    if (!channel) {
      dispatch(actions.channels.get(channelName))
    }

    if (!moderators) {
      const { response } = await dispatch(
        actions.channelModerators.get(channelName)
      )
      moderators = response
    }

    if (isModerator(moderators, SETTINGS.username)) {
      await dispatch(actions.reports.get(channelName))
    }
  }

  upvote = async (comment: CommentInTree) => {
    const { dispatch } = this.props
    await dispatch(
      actions.comments.patch(comment.id, {
        upvoted: !comment.upvoted
      })
    )
  }

  loadMoreComments = async (comment: MoreCommentsInTree) => {
    const { dispatch } = this.props
    const { post_id: postId, parent_id: parentId, children } = comment
    const comments = await dispatch(
      actions.morecomments.get(postId, parentId, children)
    )
    dispatch(
      replaceMoreComments({
        postId,
        parentId,
        comments
      })
    )
  }

  showCommentDialog = R.curry((dialogKey: string, comment: CommentInTree) => {
    const { dispatch } = this.props
    dispatch(setFocusedComment(comment))
    dispatch(showDialog(dialogKey))
  })

  hideCommentDialog = (dialogKey: string) => () => {
    const { dispatch } = this.props
    dispatch(clearFocusedComment())
    dispatch(hideDialog(dialogKey))
  }

  showReportCommentDialog = (comment: CommentInTree) => {
    const { dispatch } = this.props
    dispatch(formBeginEdit({ ...REPORT_CONTENT_NEW_FORM }))
    this.showCommentDialog(REPORT_COMMENT_DIALOG, comment)
  }

  hideReportCommentDialog = () => {
    const { dispatch } = this.props
    dispatch(formEndEdit({ ...REPORT_CONTENT_PAYLOAD }))
    this.hideCommentDialog(REPORT_COMMENT_DIALOG)()
  }

  showReportPostDialog = () => {
    const { dispatch } = this.props
    dispatch(formBeginEdit({ ...REPORT_CONTENT_NEW_FORM }))
    this.showPostDialog(REPORT_POST_DIALOG)()
  }

  hideReportPostDialog = () => {
    const { dispatch } = this.props
    dispatch(formEndEdit({ ...REPORT_CONTENT_PAYLOAD }))
    this.hidePostDialog(REPORT_POST_DIALOG)()
  }

  showPostDialog = (dialogKey: string) => () => {
    const { dispatch } = this.props
    dispatch(showDialog(dialogKey))
  }

  hidePostDialog = (dialogKey: string) => () => {
    const { dispatch } = this.props
    dispatch(hideDialog(dialogKey))
  }

  deleteComment = async () => {
    // ⚠️  this is a destructive action! ⚠️
    const { dispatch, focusedComment, post } = this.props
    if (focusedComment) {
      await dispatch(actions.comments["delete"](post.id, focusedComment.id))
      dispatch(
        setSnackbarMessage({
          message: "Comment has been deleted"
        })
      )
    }
  }

  deletePost = async (post: Post) => {
    // ⚠️  this is a destructive action! ⚠️
    const { dispatch, history, channelName } = this.props
    await dispatch(actions.posts["delete"](post.id))
    history.push(channelURL(channelName))
    dispatch(
      setSnackbarMessage({
        message: "Post has been deleted"
      })
    )
  }

  reportComment = async () => {
    const { dispatch, focusedComment, forms } = this.props
    const form = getReportForm(forms)
    const { reason } = form.value
    if (focusedComment) {
      const validation = validateContentReportForm(form)

      if (!R.isEmpty(validation)) {
        dispatch(
          actions.forms.formValidate({
            ...REPORT_CONTENT_PAYLOAD,
            errors: validation.value
          })
        )
      } else {
        await dispatch(
          actions.reports.post({
            comment_id: focusedComment.id,
            reason:     reason
          })
        )
        this.hideReportCommentDialog()
        dispatch(
          setSnackbarMessage({
            message: "Comment has been reported"
          })
        )
      }
    }
  }

  reportPost = async () => {
    const { dispatch, post, forms, isModerator, channelName } = this.props
    const form = getReportForm(forms)
    const { reason } = form.value
    const validation = validateContentReportForm(form)

    if (!R.isEmpty(validation)) {
      dispatch(
        actions.forms.formValidate({
          ...REPORT_CONTENT_PAYLOAD,
          errors: validation.value
        })
      )
    } else {
      await dispatch(
        actions.reports.post({
          post_id: post.id,
          reason:  reason
        })
      )

      if (isModerator) {
        await dispatch(actions.reports.get(channelName))
      }

      this.hideReportPostDialog()
      dispatch(
        setSnackbarMessage({
          message: "Post has been reported"
        })
      )
    }
  }

  onReportUpdate = (e: Object) => {
    const { dispatch } = this.props
    dispatch(
      actions.forms.formUpdate({
        ...REPORT_CONTENT_PAYLOAD,
        value: {
          [e.target.name]: e.target.value
        }
      })
    )
  }

  render() {
    const {
      dispatch,
      post,
      channel,
      commentsTree,
      forms,
      commentInFlight,
      isModerator,
      postDeleteDialogVisible,
      commentDeleteDialogVisible,
      postReportDialogVisible,
      commentReportDialogVisible,
      notFound,
      commentID,
      commentReports,
      postReports,
      removePost,
      approvePost,
      removeComment,
      approveComment,
      postID,
      location: { search }
    } = this.props

    if (!channel) {
      return null
    }

    const reportForm = getReportForm(forms)
    const showPermalinkUI = R.not(R.isNil(commentID))
    const postReport = postReports.get(postID)

    return notFound
      ? <NotFound />
      : <div>
        <ChannelBreadcrumbs channel={channel} />
        <DocumentTitle title={formatTitle(post.title)} />
        <Dialog
          open={commentDeleteDialogVisible}
          hideDialog={this.hideCommentDialog(DELETE_COMMENT_DIALOG)}
          onAccept={this.deleteComment}
          title="Delete Comment"
          submitText="Yes, Delete"
        >
            Are you sure you want to delete this comment?
        </Dialog>
        <Dialog
          open={postDeleteDialogVisible}
          hideDialog={this.hidePostDialog(DELETE_POST_DIALOG)}
          onAccept={() => this.deletePost(post)}
          title="Delete Post"
          submitText="Yes, Delete"
        >
            Are you sure you want to delete this post?
        </Dialog>
        <Dialog
          open={postReportDialogVisible}
          hideDialog={this.hideReportPostDialog}
          onCancel={this.hideReportPostDialog}
          onAccept={this.reportPost}
          validateOnClick={true}
          title="Report Post"
          submitText="Yes, Report"
        >
          {reportForm
            ? <ReportForm
              reportForm={reportForm.value}
              validation={reportForm.errors}
              onUpdate={this.onReportUpdate}
              description="Are you sure you want to report this post for violating the rules of MIT Open Discussions?"
              label="Why are you reporting this post?"
            />
            : null}
        </Dialog>
        <Dialog
          open={commentReportDialogVisible}
          hideDialog={this.hideReportCommentDialog}
          onCancel={this.hideReportCommentDialog}
          onAccept={this.reportComment}
          validateOnClick={true}
          title="Report Comment"
          submitText="Yes, Report"
        >
          {reportForm
            ? <ReportForm
              reportForm={reportForm.value}
              validation={reportForm.errors}
              onUpdate={this.onReportUpdate}
              description="Are you sure you want to report this comment for violating the rules of MIT Open Discussions?"
              label="Why are you reporting this comment?"
            />
            : null}
        </Dialog>
        <Card>
          <div className="post-card">
            <ExpandedPostDisplay
              post={post}
              isModerator={isModerator}
              toggleUpvote={toggleUpvote(dispatch)}
              approvePost={approvePost.bind(this)}
              removePost={removePost.bind(this)}
              forms={forms}
              beginEditing={beginEditing(dispatch)}
              showPostDeleteDialog={this.showPostDialog(DELETE_POST_DIALOG)}
              showPostReportDialog={this.showReportPostDialog}
              showPermalinkUI={showPermalinkUI}
              report={postReport}
            />
            {showPermalinkUI
              ? null
              : <ReplyToPostForm
                forms={forms}
                post={post}
                processing={commentInFlight}
              />}
          </div>
        </Card>
        {commentID
          ? <Card className="comment-detail-card">
            <div>You are viewing a single comment's thread.</div>
            <Link to={postDetailURL(channel.name, post.id)}>
                  View the rest of the comments
            </Link>
          </Card>
          : <div className="count-and-sort">
            <div className="comments-count">
              {formatCommentsCount(post)}
            </div>
            <CommentSortPicker
              updateSortParam={updateCommentSortParam(this.props)}
              value={qs.parse(search).sort || COMMENT_SORT_BEST}
            />
          </div>}
        <CommentTree
          comments={commentsTree}
          forms={forms}
          upvote={this.upvote}
          downvote={this.downvote}
          approve={approveComment}
          remove={removeComment}
          deleteComment={this.showCommentDialog(DELETE_COMMENT_DIALOG)}
          reportComment={this.showReportCommentDialog}
          isModerator={isModerator}
          loadMoreComments={this.loadMoreComments}
          beginEditing={beginEditing(dispatch)}
          processing={commentInFlight}
          commentPermalink={commentPermalink(channel.name, post.id)}
          commentReports={commentReports}
        />
      </div>
  }
}

const mapStateToProps = (state, ownProps) => {
  const { posts, channels, comments, forms, channelModerators, ui } = state
  const postID = getPostID(ownProps)
  const channelName = getChannelName(ownProps)
  const commentID = getCommentID(ownProps)
  const post = posts.data.get(postID)
  const channel = channels.data.get(channelName)
  const commentsTree = comments.data.get(postID)
  const moderators = channelModerators.data.get(channelName)
  const loaded = posts.error
    ? true
    : R.none(R.isNil, [post, channel, commentsTree])
  const notFound = loaded
    ? posts.error && posts.error.errorStatusCode === 404
    : false

  return {
    ...postModerationSelector(state, ownProps),
    ...commentModerationSelector(state, ownProps),
    ui,
    postID,
    channelName,
    commentID,
    forms,
    post,
    channel,
    commentsTree,
    moderators,
    loaded,
    notFound,
    isModerator:                isModerator(moderators, SETTINGS.username),
    errored:                    anyErrorExcept404([posts, channels, comments]),
    subscribedChannels:         getSubscribedChannels(state),
    commentInFlight:            comments.processing,
    postDeleteDialogVisible:    ui.dialogs.has(DELETE_POST_DIALOG),
    commentDeleteDialogVisible: ui.dialogs.has(DELETE_COMMENT_DIALOG),
    postReportDialogVisible:    ui.dialogs.has(REPORT_POST_DIALOG),
    commentReportDialogVisible: ui.dialogs.has(REPORT_COMMENT_DIALOG)
  }
}

export default R.compose(
  connect(mapStateToProps),
  withPostModeration,
  withCommentModeration,
  withNavSidebar,
  withLoading
)(PostPage)

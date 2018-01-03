// @flow
/* global SETTINGS: false */
import React from "react"
import { connect } from "react-redux"
import R from "ramda"
import DocumentTitle from "react-document-title"
import { Dialog } from "@mitodl/mdl-react-components"

import Card from "../components/Card"
import withLoading from "../components/Loading"
import ChannelBreadcrumbs from "../components/ChannelBreadcrumbs"
import ExpandedPostDisplay from "../components/ExpandedPostDisplay"
import CommentTree from "../components/CommentTree"
import ReportForm from "../components/ReportForm"
import { ReplyToPostForm } from "../components/CommentForms"
import withNavSidebar from "../hoc/withNavSidebar"
import NotFound from "../components/404"

import { formatCommentsCount } from "../lib/posts"
import { validateContentReportForm } from "../lib/validation"
import { actions } from "../actions"
import { replaceMoreComments } from "../actions/comment"
import { setFocusedComment, clearFocusedComment } from "../actions/focus"
import { formBeginEdit, formEndEdit } from "../actions/forms"
import { setSnackbarMessage, showDialog, hideDialog } from "../actions/ui"
import {
  toggleUpvote,
  approvePost,
  removePost,
  removeComment,
  approveComment
} from "../util/api_actions"
import { getChannelName, getPostID } from "../lib/util"
import { isModerator } from "../lib/channels"
import { anyErrorExcept404 } from "../util/rest"
import { getSubscribedChannels } from "../lib/redux_selectors"
import { beginEditing } from "../components/CommentForms"
import { formatTitle } from "../lib/title"
import { channelURL } from "../lib/url"
import type { Dispatch } from "redux"
import type { Match } from "react-router"
import type { FormsState } from "../flow/formTypes"
import type {
  Channel,
  ChannelModerators,
  CommentInTree,
  GenericComment,
  MoreCommentsInTree,
  Post
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
  history: Object,
  postDeleteDialogVisible: boolean,
  commentDeleteDialogVisible: boolean,
  postReportDialogVisible: boolean,
  commentReportDialogVisible: boolean,
  notFound: boolean
}

const DIALOG_REMOVE_COMMENT = "DIALOG_REMOVE_COMMENT"

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

// if either postId or channelName don't match
const shouldLoadData = R.complement(
  R.allPass([R.eqProps("postID"), R.eqProps("channelName")])
)

class PostPage extends React.Component<*, void> {
  props: PostPageProps

  componentWillMount() {
    this.loadData()
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
    const { dispatch, channelName, postID, channel, moderators } = this.props
    if (!postID || !channelName) {
      // should not happen, this should be guaranteed by react-router
      throw Error("Match error")
    }

    try {
      await Promise.all([
        dispatch(actions.posts.get(postID)),
        dispatch(actions.comments.get(postID))
      ])
    } catch (_) {} // eslint-disable-line no-empty

    if (!channel) {
      dispatch(actions.channels.get(channelName))
    }
    if (!moderators) {
      dispatch(actions.channelModerators.get(channelName))
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

  removePost = async (post: Post) => {
    const { dispatch } = this.props
    await removePost(dispatch, post)
    dispatch(
      setSnackbarMessage({
        message: "Post has been removed"
      })
    )
  }

  approvePost = async (post: Post) => {
    const { dispatch } = this.props
    await approvePost(dispatch, post)
    dispatch(
      setSnackbarMessage({
        message: "Post has been approved"
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

  removeComment = async () => {
    const { dispatch, focusedComment } = this.props

    if (!focusedComment) {
      // we are getting double events for this, so this is a hack to avoid dispatching
      // a removeComment with a null comment
      return
    }

    await removeComment(dispatch, focusedComment)

    dispatch(
      setSnackbarMessage({
        message: "Comment has been removed"
      })
    )
  }

  approveComment = async (comment: CommentInTree) => {
    const { dispatch } = this.props

    await approveComment(dispatch, comment)

    dispatch(
      setSnackbarMessage({
        message: "Comment has been approved"
      })
    )
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
    const { dispatch, post, forms } = this.props
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
      showRemoveCommentDialog,
      isModerator,
      postDeleteDialogVisible,
      commentDeleteDialogVisible,
      postReportDialogVisible,
      commentReportDialogVisible,
      notFound
    } = this.props

    if (!channel) {
      return null
    }

    const reportForm = getReportForm(forms)

    return notFound
      ? <NotFound />
      : <div>
        <ChannelBreadcrumbs channel={channel} />
        <DocumentTitle title={formatTitle(post.title)} />
        <Dialog
          id="remove-comment-dialog"
          open={showRemoveCommentDialog}
          onAccept={this.removeComment}
          hideDialog={this.hideCommentDialog(DIALOG_REMOVE_COMMENT)}
          submitText="Yes, remove"
        >
          <p>
              Are you sure? You will still be able to see the comment, but it
              will be deleted for normal users. You can undo this later by
              clicking "approve".
          </p>
        </Dialog>
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
              approvePost={this.approvePost.bind(this)}
              removePost={this.removePost.bind(this)}
              forms={forms}
              beginEditing={beginEditing(dispatch)}
              showPostDeleteDialog={this.showPostDialog(DELETE_POST_DIALOG)}
              showPostReportDialog={this.showReportPostDialog}
            />
            <ReplyToPostForm
              forms={forms}
              post={post}
              processing={commentInFlight}
            />
          </div>
        </Card>
        <div className="comments-count">
          {formatCommentsCount(post)}
        </div>
        <CommentTree
          comments={commentsTree}
          forms={forms}
          upvote={this.upvote}
          downvote={this.downvote}
          approve={this.approveComment}
          remove={this.showCommentDialog(DIALOG_REMOVE_COMMENT)}
          deleteComment={this.showCommentDialog(DELETE_COMMENT_DIALOG)}
          reportComment={this.showReportCommentDialog}
          isModerator={isModerator}
          loadMoreComments={this.loadMoreComments}
          beginEditing={beginEditing(dispatch)}
          processing={commentInFlight}
        />
      </div>
  }
}

const mapStateToProps = (state, ownProps) => {
  const {
    posts,
    channels,
    comments,
    forms,
    channelModerators,
    ui,
    focus
  } = state
  const postID = getPostID(ownProps)
  const channelName = getChannelName(ownProps)
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
    ui,
    postID,
    channelName,
    forms,
    post,
    channel,
    commentsTree,
    moderators,
    loaded,
    notFound,
    focusedComment:             focus.comment,
    isModerator:                isModerator(moderators, SETTINGS.username),
    errored:                    anyErrorExcept404([posts, channels, comments]),
    subscribedChannels:         getSubscribedChannels(state),
    commentInFlight:            comments.processing,
    showRemoveCommentDialog:    ui.dialogs.has(DIALOG_REMOVE_COMMENT),
    postDeleteDialogVisible:    ui.dialogs.has(DELETE_POST_DIALOG),
    commentDeleteDialogVisible: ui.dialogs.has(DELETE_COMMENT_DIALOG),
    postReportDialogVisible:    ui.dialogs.has(REPORT_POST_DIALOG),
    commentReportDialogVisible: ui.dialogs.has(REPORT_COMMENT_DIALOG)
  }
}

export default R.compose(connect(mapStateToProps), withNavSidebar, withLoading)(
  PostPage
)

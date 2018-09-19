// @flow
/* global SETTINGS: false */
import React from "react"
import { connect } from "react-redux"
import R from "ramda"
import { Link } from "react-router-dom"
import qs from "query-string"
import { MetaTags } from "react-meta-tags"

import Card from "../components/Card"
import { withSpinnerLoading } from "../components/Loading"
import ExpandedPostDisplay from "../components/ExpandedPostDisplay"
import CommentTree from "../components/CommentTree"
import ReportForm from "../components/ReportForm"
import { ReplyToPostForm } from "../components/CommentForms"
import withSingleColumn from "../hoc/withSingleColumn"
import {
  withPostModeration,
  postModerationSelector
} from "../hoc/withPostModeration"
import {
  withCommentModeration,
  commentModerationSelector
} from "../hoc/withCommentModeration"
import { CommentSortPicker } from "../components/SortPicker"
import CanonicalLink from "../components/CanonicalLink"
import Dialog from "../components/Dialog"

import { updateCommentSortParam, COMMENT_SORT_BEST } from "../lib/sorting"
import {
  formatCommentsCount,
  getPostDropdownMenuKey,
  postMenuDropdownFuncs
} from "../lib/posts"
import { validateContentReportForm } from "../lib/validation"
import { actions } from "../actions"
import { clearCommentError, replaceMoreComments } from "../actions/comment"
import { setFocusedComment, clearFocusedComment } from "../actions/focus"
import { formBeginEdit, formEndEdit } from "../actions/forms"
import { setSnackbarMessage, showDialog, hideDialog } from "../actions/ui"
import {
  toggleUpvote,
  toggleFollowPost,
  toggleFollowComment
} from "../util/api_actions"
import { getChannelName, getPostID, getCommentID, truncate } from "../lib/util"
import {
  anyErrorExcept404,
  anyErrorExcept404or410,
  any404Error,
  anyNotAuthorizedErrorType
} from "../util/rest"
import { getSubscribedChannels } from "../lib/redux_selectors"
import { beginEditing } from "../components/CommentForms"
import { formatTitle } from "../lib/title"
import { channelURL, postDetailURL, commentPermalink } from "../lib/url"
import { clearPostError } from "../actions/post"
import { preventDefaultAndInvoke } from "../lib/util"
import {
  getReportForm,
  onReportUpdate,
  REPORT_CONTENT_NEW_FORM,
  REPORT_CONTENT_PAYLOAD
} from "../lib/reports"
import { ensureTwitterEmbedJS, handleTwitterWidgets } from "../lib/embed"
import { showDropdown, hideDropdownDebounced } from "../actions/ui"
import { withChannelTracker } from "../hoc/withChannelTracker"
import { dropdownMenuFuncs } from "../lib/ui"
import { getOwnProfile } from "../lib/redux_selectors"

import type { Dispatch } from "redux"
import type { Match, Location } from "react-router"
import type { FormsState } from "../flow/formTypes"
import type {
  Channel,
  CommentInTree,
  GenericComment,
  MoreCommentsInTree,
  Post,
  Profile
} from "../flow/discussionTypes"

type PostPageProps = {
  match: Match,
  dispatch: Dispatch<any>,
  post: Post,
  channel: Channel,
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
  approvePost: (p: Post) => void,
  removePost: (p: Post) => void,
  approveComment: (c: CommentInTree) => void,
  removeComment: (c: CommentInTree) => void,
  location: Location,
  reportPost: (p: Post) => void,
  embedly: Object,
  postShareMenuOpen: boolean,
  postDropdownMenuOpen: boolean,
  dropdownMenus: Set<string>,
  profile: Profile
}

const DELETE_POST_DIALOG = "DELETE_POST_DIALOG"
const DELETE_COMMENT_DIALOG = "DELETE_COMMENT_DIALOG"

const REPORT_POST_DIALOG = "REPORT_POST_DIALOG"
const REPORT_COMMENT_DIALOG = "REPORT_COMMENT_DIALOG"

const POST_SHARE_MENU_KEY = "POST_SHARE_MENU_KEY"

// if postId, channelName, or commentID don't match
const shouldLoadData = R.complement(
  R.allPass([
    R.eqProps("postID"),
    R.eqProps("channelName"),
    R.eqProps("commentID"),
    R.eqBy(R.path(["location", "search"]))
  ])
)

class PostPage extends React.Component<PostPageProps> {
  componentDidMount() {
    this.loadData()

    ensureTwitterEmbedJS()
  }

  componentWillUnmount() {
    const { dispatch, errored, notFound } = this.props

    if (errored || notFound) {
      dispatch(clearPostError())
      dispatch(clearCommentError())
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
    if (!postID || !channelName) {
      // should not happen, this should be guaranteed by react-router
      throw Error("Match error")
    }

    try {
      const [post] = await Promise.all([
        dispatch(actions.posts.get(postID)),
        dispatch(actions.comments.get(postID, commentID, qs.parse(search)))
      ])

      if (post.url) {
        const embedlyResponse = await dispatch(actions.embedly.get(post.url))
        handleTwitterWidgets(embedlyResponse)
      }

      if (!channel) {
        dispatch(actions.channels.get(channelName))
      }
    } catch (_) {} // eslint-disable-line no-empty
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

  showPostShareMenu = () => {
    const { dispatch } = this.props
    dispatch(showDropdown(POST_SHARE_MENU_KEY))
  }

  hidePostShareMenu = () => {
    const { dispatch } = this.props
    dispatch(hideDropdownDebounced(POST_SHARE_MENU_KEY))
  }

  renderCommentSectionHeader = () => {
    const {
      post,
      commentID,
      channel,
      location: { search }
    } = this.props

    if (commentID) {
      return (
        <Card className="comment-detail-card">
          <div>You are viewing a single comment's thread.</div>
          <Link to={postDetailURL(channel.name, post.id, post.slug)}>
            View the rest of the comments
          </Link>
        </Card>
      )
    }
    if (post.num_comments > 0) {
      return (
        <div className="count-and-sort">
          <div className="comments-count">{formatCommentsCount(post)}</div>
          <CommentSortPicker
            updateSortParam={updateCommentSortParam(this.props)}
            value={qs.parse(search).sort || COMMENT_SORT_BEST}
          />
        </div>
      )
    }
    return null
  }

  render() {
    const {
      dispatch,
      match,
      post,
      channel,
      commentsTree,
      forms,
      commentInFlight,
      isModerator,
      postDeleteDialogVisible,
      commentDeleteDialogVisible,
      commentReportDialogVisible,
      commentID,
      removePost,
      approvePost,
      removeComment,
      approveComment,
      embedly,
      reportPost,
      postDropdownMenuOpen,
      postShareMenuOpen,
      dropdownMenus,
      profile
    } = this.props

    if (!channel) {
      return null
    }

    const { showPostMenu, hidePostMenu } = postMenuDropdownFuncs(dispatch, post)

    const reportForm = getReportForm(forms)
    const showPermalinkUI = R.not(R.isNil(commentID))

    return (
      <div>
        <MetaTags>
          <title>{formatTitle(post.title)}</title>
          <CanonicalLink match={match} />
          <meta name="description" content={truncate(post.text, 300)} />
        </MetaTags>
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
          open={commentReportDialogVisible}
          hideDialog={this.hideReportCommentDialog}
          onCancel={this.hideReportCommentDialog}
          onAccept={this.reportComment}
          validateOnClick={true}
          title="Report Comment"
          submitText="Yes, Report"
          id="report-comment-dialog"
        >
          {reportForm ? (
            <ReportForm
              reportForm={reportForm.value}
              validation={reportForm.errors}
              onUpdate={onReportUpdate(dispatch)}
              description="Are you sure you want to report this comment for violating the rules of MIT Open Discussions?"
              label="Why are you reporting this comment?"
            />
          ) : null}
        </Dialog>
        <Card className="post-card">
          <div className="post-card-inner">
            <ExpandedPostDisplay
              post={post}
              isModerator={isModerator}
              toggleUpvote={toggleUpvote(dispatch)}
              approvePost={approvePost.bind(this)}
              removePost={removePost.bind(this)}
              forms={forms}
              beginEditing={beginEditing(dispatch)}
              showPostDeleteDialog={this.showPostDialog(DELETE_POST_DIALOG)}
              showPostReportDialog={preventDefaultAndInvoke(() =>
                reportPost(post)
              )}
              showPermalinkUI={showPermalinkUI}
              toggleFollowPost={toggleFollowPost(dispatch)}
              embedly={embedly}
              postDropdownMenuOpen={postDropdownMenuOpen}
              showPostMenu={showPostMenu}
              hidePostMenu={hidePostMenu}
              showPostShareMenu={this.showPostShareMenu}
              hidePostShareMenu={this.hidePostShareMenu}
              postShareMenuOpen={postShareMenuOpen}
              channel={channel}
            />
          </div>
        </Card>
        {showPermalinkUI ? null : (
          <ReplyToPostForm
            forms={forms}
            post={post}
            processing={commentInFlight}
            profile={profile}
          />
        )}
        {this.renderCommentSectionHeader()}
        {commentsTree.length > 0 ? (
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
            commentPermalink={commentPermalink(
              channel.name,
              post.id,
              post.slug
            )}
            toggleFollowComment={toggleFollowComment(dispatch)}
            curriedDropdownMenufunc={dropdownMenuFuncs(dispatch)}
            dropdownMenus={dropdownMenus}
          />
        ) : null}
      </div>
    )
  }
}

const mapStateToProps = (state, ownProps) => {
  const { posts, channels, comments, forms, ui, embedly } = state
  const postID = getPostID(ownProps)
  const channelName = getChannelName(ownProps)
  const commentID = getCommentID(ownProps)
  const post = posts.data.get(postID)
  const channel = channels.data.get(channelName)
  const commentsTree = comments.data.get(postID)
  const embedlyResponse =
    post && post.url ? embedly.data.get(post.url) : undefined

  const notFound = any404Error([posts, comments, channels])
  const notAuthorized = anyNotAuthorizedErrorType([posts, comments])

  const loaded = notFound
    ? true
    : R.none(R.isNil, [post, channel, commentsTree])

  const postDropdownMenuOpen = post
    ? ui.dropdownMenus.has(getPostDropdownMenuKey(post))
    : false

  const { dropdownMenus } = ui

  const postShareMenuOpen = ui.dropdownMenus.has(POST_SHARE_MENU_KEY)

  return {
    ...postModerationSelector(state, ownProps),
    ...commentModerationSelector(state, ownProps),
    postID,
    channelName,
    commentID,
    forms,
    post,
    channel,
    commentsTree,
    loaded,
    notFound,
    notAuthorized,
    postDropdownMenuOpen,
    postShareMenuOpen,
    dropdownMenus,
    profile:     getOwnProfile(state),
    isModerator: channel && channel.user_is_moderator,
    errored:
      anyErrorExcept404([posts, channels]) ||
      anyErrorExcept404or410([comments]),
    subscribedChannels:         getSubscribedChannels(state),
    commentInFlight:            comments.processing,
    postDeleteDialogVisible:    ui.dialogs.has(DELETE_POST_DIALOG),
    commentDeleteDialogVisible: ui.dialogs.has(DELETE_COMMENT_DIALOG),
    postReportDialogVisible:    ui.dialogs.has(REPORT_POST_DIALOG),
    commentReportDialogVisible: ui.dialogs.has(REPORT_COMMENT_DIALOG),
    embedly:                    embedlyResponse
  }
}

export default R.compose(
  connect(mapStateToProps),
  withPostModeration,
  withCommentModeration,
  withSingleColumn("post-page"),
  withChannelTracker,
  withSpinnerLoading
)(PostPage)

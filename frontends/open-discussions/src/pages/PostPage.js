// @flow
/* global SETTINGS: false */
import React from "react"
import { connect } from "react-redux"
import R from "ramda"
import { Link } from "react-router-dom"
import qs from "query-string"

import Card from "../components/Card"
import MetaTags from "../components/MetaTags"
import { withSpinnerLoading } from "../components/Loading"
import ExpandedPostDisplay from "../components/ExpandedPostDisplay"
import CommentTree from "../components/CommentTree"
import CommentForm from "../components/CommentForm"
import withSingleColumn from "../hoc/withSingleColumn"
import { withPostDetailSidebar } from "../hoc/withSidebar"
import {
  withPostModeration,
  postModerationSelector
} from "../hoc/withPostModeration"
import { CommentSortPicker } from "../components/Picker"
import Dialog from "../components/Dialog"

import { updateCommentSortParam, COMMENT_SORT_BEST } from "../lib/picker"
import {
  formatCommentsCount,
  getPostDropdownMenuKey,
  postMenuDropdownFuncs
} from "../lib/posts"
import { actions } from "../actions"
import { clearCommentError, replaceMoreComments } from "../actions/comment"
import { setSnackbarMessage, showDialog, hideDialog } from "../actions/ui"
import { toggleFollowPost } from "../util/api_actions"
import { getPostID, getCommentID, truncate } from "../lib/util"
import {
  anyErrorExcept404,
  anyErrorExcept404or410or500,
  any404Error,
  anyNotAuthorizedErrorType
} from "../util/rest"
import { getSubscribedChannels } from "../lib/redux_selectors"
import { beginEditing } from "../components/EditPostForm"
import { isPrivate } from "../lib/channels"
import { formatTitle } from "../lib/title"
import { channelURL, postDetailURL, commentPermalink } from "../lib/url"
import { clearPostError } from "../actions/post"
import { preventDefaultAndInvoke } from "../lib/util"
import { ensureTwitterEmbedJS, handleTwitterWidgets } from "../lib/embed"
import { withChannelTracker } from "../hoc/withChannelTracker"
import { getOwnProfile } from "../lib/redux_selectors"

import type { Dispatch } from "redux"
import type { Location } from "react-router"
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

// if postId, channelName, or commentID don't match
const shouldLoadData = R.complement(
  R.allPass([
    R.eqProps("postID"),
    R.eqProps("channelName"),
    R.eqProps("commentID"),
    R.eqBy(R.path(["location", "search"]))
  ])
)

export class PostPage extends React.Component<PostPageProps> {
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

  componentDidUpdate(prevProps: PostPageProps) {
    if (shouldLoadData(prevProps, this.props)) {
      this.loadData()
    }
  }

  loadData = async () => {
    const {
      dispatch,
      channelName,
      postID,
      commentID,
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
    } catch (_) {} // eslint-disable-line no-empty
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

  downvote = async (comment: CommentInTree) => {
    const { dispatch } = this.props
    await dispatch(
      actions.comments.patch(comment.id, {
        downvoted: !comment.downvoted
      })
    )
  }

  upvote = async (comment: CommentInTree) => {
    const { dispatch } = this.props
    await dispatch(
      actions.comments.patch(comment.id, {
        upvoted: !comment.upvoted
      })
    )
  }

  showPostDialog = (dialogKey: string) => () => {
    const { dispatch } = this.props
    dispatch(showDialog(dialogKey))
  }

  hidePostDialog = (dialogKey: string) => () => {
    const { dispatch } = this.props
    dispatch(hideDialog(dialogKey))
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
            updatePickerParam={updateCommentSortParam(this.props)}
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
      post,
      channel,
      commentsTree,
      forms,
      commentInFlight,
      isModerator,
      postDeleteDialogVisible,
      commentID,
      removePost,
      approvePost,
      embedly,
      reportPost,
      postDropdownMenuOpen,
      profile
    } = this.props

    if (!channel) {
      return null
    }

    const { showPostMenu, hidePostMenu } = postMenuDropdownFuncs(dispatch, post)

    const showPermalinkUI = R.not(R.isNil(commentID))
    const hidePostDialog = this.hidePostDialog(DELETE_POST_DIALOG)
    const relativeUrl = commentID
      ? commentPermalink(channel.name, post.id, post.slug, commentID)
      : postDetailURL(channel.name, post.id, post.slug)

    return (
      <div>
        <MetaTags canonicalLink={relativeUrl}>
          <title>{formatTitle(post.title)}</title>
          <meta name="description" content={truncate(post.text, 300)} />
        </MetaTags>
        <Card className="post-card">
          <div className="post-card-inner">
            <ExpandedPostDisplay
              post={post}
              isModerator={isModerator}
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
              channel={channel}
            />
          </div>
        </Card>
        {showPermalinkUI ? null : <CommentForm post={post} profile={profile} />}
        {this.renderCommentSectionHeader()}
        {commentsTree.length > 0 ? (
          <CommentTree
            comments={commentsTree}
            isPrivateChannel={isPrivate(channel)}
            isModerator={isModerator}
            loadMoreComments={this.loadMoreComments}
            processing={commentInFlight}
            post={post}
            commentPermalink={commentPermalink(
              channel.name,
              post.id,
              post.slug
            )}
          />
        ) : null}
        <Dialog
          open={postDeleteDialogVisible}
          hideDialog={hidePostDialog}
          onAccept={async () => {
            await this.deletePost(post)
            hidePostDialog()
          }}
          title="Delete Post"
          submitText="Yes, Delete"
        >
          Are you sure you want to delete this post?
        </Dialog>
      </div>
    )
  }
}

const mapStateToProps = (state, ownProps) => {
  const { posts, channels, comments, forms, ui, embedly } = state
  const postID = getPostID(ownProps)
  const { channelName } = ownProps
  const commentID = getCommentID(ownProps)
  const post = posts.data.get(postID)
  const channel = channels.data.get(channelName)
  const commentsTree = comments.data.get(postID)
  // $FlowFixMe
  const embedlyResponse = embedly?.data?.get(post?.url)

  const notFound = any404Error([posts, comments, channels])
  const notAuthorized = anyNotAuthorizedErrorType([posts, comments])

  const loaded = notFound
    ? true
    : R.none(R.isNil, [post, channel, commentsTree])

  const postDropdownMenuOpen = post
    ? ui.dropdownMenus.has(getPostDropdownMenuKey(post))
    : false

  return {
    ...postModerationSelector(state, ownProps),
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
    profile:     getOwnProfile(state),
    isModerator: channel?.user_is_moderator ?? false, // eslint-disable-line camelcase
    errored:
      anyErrorExcept404([posts, channels]) ||
      anyErrorExcept404or410or500([comments]),
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
  SETTINGS.allow_related_posts_ui
    ? withPostDetailSidebar("post-page")
    : withSingleColumn("post-page"),
  withChannelTracker,
  withSpinnerLoading
)(PostPage)

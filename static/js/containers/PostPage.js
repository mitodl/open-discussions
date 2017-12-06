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
import { ReplyToPostForm } from "../components/CommentForms"
import withNavSidebar from "../hoc/withNavSidebar"

import { formatCommentsCount } from "../lib/posts"
import { actions } from "../actions"
import { replaceMoreComments } from "../actions/comment"
import {
  setModeratingComment,
  clearModeratingComment
} from "../actions/moderation"
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
import { anyError } from "../util/rest"
import { getSubscribedChannels } from "../lib/redux_selectors"
import { beginEditing } from "../components/CommentForms"
import { formatTitle } from "../lib/title"

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
  commentToRemove: ?CommentInTree,
  showRemoveCommentDialog: boolean,
  commentsTree: Array<GenericComment>,
  forms: FormsState,
  commentInFlight: boolean,
  // from the router match
  channelName: string,
  postID: string
}

const DIALOG_REMOVE_COMMENT = "DIALOG_REMOVE_COMMENT"

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

  loadData = () => {
    const { dispatch, channelName, postID, channel, moderators } = this.props
    if (!postID || !channelName) {
      // should not happen, this should be guaranteed by react-router
      throw Error("Match error")
    }

    dispatch(actions.posts.get(postID))
    dispatch(actions.comments.get(postID))
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

  showRemoveCommentDialog = (comment: CommentInTree) => {
    const { dispatch } = this.props
    dispatch(setModeratingComment(comment))
    dispatch(showDialog(DIALOG_REMOVE_COMMENT))
  }

  hideRemoveCommentDialog = () => {
    const { dispatch } = this.props
    dispatch(clearModeratingComment())
    dispatch(hideDialog(DIALOG_REMOVE_COMMENT))
  }

  removeComment = async () => {
    const { dispatch, commentToRemove } = this.props

    if (!commentToRemove) {
      // we are getting double events for this, so this is a hack to avoid dispatching
      // a removeComment with a null comment
      return
    }

    await removeComment(dispatch, commentToRemove)

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

  render() {
    const {
      dispatch,
      post,
      channel,
      commentsTree,
      forms,
      commentInFlight,
      showRemoveCommentDialog,
      isModerator
    } = this.props
    if (!channel || !post || !commentsTree) {
      return null
    }

    return (
      <div>
        <ChannelBreadcrumbs channel={channel} />
        <DocumentTitle title={formatTitle(post.title)} />
        <Dialog
          id="remove-comment-dialog"
          open={showRemoveCommentDialog}
          onAccept={this.removeComment}
          hideDialog={this.hideRemoveCommentDialog}
          submitText="Yes, remove"
        >
          <p>
            Are you sure? You will still be able to see the comment, but it will
            be deleted for normal users. You can undo this later by clicking
            "approve".
          </p>
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
          remove={this.showRemoveCommentDialog}
          isModerator={isModerator}
          loadMoreComments={this.loadMoreComments}
          beginEditing={beginEditing(dispatch)}
          processing={commentInFlight}
        />
      </div>
    )
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
    moderation
  } = state
  const postID = getPostID(ownProps)
  const channelName = getChannelName(ownProps)
  const post = posts.data.get(postID)
  const channel = channels.data.get(channelName)
  const commentsTree = comments.data.get(postID)
  const moderators = channelModerators.data.get(channelName)
  return {
    ui,
    postID,
    channelName,
    forms,
    post,
    channel,
    commentsTree,
    moderators,
    commentToRemove:         moderation.comment,
    isModerator:             isModerator(moderators, SETTINGS.username),
    loaded:                  R.none(R.isNil, [post, channel, commentsTree]),
    errored:                 anyError([posts, channels, comments]),
    subscribedChannels:      getSubscribedChannels(state),
    commentInFlight:         comments.processing,
    showRemoveCommentDialog: ui.dialogs.has(DIALOG_REMOVE_COMMENT)
  }
}

export default R.compose(connect(mapStateToProps), withNavSidebar, withLoading)(
  PostPage
)

// @flow
import React from "react"
import { connect } from "react-redux"
import R from "ramda"
import DocumentTitle from "react-document-title"

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
import { toggleUpvote } from "../util/api_actions"
import { getChannelName, getPostID } from "../lib/util"
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
  commentsTree: Array<GenericComment>,
  forms: FormsState,
  commentInFlight: boolean,
  // from the router match
  channelName: string,
  postID: string
}

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

    Promise.all([
      dispatch(actions.posts.get(postID)),
      dispatch(actions.comments.get(postID)),
      channel || dispatch(actions.channels.get(channelName)),
      moderators || dispatch(actions.channelModerators.get(channelName))
    ])
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

  render() {
    const {
      dispatch,
      post,
      channel,
      commentsTree,
      forms,
      commentInFlight
    } = this.props
    if (!channel || !post || !commentsTree) {
      return null
    }

    return (
      <div>
        <ChannelBreadcrumbs channel={channel} />
        <DocumentTitle title={formatTitle(post.title)} />
        <Card>
          <div className="post-card">
            <ExpandedPostDisplay
              post={post}
              toggleUpvote={toggleUpvote(dispatch)}
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
          loadMoreComments={this.loadMoreComments}
          beginEditing={beginEditing(dispatch)}
          processing={commentInFlight}
        />
      </div>
    )
  }
}

const mapStateToProps = (state, ownProps) => {
  const { posts, channels, comments, forms, channelModerators } = state
  const postID = getPostID(ownProps)
  const channelName = getChannelName(ownProps)
  const post = posts.data.get(postID)
  const channel = channels.data.get(channelName)
  const commentsTree = comments.data.get(postID)
  const moderators = channelModerators.data.get(channelName)
  return {
    postID,
    channelName,
    forms,
    post,
    channel,
    commentsTree,
    moderators,
    loaded:             R.none(R.isNil, [post, channel, commentsTree]),
    errored:            anyError([posts, channels, comments]),
    subscribedChannels: getSubscribedChannels(state),
    commentInFlight:    comments.processing
  }
}

export default R.compose(connect(mapStateToProps), withNavSidebar, withLoading)(
  PostPage
)

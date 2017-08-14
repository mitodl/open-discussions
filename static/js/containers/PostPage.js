// @flow
import React from "react"
import { connect } from "react-redux"
import R from "ramda"

import Card from "../components/Card"
import withLoading from "../components/Loading"
import ChannelBreadcrumbs from "../components/ChannelBreadcrumbs"
import PostDisplay from "../components/PostDisplay"
import CommentTree from "../components/CommentTree"
import { ReplyToPostForm } from "../components/CreateCommentForm"

import { actions } from "../actions"
import { toggleUpvote } from "../util/api_actions"
import { getChannelName, getPostID } from "../lib/util"
import { anyError } from "../util/rest"

import type { Dispatch } from "redux"
import type { Match } from "react-router"
import type { FormsState } from "../flow/formTypes"
import type { Channel, Comment, Post } from "../flow/discussionTypes"

type PostPageProps = {
  match: Match,
  dispatch: Dispatch,
  post: Post,
  channel: Channel,
  commentsTree: Array<Comment>,
  forms: FormsState,
  // from the router match
  channelName: string,
  postID: string
}

// if either postId or channelName don't match
const shouldLoadData = R.complement(R.allPass([R.eqProps("postID"), R.eqProps("channelName")]))

class PostPage extends React.Component {
  props: PostPageProps

  componentWillMount() {
    this.loadData()
  }

  componentDidUpdate(prevProps) {
    if (shouldLoadData(prevProps, this.props)) {
      this.loadData()
    }
  }

  downvote = async (comment: Comment) => {
    const { dispatch } = this.props
    await dispatch(
      actions.comments.patch(comment.id, {
        downvoted: !comment.downvoted
      })
    )
  }

  loadData = () => {
    const { dispatch, channelName, postID, channel } = this.props
    if (!postID || !channelName) {
      // should not happen, this should be guaranteed by react-router
      throw Error("Match error")
    }

    Promise.all([
      dispatch(actions.posts.get(postID)),
      dispatch(actions.comments.get(postID)),
      channel || dispatch(actions.channels.get(channelName))
    ])
  }

  upvote = async (comment: Comment) => {
    const { dispatch } = this.props
    await dispatch(
      actions.comments.patch(comment.id, {
        upvoted: !comment.upvoted
      })
    )
  }

  render() {
    const { dispatch, post, channel, commentsTree, forms } = this.props
    if (!channel || !post || !commentsTree) {
      return null
    }
    return (
      <div className="double-column">
        <ChannelBreadcrumbs channel={channel} />
        <div className="first-column">
          <Card>
            <PostDisplay post={post} toggleUpvote={toggleUpvote(dispatch)} expanded />
            <ReplyToPostForm forms={forms} post={post} />
          </Card>
          <CommentTree comments={commentsTree} forms={forms} upvote={this.upvote} downvote={this.downvote} />
        </div>
      </div>
    )
  }
}

const mapStateToProps = (state, ownProps) => {
  const { posts, channels, comments, forms } = state
  const postID = getPostID(ownProps)
  const channelName = getChannelName(ownProps)
  const post = posts.data.get(postID)
  const channel = channels.data.get(channelName)
  const commentsTree = comments.data.get(postID)
  return {
    postID,
    channelName,
    forms,
    post,
    channel,
    commentsTree,
    loaded:  R.none(R.isNil, [post, channel, commentsTree]),
    errored: anyError([posts, channels, comments])
  }
}

export default R.compose(connect(mapStateToProps), withLoading)(PostPage)

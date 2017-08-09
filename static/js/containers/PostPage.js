// @flow
import React from "react"
import { connect } from "react-redux"
import R from "ramda"

import Card from "../components/Card"
import Loading from "../components/Loading"
import ChannelBreadcrumbs from "../components/ChannelBreadcrumbs"
import PostDisplay from "../components/PostDisplay"
import CommentTree from "../components/CommentTree"
import { ReplyToPostForm } from "../components/CreateCommentForm"

import { actions } from "../actions"
import { toggleUpvote } from "../util/api_actions"
import { anyProcessing, allLoaded } from "../util/rest"

import type { Dispatch } from "redux"
import type { Match } from "react-router"
import type { FormsState } from "../flow/formTypes"
import type { Channel, Comment, Post } from "../flow/discussionTypes"
import type { RestState } from "../flow/restTypes"

class PostPage extends React.Component {
  props: {
    match: Match,
    dispatch: Dispatch,
    posts: RestState<Map<string, Post>>,
    channels: RestState<Map<string, Channel>>,
    comments: RestState<Map<string, Array<Comment>>>,
    forms: FormsState
  }

  getMatchParams = () => {
    const { match: { params } } = this.props
    return [params.postID, params.channelName]
  }

  updateRequirements = () => {
    const { dispatch, channels, posts, comments } = this.props
    const [postID, channelName] = this.getMatchParams()

    if (!postID || !channelName) {
      // should not happen, this should be guaranteed by react-router
      throw "Match error"
    }

    if (!posts.data || (R.isNil(posts.data.get(postID)) && R.isNil(posts.error))) {
      dispatch(actions.posts.get(postID))
    }
    if (!comments.data || (R.isNil(comments.data.get(postID)) && R.isNil(comments.error))) {
      dispatch(actions.comments.get(postID))
    }
    if (!channels.data || (R.isNil(channels.data.get(channelName)) && R.isNil(channels.error))) {
      dispatch(actions.channels.get(channelName))
    }
  }

  componentWillMount() {
    this.updateRequirements()
  }

  componentDidUpdate() {
    const { channels, posts, comments } = this.props
    let restStates = [channels, posts, comments]

    if (!anyProcessing(restStates) || allLoaded(restStates)) {
      this.updateRequirements()
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

  upvote = async (comment: Comment) => {
    const { dispatch } = this.props
    await dispatch(
      actions.comments.patch(comment.id, {
        upvoted: !comment.upvoted
      })
    )
  }

  renderContents = () => {
    const { posts, channels, comments, forms, dispatch } = this.props
    const [postId, channelName] = this.getMatchParams()
    // $FlowFixMe: undefined check should already be done
    const post = posts.data.get(postId)
    // $FlowFixMe: undefined check should already be done
    const channel = channels.data.get(channelName)
    // $FlowFixMe: undefined check should already be done
    const commentTreeData = comments.data.get(postId)

    if (!channel || !post || !commentTreeData) {
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
          <CommentTree
            comments={commentTreeData} forms={forms} upvote={this.upvote} downvote={this.downvote} />
        </div>
      </div>
    )
  }

  render() {
    const { posts, channels } = this.props
    return <Loading restStates={[posts, channels]} renderContents={this.renderContents} />
  }
}

const mapStateToProps = state => ({
  posts:    state.posts,
  channels: state.channels,
  comments: state.comments,
  forms:    state.forms
})

export default connect(mapStateToProps)(PostPage)

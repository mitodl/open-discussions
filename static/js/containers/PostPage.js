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

class PostPage extends React.Component {
  props: {
    match: Match,
    dispatch: Dispatch,
    posts: Object,
    channels: Object,
    comments: Object,
    forms: FormsState
  }

  getMatchParams = () => {
    const { match: { params } } = this.props
    return [params.postID, params.channelName]
  }

  updateRequirements = () => {
    const { dispatch, channels, posts, comments } = this.props
    const [postID, channelName] = this.getMatchParams()

    if (R.isNil(posts.data.get(postID)) && R.isNil(posts.error)) {
      dispatch(actions.posts.get(postID))
    }
    if (R.isNil(comments.data.get(postID)) && R.isNil(comments.error)) {
      dispatch(actions.comments.get(postID))
    }
    if (R.isNil(channels.data.get(channelName)) && R.isNil(channels.error)) {
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

  renderContents = () => {
    const { posts, channels, comments, forms, dispatch } = this.props
    const [postId, channelName] = this.getMatchParams()
    const post = posts.data.get(postId)
    const channel = channels.data.get(channelName)
    const commentTreeData = comments.data.get(postId)

    if (R.isNil(channel) || R.isNil(post) || R.isNil(commentTreeData)) {
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
          <CommentTree comments={commentTreeData} forms={forms} />
        </div>
      </div>
    )
  }

  render() {
    const { posts, channels, comments } = this.props
    return <Loading restStates={[posts, channels, comments]} renderContents={this.renderContents} />
  }
}

const mapStateToProps = state => ({
  posts:    state.posts,
  channels: state.channels,
  comments: state.comments,
  forms:    state.forms
})

export default connect(mapStateToProps)(PostPage)

// @flow
import React from "react"
import { connect } from "react-redux"
import R from "ramda"

import Card from "../components/Card"
import Loading from "../components/Loading"
import ChannelBreadcrumbs from "../components/ChannelBreadcrumbs"
import PostDisplay from "../components/PostDisplay"
import CommentTree from "../components/CommentTree"
import CommentEditForm from "../components/CommentEditForm"

import { actions } from "../actions"
import { anyProcessing, allLoaded } from "../util/rest"

import type { Dispatch } from "redux"
import type { Match } from "react-router"

class PostPage extends React.Component {
  props: {
    match: Match,
    dispatch: Dispatch,
    posts: Object,
    channels: Object,
    comments: Object
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

  onCommentUpdate = (e) => {

  }

  onCommentSubmit = () => {
    const { commentForm } = this.props;
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

  renderContents(postID, posts, channelName, channels, comments) {
    const post = posts.get(postID)
    const channel = channels.get(channelName)
    const commentTreeData = comments.get(postID)

    if (R.isNil(channel) || R.isNil(post) || R.isNil(commentTreeData)) {
      return null
    }
    return (
      <div className="double-column">
        <ChannelBreadcrumbs channel={channel} />
        <div className="first-column">
          <Card>
            <PostDisplay post={post} expanded />
          </Card>
          <Card>
            <CommentEditForm
              post={post}
              form={commentForm}
              onUpdate={this.onCommentUpdate}
              onSubmit={this.onCommentSubmit}
            />
          </Card>
          <CommentTree comments={commentTreeData} />
        </div>
      </div>
    )
  }

  render() {
    const { posts, channels, comments } = this.props
    const [postId, channelName] = this.getMatchParams()

    return (
      <Loading
        restStates={[posts, channels, comments]}
        renderContents={() => this.renderContents(postId, posts.data, channelName, channels.data, comments.data)}
      />
    )
  }
}

const mapStateToProps = state => ({
  posts:    state.posts,
  channels: state.channels,
  comments: state.comments
})

export default connect(mapStateToProps)(PostPage)

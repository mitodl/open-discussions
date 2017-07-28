// @flow
import React from "react"
import { connect } from "react-redux"
import R from "ramda"

import CreatePostForm from "../components/CreatePostForm"
import { actions } from "../actions"
import { postDetailURL } from "../lib/url"
import { getChannelName } from "../lib/util"

import type { FormValue } from "../flow/formTypes"
import type { Channel, CreatePostPayload } from "../flow/discussionTypes"
import type { RestState } from "../flow/restTypes"
import type { Dispatch } from "redux"
import type { Match } from "react-router"

type CreatePostPageProps = {
  match: Match,
  dispatch: Dispatch,
  postForm: FormValue,
  channel: Channel,
  channels: RestState<Array<Channel>>,
  history: Object
}

class CreatePostPage extends React.Component {
  props: CreatePostPageProps

  componentWillMount() {
    const { dispatch, channels } = this.props
    const channelName = getChannelName(this.props)
    if (!channels.loaded && !channels.processing) {
      dispatch(actions.channels.get(channelName))
    }
    dispatch(actions.forms.post.create())
  }

  onUpdate = (e: Object) => {
    const { dispatch } = this.props
    dispatch(
      actions.forms.post.update({
        [e.target.name]: e.target.value
      })
    )
  }

  updateIsText = (isText: boolean) => {
    const { dispatch } = this.props
    dispatch(
      actions.forms.post.update({
        isText
      })
    )
  }

  onSubmit = (e: Object) => {
    const { dispatch, history, postForm, channel } = this.props

    e.preventDefault()

    if (!postForm.value || !channel) {
      return
    }

    const channelName = channel.name
    const { isText, title, url, text } = postForm.value
    const data: CreatePostPayload = isText ? { title, text } : { title, url }
    dispatch(actions.posts.post(channelName, data)).then(post => {
      history.push(postDetailURL(channelName, post.id))
    })
  }

  render() {
    const { channel, postForm, history } = this.props

    if (R.isNil(channel)) {
      return null
    }

    return (
      <CreatePostForm
        onSubmit={this.onSubmit}
        onUpdate={this.onUpdate}
        updateIsText={this.updateIsText}
        postForm={postForm.value}
        channel={channel}
        history={history}
      />
    )
  }
}

const mapStateToProps = (state, props) => {
  const channelName = getChannelName(props)
  const channels = state.channels
  const channel = channels.data.get(channelName)

  return {
    channel:  channel,
    channels: channels,
    postForm: state.postForm
  }
}

export default connect(mapStateToProps)(CreatePostPage)

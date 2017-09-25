// @flow
import React from "react"
import { connect } from "react-redux"
import R from "ramda"

import CreatePostForm from "../components/CreatePostForm"

import { actions } from "../actions"
import { newPostForm } from "../lib/posts"
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
  postForm: ?FormValue,
  channel: Channel,
  channels: RestState<Map<string, Channel>>,
  history: Object,
  processing: boolean
}

const CREATE_POST_KEY = "post:new"
const CREATE_POST_PAYLOAD = { formKey: CREATE_POST_KEY }
const getForm = R.prop(CREATE_POST_KEY)

class CreatePostPage extends React.Component {
  props: CreatePostPageProps

  componentWillMount() {
    const { dispatch, channels } = this.props
    const channelName = getChannelName(this.props)
    if (!channels.loaded && !channels.processing && channelName) {
      dispatch(actions.channels.get(channelName))
    }
    dispatch(
      actions.forms.formBeginEdit({
        ...CREATE_POST_PAYLOAD,
        value: newPostForm()
      })
    )
  }

  componentWillUnmount() {
    const { dispatch } = this.props
    dispatch(actions.forms.formEndEdit(CREATE_POST_PAYLOAD))
  }

  onUpdate = (e: Object) => {
    const { dispatch } = this.props
    dispatch(
      actions.forms.formUpdate({
        ...CREATE_POST_PAYLOAD,
        value: {
          [e.target.name]: e.target.value
        }
      })
    )
  }

  updateIsText = (isText: boolean) => {
    const { dispatch } = this.props
    dispatch(
      actions.forms.formUpdate({
        ...CREATE_POST_PAYLOAD,
        value: { isText }
      })
    )
  }

  onSubmit = (e: Object) => {
    const { dispatch, history, postForm, channel } = this.props

    e.preventDefault()

    if (!postForm || !channel) {
      return
    }

    const channelName = channel.name
    const { isText, title, url, text } = postForm.value
    const data: CreatePostPayload = isText ? { title, text } : { title, url }
    dispatch(actions.posts.post(channelName, data)).then(post => {
      history.push(postDetailURL(channelName, post.id))
    })
  }

  updateChannelSelection = (e: Object) => {
    const { history } = this.props

    e.preventDefault()
    if (e.target.value) {
      history.push(e.target.value)
    }
  }

  render() {
    const { channel, channels, postForm, history, processing } = this.props

    if (!postForm) {
      return null
    }

    return (
      <div className="content">
        <div className="main-content">
          <CreatePostForm
            onSubmit={this.onSubmit}
            onUpdate={this.onUpdate}
            updateIsText={this.updateIsText}
            updateChannelSelection={this.updateChannelSelection}
            postForm={postForm.value}
            channel={channel}
            history={history}
            processing={processing}
            channels={channels.data}
          />
        </div>
      </div>
    )
  }
}

const mapStateToProps = (state, props) => {
  const channelName = getChannelName(props)
  const channels = state.channels
  const channel = channels.data.get(channelName)
  const processing = state.posts.processing

  return {
    postForm: getForm(state.forms),
    channel,
    channels,
    processing
  }
}

export default connect(mapStateToProps)(CreatePostPage)

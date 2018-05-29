// @flow
import React from "react"
import { connect } from "react-redux"
import R from "ramda"
import DocumentTitle from "react-document-title"

import CreatePostForm from "../components/CreatePostForm"

import { actions } from "../actions"
import { newPostForm } from "../lib/posts"
import { postDetailURL } from "../lib/url"
import { getChannelName } from "../lib/util"
import { formatTitle } from "../lib/title"
import { validatePostCreateForm } from "../lib/validation"
import { ensureTwitterEmbedJS, handleTwitterWidgets } from "../lib/embed"

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
  processing: boolean,
  embedly: Object
}

const CREATE_POST_KEY = "post:new"
const CREATE_POST_PAYLOAD = { formKey: CREATE_POST_KEY }
const getForm = R.prop(CREATE_POST_KEY)

class CreatePostPage extends React.Component<*, void> {
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
    ensureTwitterEmbedJS()
  }

  componentWillUnmount() {
    const { dispatch } = this.props
    dispatch(actions.forms.formEndEdit(CREATE_POST_PAYLOAD))
  }

  onUpdate = async (e: Object) => {
    const { dispatch } = this.props
    const { name, value } = e.target

    dispatch(
      actions.forms.formUpdate({
        ...CREATE_POST_PAYLOAD,
        value: {
          [name]: value
        }
      })
    )
    if (name === "url" && value !== "") {
      const embedlyGetFunc = actions.embedly.get(value)
      embedlyGetFunc.meta = {
        debounce: {
          time: 1000,
          key:  actions.embedly.get.requestType
        }
      }
      const embedlyResponse = await dispatch(embedlyGetFunc)
      handleTwitterWidgets(embedlyResponse)
    }
  }

  updateIsText = (isText: boolean) => {
    const { dispatch } = this.props
    dispatch(
      actions.forms.formUpdate({
        ...CREATE_POST_PAYLOAD,
        value: { isText }
      })
    )

    dispatch(
      actions.forms.formValidate({
        ...CREATE_POST_PAYLOAD,
        errors: {}
      })
    )
  }

  onSubmit = (e: Object) => {
    const { dispatch, history, postForm, channel } = this.props

    e.preventDefault()

    const validation = R.isNil(channel)
      ? R.set(
        R.lensPath(["value", "channel"]),
        "You need to select a channel",
        validatePostCreateForm(postForm)
      )
      : validatePostCreateForm(postForm)

    if (!postForm || !R.isEmpty(validation)) {
      dispatch(
        actions.forms.formValidate({
          ...CREATE_POST_PAYLOAD,
          errors: validation.value
        })
      )
    } else {
      const channelName = channel.name
      const { isText, title, url, text } = postForm.value
      const data: CreatePostPayload = isText ? { title, text } : { title, url }
      dispatch(actions.posts.post(channelName, data)).then(post => {
        history.push(postDetailURL(channelName, post.id))
      })
    }
  }

  updateChannelSelection = (e: Object) => {
    const { history } = this.props

    e.preventDefault()
    if (e.target.value) {
      history.replace(e.target.value)
    }
  }

  render() {
    const {
      channel,
      channels,
      postForm,
      history,
      processing,
      embedly
    } = this.props

    if (!postForm) {
      return null
    }

    return (
      <div className="content create-post-page">
        <DocumentTitle title={formatTitle("Submit a Post")} />
        <div className="main-content">
          <CreatePostForm
            onSubmit={this.onSubmit}
            onUpdate={this.onUpdate}
            updateIsText={this.updateIsText}
            updateChannelSelection={this.updateChannelSelection}
            postForm={postForm.value}
            validation={postForm.errors}
            channel={channel}
            history={history}
            processing={processing}
            channels={channels.data}
            embedly={embedly}
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
  const postForm = getForm(state.forms)
  const embedly =
    postForm && postForm.value.url
      ? state.embedly.data.get(postForm.value.url)
      : undefined

  return {
    postForm,
    channel,
    channels,
    processing,
    embedly
  }
}

export default connect(mapStateToProps)(CreatePostPage)

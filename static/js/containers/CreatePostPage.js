// @flow
import React from "react"
import { connect } from "react-redux"
import R from "ramda"
import { MetaTags } from "react-meta-tags"
import { FETCH_PROCESSING } from "redux-hammock/constants"

import CreatePostForm from "../components/CreatePostForm"
import withSingleColumn from "../hoc/withSingleColumn"

import { actions } from "../actions"
import { isTextTabSelected, LINK_TYPE_ANY } from "../lib/channels"
import { newPostForm } from "../lib/posts"
import { postDetailURL } from "../lib/url"
import { getChannelName } from "../lib/util"
import { formatTitle } from "../lib/title"
import { validatePostCreateForm } from "../lib/validation"
import { ensureTwitterEmbedJS, handleTwitterWidgets } from "../lib/embed"

import type {
  Channel,
  CreatePostPayload,
  PostForm,
  PostValidation
} from "../flow/discussionTypes"
import type { RestState } from "../flow/restTypes"
import type { Dispatch } from "redux"
import type { Match } from "react-router"

type PostFormValue = {
  value: PostForm,
  errors: PostValidation
}

type CreatePostPageProps = {
  match: Match,
  dispatch: Dispatch<*>,
  postForm: ?PostFormValue,
  channel: Channel,
  channels: RestState<Map<string, Channel>>,
  history: Object,
  processing: boolean,
  embedly: Object,
  embedlyInFlight: boolean
}

const CREATE_POST_KEY = "post:new"
const CREATE_POST_PAYLOAD = { formKey: CREATE_POST_KEY }
const getForm = R.prop(CREATE_POST_KEY)

class CreatePostPage extends React.Component<CreatePostPageProps, void> {
  componentDidMount() {
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

  componentDidUpdate(prevProps: CreatePostPageProps) {
    const { channel, dispatch, postForm } = this.props

    // we may need to null out the postType under certain conditions
    // basically, if the user switches channels, and the post type they
    // already have selected is not allowed on the new channel, we want to null
    // out the postType so that they will be presented with the options
    // available on the new channel
    if (
      postForm &&
      channel &&
      prevProps.channel &&
      prevProps.channel.name !== channel.name &&
      postForm.value.postType !== null &&
      channel.link_type !== LINK_TYPE_ANY &&
      channel.link_type !== postForm.value.postType
    ) {
      dispatch(
        actions.forms.formUpdate({
          ...CREATE_POST_PAYLOAD,
          value: { postType: null, url: "", text: "" }
        })
      )
    }
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

  updatePostType = (postType: ?string) => {
    const { dispatch } = this.props
    dispatch(
      actions.forms.formUpdate({
        ...CREATE_POST_PAYLOAD,
        value: { postType, url: "", text: "" }
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
      const { postType, title, url, text } = postForm.value
      const isText = isTextTabSelected(postType, channel)
      const data: CreatePostPayload = isText ? { title, text } : { title, url }
      dispatch(actions.posts.post(channelName, data)).then(post => {
        history.push(postDetailURL(channelName, post.id, post.slug))
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
      embedly,
      embedlyInFlight
    } = this.props

    if (!postForm) {
      return null
    }

    return (
      <React.Fragment>
        <MetaTags>
          <title>{formatTitle("Submit a Post")}</title>
        </MetaTags>
        <CreatePostForm
          onSubmit={this.onSubmit}
          onUpdate={this.onUpdate}
          updatePostType={this.updatePostType}
          updateChannelSelection={this.updateChannelSelection}
          postForm={postForm.value}
          validation={postForm.errors}
          channel={channel}
          history={history}
          processing={processing}
          channels={channels.data || new Map()}
          embedly={embedly}
          embedlyInFlight={embedlyInFlight}
        />
      </React.Fragment>
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

  const embedlyInFlight = state.embedly.getStatus === FETCH_PROCESSING

  return {
    postForm,
    channel,
    channels,
    processing,
    embedly,
    embedlyInFlight
  }
}

export { CreatePostPage }
export default R.compose(
  connect(mapStateToProps),
  withSingleColumn("create-post-page")
)(CreatePostPage)

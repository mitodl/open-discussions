// @flow
/* global SETTINGS:false */
import React from "react"
import { connect } from "react-redux"
import R from "ramda"
import { MetaTags } from "react-meta-tags"
import { FETCH_PROCESSING } from "redux-hammock/constants"
import isURL from "validator/lib/isURL"

import CreatePostForm from "../components/CreatePostForm"
import withSingleColumn from "../hoc/withSingleColumn"
import CanonicalLink from "../components/CanonicalLink"
import IntraPageNav from "../components/IntraPageNav"

import { actions } from "../actions"
import { setBannerMessage } from "../actions/ui"
import { clearPostError } from "../actions/post"
import { isTextTabSelected, LINK_TYPE_ANY } from "../lib/channels"
import { newPostForm } from "../lib/posts"
import { postDetailURL } from "../lib/url"
import { getChannelName } from "../lib/util"
import { formatTitle } from "../lib/title"
import { validatePostCreateForm } from "../lib/validation"
import { ensureTwitterEmbedJS, handleTwitterWidgets } from "../lib/embed"
import { anyErrorExcept404 } from "../util/rest"

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
  embedlyInFlight: boolean,
  errored: boolean
}

export const CREATE_POST_KEY = "post:new"
const CREATE_POST_PAYLOAD = { formKey: CREATE_POST_KEY }
const getForm = R.prop(CREATE_POST_KEY)

class CreatePostPage extends React.Component<CreatePostPageProps> {
  async componentDidMount() {
    const { dispatch, channels } = this.props
    const channelName = getChannelName(this.props)
    const form = newPostForm()

    const channel =
      !channels.loaded && !channels.processing && channelName
        ? await dispatch(actions.channels.get(channelName))
        : this.props.channel

    if (channel && channel.link_type !== LINK_TYPE_ANY) {
      // $FlowFixMe
      form.postType = channel.link_type
    }

    dispatch(
      actions.forms.formBeginEdit({
        ...CREATE_POST_PAYLOAD,
        value: form
      })
    )
    ensureTwitterEmbedJS()
  }

  componentDidUpdate(prevProps: CreatePostPageProps) {
    const { channel, dispatch, postForm } = this.props

    // we may need to change out the postType under certain conditions
    // if the user switches channels and the new channel isn't LINK_TYPE_ANY,
    // and the current postType is null or a postType which is incompatible with the
    // new channel, we want to set the postType to be the link_type for the channel
    if (
      postForm &&
      channel &&
      ((prevProps.channel && prevProps.channel.name !== channel.name) ||
        !prevProps.channel) &&
      channel.link_type !== LINK_TYPE_ANY &&
      channel.link_type !== postForm.value.postType
    ) {
      dispatch(
        actions.forms.formUpdate({
          ...CREATE_POST_PAYLOAD,
          value: {
            postType:  channel.link_type,
            url:       "",
            text:      "",
            thumbnail: null
          }
        })
      )
    }
  }

  componentWillUnmount() {
    const { dispatch, errored } = this.props
    dispatch(actions.forms.formEndEdit(CREATE_POST_PAYLOAD))
    if (errored) {
      dispatch(clearPostError())
    }
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
    if (name === "url" && isURL(value, { allow_underscores: true })) {
      const embedlyGetFunc = actions.embedly.get(value)
      embedlyGetFunc.meta = {
        debounce: {
          time: 1000,
          key:  actions.embedly.get.requestType
        }
      }
      // $FlowFixMe
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

  onSubmit = async (e: Object) => {
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
      try {
        // $FlowFixMe
        const post = await dispatch(actions.posts.post(channelName, data))
        history.push(postDetailURL(channelName, post.id, post.slug))
      } catch (err) {
        dispatch(
          setBannerMessage(
            `Something went wrong creating your post. Please try again or contact us at ${
              SETTINGS.support_email
            }`
          )
        )
      }
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
      match,
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
          <CanonicalLink match={match} />
        </MetaTags>
        <IntraPageNav>
          <a href="#" className="active">
            Draft
          </a>
        </IntraPageNav>
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
    errored: anyErrorExcept404([state.posts]),
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

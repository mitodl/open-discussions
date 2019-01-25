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
import Dialog from "../components/Dialog"

import { actions } from "../actions"
import { setBannerMessage, setShowDrawerDesktop } from "../actions/ui"
import { clearPostError } from "../actions/post"
import {
  LINK_TYPE_LINK,
  LINK_TYPE_TEXT,
  LINK_TYPE_ARTICLE
} from "../lib/channels"
import { newPostForm } from "../lib/posts"
import { postDetailURL } from "../lib/url"
import { allEmptyOrNil, getChannelName } from "../lib/util"
import { formatTitle } from "../lib/title"
import { validatePostCreateForm } from "../lib/validation"
import { ensureTwitterEmbedJS, handleTwitterWidgets } from "../lib/embed"
import { anyErrorExcept404 } from "../util/rest"
import { showDialog, hideDialog, DIALOG_CLEAR_POST_TYPE } from "../actions/ui"
import { preventDefaultAndInvoke } from "../lib/util"

import type {
  Channel,
  CreatePostPayload,
  PostForm,
  PostValidation
} from "../flow/discussionTypes"
import type { LinkType } from "../lib/channels"
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
  errored: boolean,
  clearPostDialogVisible: boolean
}

export const CREATE_POST_KEY = "post:new"
const CREATE_POST_PAYLOAD = { formKey: CREATE_POST_KEY }
const getForm = R.prop(CREATE_POST_KEY)

const createPostPayload = (postForm: PostForm): CreatePostPayload => {
  // eslint-disable-next-line camelcase
  const { postType, title, url, text, article, cover_image } = postForm

  switch (postType) {
  case LINK_TYPE_LINK:
    return { title, url }
  case LINK_TYPE_TEXT:
    return { title, text }
  case LINK_TYPE_ARTICLE:
    return { title, article, cover_image }
  }

  // if no postType was selected, we're dealing with a 'title only' post
  // (these are really text posts under the hood, so we need to set the
  // text key to something)
  return { title, text }
}

const shouldFormReset = (
  allowedTypes: Array<LinkType>,
  prevChannelPostTypes: ?Array<string>,
  postForm: PostFormValue
) => {
  // if the post types are the same we don't need to reset the form
  if (R.equals(allowedTypes, prevChannelPostTypes)) {
    return false
  }

  // if there is only one post type allowed on the new channel we should reset
  // but we don't need to do this if this allowed type is already selected
  if (
    allowedTypes.length === 1 &&
    allowedTypes[0] !== postForm.value.postType
  ) {
    return true
  }

  // if there is no postType selected we don't need to reset the form
  if (!postForm.value.postType) {
    return false
  }

  // if the selected postType is not allowed on the new channel
  // we always need to reset the form
  if (!allowedTypes.includes(postForm.value.postType)) {
    return true
  }

  // if the currently selected postType is ok on the new channel
  // we want to reset the form if the user hasn't made any input
  // so they can see the options on the new channel which are different
  if (
    allEmptyOrNil([
      postForm.value.url,
      postForm.value.text,
      postForm.value.article
    ])
  ) {
    return true
  }

  return false
}

class CreatePostPage extends React.Component<CreatePostPageProps> {
  async componentDidMount() {
    const { dispatch, channels } = this.props
    const channelName = getChannelName(this.props)
    const form = newPostForm()

    let channel: Channel

    if (!channels.loaded && !channels.processing && channelName) {
      // $FlowFixMe: flow incorrectly indentifies the return value as an action, not a promise
      channel = await dispatch(actions.channels.get(channelName))
    } else {
      channel = this.props.channel
    }

    if (channel && channel.allowed_post_types.length === 1) {
      form.postType = channel.allowed_post_types[0]
    }

    dispatch(
      actions.forms.formBeginEdit({
        ...CREATE_POST_PAYLOAD,
        value: form
      })
    )
    ensureTwitterEmbedJS()
  }

  updateForm = (update: Object) => {
    const { dispatch } = this.props
    dispatch(
      actions.forms.formUpdate({
        ...CREATE_POST_PAYLOAD,
        value: update
      })
    )
  }

  componentDidUpdate(prevProps: CreatePostPageProps) {
    const { channel, postForm } = this.props

    // If a newly-selected channel cannot or should not be rendered with the same form state as the
    // previously-selected channel, we need to reset the form state.
    const prevChannelPostTypes = R.path(
      ["channel", "allowed_post_types"],
      prevProps
    )
    if (
      postForm &&
      channel &&
      shouldFormReset(
        channel.allowed_post_types,
        prevChannelPostTypes,
        postForm
      )
    ) {
      this.updateForm({
        postType:
          channel.allowed_post_types.length > 1
            ? null
            : channel.allowed_post_types[0],
        url:              "",
        text:             "",
        thumbnail:        null,
        article:          [],
        show_cover_image: true
      })
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

    this.updateForm({ [name]: value })

    if (name === "url" && isURL(value, { allow_underscores: true })) {
      const embedlyGetFunc = actions.embedly.get(value)
      embedlyGetFunc.meta = {
        debounce: {
          time: 1000,
          key:  "create-post"
        }
      }
      // $FlowFixMe
      const embedlyResponse = await dispatch(embedlyGetFunc)
      handleTwitterWidgets(embedlyResponse)
    }
  }

  hideCoverImageInput = () => {
    this.updateForm({ show_cover_image: false })
  }

  updatePostType = (postType: ?string) => {
    const { dispatch } = this.props
    this.updateForm({
      postType,
      url:              "",
      text:             "",
      article:          [],
      cover_image:      null,
      show_cover_image: true
    })

    if (postType === LINK_TYPE_ARTICLE) {
      dispatch(setShowDrawerDesktop(false))
    }

    this.setValidationErrors({})
  }

  getValidationErrors = () => {
    const { postForm, channel } = this.props

    const validation = R.isNil(channel)
      ? R.set(
        R.lensPath(["value", "channel"]),
        "You need to select a channel",
        validatePostCreateForm(postForm)
      )
      : validatePostCreateForm(postForm)

    return validation
  }

  setValidationErrors = (errors: Object) => {
    const { dispatch } = this.props
    dispatch(
      actions.forms.formValidate({
        ...CREATE_POST_PAYLOAD,
        errors
      })
    )
  }

  setPhotoError = (error: string) => {
    const validation = this.getValidationErrors()
    this.setValidationErrors({
      ...validation.value,
      coverImage: error
    })
  }

  openClearPostTypeDialog = () => {
    const { dispatch } = this.props
    dispatch(showDialog(DIALOG_CLEAR_POST_TYPE))
  }

  hideClearPostTypeDialog = () => {
    const { dispatch } = this.props
    dispatch(hideDialog(DIALOG_CLEAR_POST_TYPE))
  }

  clearPostType = () => {
    this.updatePostType(null)
    this.hideClearPostTypeDialog()
  }

  onSubmit = async (e: Object) => {
    const { dispatch, history, postForm, channel } = this.props

    e.preventDefault()

    const validation = this.getValidationErrors()

    if (!postForm || !R.isEmpty(validation)) {
      this.setValidationErrors(validation.value)
    } else {
      const channelName = channel.name
      const data = createPostPayload(postForm.value)

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
      embedlyInFlight,
      clearPostDialogVisible
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
            Create a Post
          </a>
        </IntraPageNav>
        <Dialog
          open={clearPostDialogVisible}
          hideDialog={preventDefaultAndInvoke(this.hideClearPostTypeDialog)}
          onCancel={preventDefaultAndInvoke(this.hideClearPostTypeDialog)}
          onAccept={this.clearPostType}
          title="Clear Post Content?"
          submitText="Yes"
          id="clear-post-type-dialog"
        >
          This will clear any input you have made, are you sure you want to
          continue?
        </Dialog>
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
          openClearPostTypeDialog={this.openClearPostTypeDialog}
          setPhotoError={this.setPhotoError}
          hideCoverImageInput={this.hideCoverImageInput}
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
  const clearPostDialogVisible = state.ui.dialogs.has(DIALOG_CLEAR_POST_TYPE)

  return {
    postForm,
    errored: anyErrorExcept404([state.posts]),
    channel,
    channels,
    processing,
    embedly,
    embedlyInFlight,
    clearPostDialogVisible
  }
}

export { CreatePostPage }
export default R.compose(
  connect(mapStateToProps),
  withSingleColumn("create-post-page")
)(CreatePostPage)

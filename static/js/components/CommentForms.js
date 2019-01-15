// @flow
/* global SETTINGS:false */
import React from "react"
import R from "ramda"
import { connect } from "react-redux"

import Editor, { editorUpdateFormShim } from "./Editor"
import LoginPopup from "./LoginPopup"
import ProfileImage, { PROFILE_IMAGE_MICRO } from "../containers/ProfileImage"
import ArticleEditor from "./ArticleEditor"
import CoverImageInput from "./CoverImageInput"

import { actions } from "../actions"
import { clearCommentError } from "../actions/comment"
import { setPostData } from "../actions/post"
import { setBannerMessage } from "../actions/ui"
import {
  isEmptyText,
  userIsAnonymous,
  preventDefaultAndInvoke
} from "../lib/util"
import { LINK_TYPE_ARTICLE } from "../lib/channels"

import type {
  CommentForm,
  CommentInTree,
  Post,
  Profile
} from "../flow/discussionTypes"
import type { FormsState } from "../flow/formTypes"
import type { Dispatch } from "redux"

type CommentComponentProps = {
  dispatch: Dispatch<*>,
  forms: FormsState,
  post: Post,
  initialValue: CommentForm,
  formKey: string,
  beginEditing: (initialValue: Object, e: ?Event) => void,
  onSubmit: (p: string, t: string, c: string, p: Post, e: Event) => Promise<*>,
  onUpdate: (e: Event) => void,
  cancelReply: () => void,
  formDataLens: (s: string) => Object,
  processing: boolean,
  patchComment: (c: Object) => void,
  patchPost: (p: Object) => void,
  comment: CommentInTree,
  editing: boolean,
  profile?: Profile
}

type CommentFormState = {
  replying: boolean
}

export const replyToCommentKey = (comment: CommentInTree) =>
  `post:${comment.post_id}:comment:${comment.id}:comment:new`

export const replyToPostKey = (post: Post) => `post:${post.id}:comment:new`

export const editCommentKey = (comment: CommentInTree) =>
  `post:${comment.post_id}:comment:${comment.id}:edit`

export const editPostKey = (post: Post) => `post:${post.id}:edit`

export const getCommentReplyInitialValue = (parent: CommentInTree) => ({
  post_id:    parent.post_id,
  comment_id: parent.id,
  text:       ""
})

const getPostReplyInitialValue = (parent: Post) => ({
  post_id: parent.id,
  text:    ""
})

const userOrAnonymousFunction = (
  //Return one of two functions depending on whether the user is logged in or anonymous.
  userFunc: ?Function,
  anonymousFunc: ?Function
) =>
  userIsAnonymous() && anonymousFunc
    ? preventDefaultAndInvoke(anonymousFunc)
    : userFunc

const ArticleInput: "ArticleInput" = "ArticleInput"
const WYSIWYGInput: "WYSIWYGInput" = "WYSIWYGInput"
const TextInput: "TextInput" = "TextInput"
type InputFormHelperInputType =
  | typeof ArticleInput
  | typeof WYSIWYGInput
  | typeof TextInput

type InputFormProps = {
  onSubmit: (e: Event) => Promise<*>,
  text: string,
  onUpdate: (e: any) => void,
  cancelReply: () => void,
  isComment: boolean,
  disabled: boolean,
  autoFocus: boolean,
  onTogglePopup?: Function,
  profile?: Profile,
  article?: Array<Object>,
  inputType: InputFormHelperInputType
}

const InputFormHelper = ({
  onSubmit,
  text,
  onUpdate,
  cancelReply,
  isComment,
  disabled,
  autoFocus,
  onTogglePopup,
  profile,
  article,
  inputType
}: InputFormProps) => {
  let input
  switch (inputType) {
  case ArticleInput:
    input = (
      <ArticleEditor
        initialData={article}
        onChange={editorUpdateFormShim("article_content", onUpdate)}
      />
    )
    break
  case WYSIWYGInput:
    input = (
      <Editor
        initialValue={text || ""}
        onChange={editorUpdateFormShim("text", onUpdate)}
        autoFocus={autoFocus}
      />
    )
    break
  case TextInput:
    input = (
      <textarea
        name="text"
        type="text"
        className="input"
        placeholder="Write a reply here..."
        value={text || ""}
        onChange={
          disabled ? userOrAnonymousFunction(null, onTogglePopup) : onUpdate
        }
        onFocus={userOrAnonymousFunction(null, onTogglePopup)}
        autoFocus={autoFocus}
      />
    )
  }

  return (
    <div className="reply-form">
      <form
        onSubmit={userOrAnonymousFunction(onSubmit, onTogglePopup)}
        className="form"
        onKeyDown={e => {
          if (
            e.key === "Enter" &&
            e.ctrlKey &&
            !disabled &&
            !isEmptyText(text)
          ) {
            onSubmit(e)
          }
        }}
      >
        <div className="form-item">
          {profile ? (
            <React.Fragment>
              <ProfileImage profile={profile} imageSize={PROFILE_IMAGE_MICRO} />
              <div className="triangle" />
            </React.Fragment>
          ) : null}
          {input}
        </div>
        <button
          type="submit"
          disabled={
            inputType === ArticleInput
              ? disabled
              : (disabled || isEmptyText(text)) && !userIsAnonymous()
          }
        >
          Submit
        </button>
        {isComment ? (
          <button
            onClick={preventDefaultAndInvoke(cancelReply)}
            className="cancel"
          >
            Cancel
          </button>
        ) : null}
      </form>
    </div>
  )
}

const getFormKeyFromOwnProps = ownProps =>
  ownProps.comment
    ? replyToCommentKey(ownProps.comment)
    : replyToPostKey(ownProps.post)

const getEditFormKeyFromOwnProps = ownProps =>
  ownProps.comment
    ? editCommentKey(ownProps.comment)
    : editPostKey(ownProps.post)

const mapStateToProps = (state, ownProps) => {
  const initialValue = ownProps.comment
    ? getCommentReplyInitialValue(ownProps.comment)
    : getPostReplyInitialValue(ownProps.post)

  return {
    initialValue,
    post:    ownProps.post || state.posts.data.get(initialValue.post_id),
    forms:   state.forms,
    formKey: ownProps.editing
      ? getEditFormKeyFromOwnProps(ownProps)
      : getFormKeyFromOwnProps(ownProps)
  }
}

const cancelReply = R.curry((dispatch, formKey) => () =>
  dispatch(actions.forms.formEndEdit({ formKey }))
)

export const beginEditing = R.curry((dispatch, formKey, initialValue, e) => {
  if (e) {
    e.preventDefault()
  }
  dispatch(
    actions.forms.formBeginEdit({
      formKey,
      value: R.clone(initialValue)
    })
  )
})

const mapDispatchToProps = (dispatch: any, ownProps: CommentComponentProps) => {
  const formKey = ownProps.editing
    ? getEditFormKeyFromOwnProps(ownProps)
    : getFormKeyFromOwnProps(ownProps)

  return {
    onUpdate: e => {
      const {
        target: { name, value }
      } = e
      dispatch(
        actions.forms.formUpdate({
          formKey,
          value: { [name]: value }
        })
      )
    },
    cancelReply:  cancelReply(dispatch, formKey),
    beginEditing: beginEditing(dispatch, formKey),
    onSubmit:     R.curry(async (postID, text, commentID, post, e) => {
      e.preventDefault()
      try {
        await dispatch(actions.comments.post(postID, text, commentID))
        dispatch(
          setPostData({
            ...post,
            num_comments: post.num_comments + 1
          })
        )
        cancelReply(dispatch, formKey)()
      } catch (err) {
        dispatch(clearCommentError())
        if (err.errorStatusCode === 410) {
          // Comment was deleted
          dispatch(
            setBannerMessage(
              "This comment has been deleted and cannot be replied to"
            )
          )
          cancelReply(dispatch, formKey)()
        } else {
          // Unknown errors
          dispatch(
            setBannerMessage(
              `Something went wrong creating your comment. Please try again or contact us at ${
                SETTINGS.support_email
              }`
            )
          )
        }
      }
    }),
    patchComment: async comment => {
      try {
        await dispatch(actions.comments.patch(comment.id, comment))
        cancelReply(dispatch, formKey)()
      } catch (err) {
        dispatch(clearCommentError())
        if (err.errorStatusCode === 410) {
          // Comment was deleted
          dispatch(
            setBannerMessage(
              "This comment has been deleted and cannot be edited"
            )
          )
          cancelReply(dispatch, formKey)()
        } else {
          // Unknown errors
          dispatch(
            setBannerMessage(
              `Something went wrong editing your comment. Please try again or contact us at ${
                SETTINGS.support_email
              }`
            )
          )
        }
      }
    },
    patchPost: post =>
      dispatch(actions.posts.patch(post.id, post)).then(() => {
        cancelReply(dispatch, formKey)()
      }),
    formDataLens: formDataLens(formKey)
  }
}

export const ReplyToCommentForm: Class<React$Component<*, *>> = connect(
  mapStateToProps,
  mapDispatchToProps
)(
  class ReplyCommentForm extends React.Component<
    CommentComponentProps,
    CommentFormState
  > {
    constructor(props) {
      super(props)
      this.state = {
        replying: false
      }
    }

    onSubmit = async (event: Event) => {
      const { formKey, forms, post, onSubmit } = this.props
      const { post_id, text, comment_id } = R.prop(formKey, forms).value // eslint-disable-line camelcase

      this.setState({ replying: true })
      await onSubmit(post_id, text, comment_id, post, event)
      this.setState({ replying: false })
    }

    render() {
      const { forms, formKey, onUpdate, cancelReply } = this.props
      const { replying } = this.state
      const text = R.pathOr("", [formKey, "value", "text"], forms)

      return R.has(formKey, forms) ? (
        <InputFormHelper
          onSubmit={this.onSubmit}
          text={text}
          onUpdate={onUpdate}
          cancelReply={cancelReply}
          isComment={true}
          disabled={replying}
          autoFocus={true}
          inputType={TextInput}
        />
      ) : null
    }
  }
)

export const EditCommentForm: Class<React$Component<*, *>> = connect(
  mapStateToProps,
  mapDispatchToProps
)(
  class EditCommentForm extends React.Component<CommentComponentProps, *> {
    constructor(props) {
      super(props)
      this.state = {
        patching: false
      }
    }

    state: {
      patching: boolean
    }

    onSubmit = async e => {
      const { formKey, forms, patchComment, comment } = this.props
      const { text } = R.prop(formKey, forms).value

      e.preventDefault()

      const { id } = comment
      const updatedComment = { text, id }
      this.setState({ patching: true })
      await patchComment(updatedComment)
      this.setState({ patching: false })
    }

    render() {
      const { forms, formKey, onUpdate, cancelReply } = this.props
      const { patching } = this.state
      const text = R.pathOr("", [formKey, "value", "text"], forms)

      return (
        <InputFormHelper
          onSubmit={this.onSubmit}
          text={text}
          onUpdate={onUpdate}
          cancelReply={cancelReply}
          isComment={true}
          disabled={patching}
          autoFocus={true}
          inputType={TextInput}
        />
      )
    }
  }
)

export const EditPostForm: Class<React$Component<*, *>> = connect(
  mapStateToProps,
  mapDispatchToProps
)(
  class EditPostForm extends React.Component<*, *> {
    constructor(props) {
      super(props)
      this.state = {
        patching:       false,
        showCoverImage: true
      }
    }

    props: CommentComponentProps

    state: {
      patching: boolean,
      showCoverImage: boolean
    }

    onSubmit = async e => {
      const { formKey, forms, patchPost, post } = this.props
      // eslint-disable-next-line camelcase
      const { text, article_content, cover_image } = R.prop(
        formKey,
        forms
      ).value

      e.preventDefault()

      const { id } = post
      this.setState({ patching: true })
      // eslint-disable-next-line camelcase
      const content =
        post.post_type === LINK_TYPE_ARTICLE
          ? { id, article_content, cover_image }
          : { id, text }
      try {
        await patchPost(content)
      } catch (_) {
        this.setState({ patching: false })
      }
    }

    hideCoverImageInput = () => {
      this.setState({ showCoverImage: false })
    }

    render() {
      const { forms, formKey, onUpdate, cancelReply, post } = this.props
      const { patching, showCoverImage } = this.state
      const text = R.pathOr("", [formKey, "value", "text"], forms)
      const image = R.pathOr(null, [formKey, "value", "cover_image"], forms)
      const article = R.pathOr(
        null,
        [formKey, "value", "article_content"],
        forms
      )

      const inputType =
        post.post_type === LINK_TYPE_ARTICLE ? ArticleInput : WYSIWYGInput

      return (
        <React.Fragment>
          {article && showCoverImage ? (
            <CoverImageInput
              image={image}
              onUpdate={onUpdate}
              hideCoverImageInput={this.hideCoverImageInput}
            />
          ) : null}
          <InputFormHelper
            onSubmit={this.onSubmit}
            text={text}
            article={article}
            onUpdate={onUpdate}
            cancelReply={cancelReply}
            isComment={true}
            disabled={patching}
            autoFocus={true}
            inputType={inputType}
          />
        </React.Fragment>
      )
    }
  }
)

const formDataLens = R.curry((formKey, prop) =>
  R.lensPath([formKey, "value", prop])
)

const getFormData = (lensFunc, forms) => ({
  text:       R.view(lensFunc("text"), forms),
  post_id:    R.view(lensFunc("post_id"), forms),
  comment_id: R.view(lensFunc("comment_id"), forms)
})

export const ReplyToPostForm: Class<React$Component<*, *>> = connect(
  mapStateToProps,
  mapDispatchToProps
)(
  class ReplyPostForm extends React.Component<*, *> {
    props: CommentComponentProps

    state: {
      replying: boolean,
      popupVisible: boolean
    }

    constructor(props) {
      super(props)
      this.state = {
        replying:     false,
        popupVisible: false
      }
    }

    // since this form is always open (unlike the comment-reply forms)
    // we have to be sure it's always ready for the user to start entering
    // a new comment
    ensureInitialState = () => {
      const { beginEditing, initialValue, formDataLens, forms } = this.props
      const { post_id } = getFormData(formDataLens, forms) // eslint-disable-line camelcase
      // eslint-disable-next-line camelcase
      if (!post_id) {
        beginEditing(initialValue, undefined)
      }
    }

    componentDidMount() {
      this.ensureInitialState()
    }

    componentDidUpdate() {
      this.ensureInitialState()
    }

    onTogglePopup = () => {
      const { popupVisible } = this.state
      this.setState({
        popupVisible: !popupVisible
      })
    }

    onSubmit = async (event: Event) => {
      const { onSubmit, formDataLens, forms, post } = this.props
      const { post_id, text, comment_id } = getFormData(formDataLens, forms) // eslint-disable-line camelcase

      this.setState({ replying: true })
      await onSubmit(post_id, text, comment_id, post, event)
      this.setState({ replying: false })
    }

    render() {
      const { forms, onUpdate, cancelReply, formDataLens, profile } = this.props
      const { replying, popupVisible } = this.state
      const { text } = getFormData(formDataLens, forms)

      return (
        <div className="reply-post-form">
          {userIsAnonymous() ? (
            <LoginPopup
              visible={popupVisible}
              closePopup={this.onTogglePopup}
              className="post-reply-popup"
            />
          ) : null}
          <InputFormHelper
            onSubmit={this.onSubmit}
            text={text}
            onUpdate={onUpdate}
            cancelReply={cancelReply}
            isComment={false}
            disabled={replying || userIsAnonymous()}
            autoFocus={false}
            onTogglePopup={this.onTogglePopup}
            profile={profile}
            inputType={TextInput}
          />
        </div>
      )
    }
  }
)

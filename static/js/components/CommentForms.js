// @flow
/* global SETTINGS:false */
import React from "react"
import R from "ramda"
import { connect } from "react-redux"

import { actions } from "../actions"
import { clearCommentError } from "../actions/comment"
import { setPostData } from "../actions/post"
import { setBannerMessage } from "../actions/ui"
import {
  isEmptyText,
  commentLoginText,
  userIsAnonymous,
  preventDefaultAndInvoke
} from "../lib/util"
import Editor, { editorUpdateFormShim } from "./Editor"
import LoginPopup from "./LoginPopup"

import type { CommentForm, CommentInTree, Post } from "../flow/discussionTypes"
import type { FormsState } from "../flow/formTypes"
import type { Dispatch } from "redux"

type CommentFormProps = {
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
  editing: boolean
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

const commentForm = (
  onSubmit: (e: Event) => Promise<*>,
  text: string,
  onUpdate: (e: any) => void,
  cancelReply: () => void,
  isComment: boolean,
  disabled: boolean,
  autoFocus: boolean,
  wysiwyg: boolean = false,
  onTogglePopup?: Function
) => (
  <div className="reply-form">
    <form
      onSubmit={
        userIsAnonymous() && onTogglePopup
          ? // $FlowFixMe - the above ensures onTogglePopup is defined
          preventDefaultAndInvoke(onTogglePopup)
          : onSubmit
      }
      className="form"
      onKeyDown={e => {
        if (e.key === "Enter" && e.ctrlKey && !disabled && !isEmptyText(text)) {
          onSubmit(e)
        }
      }}
    >
      <div className="form-item">
        {wysiwyg ? (
          <Editor
            initialValue={text || ""}
            onChange={editorUpdateFormShim("text", onUpdate)}
            autoFocus={autoFocus}
          />
        ) : (
          <textarea
            name="text"
            type="text"
            className="input"
            placeholder="Write a reply here..."
            value={text || ""}
            onChange={disabled ? null : onUpdate}
            onClick={
              userIsAnonymous() && onTogglePopup
                ? // $FlowFixMe: the above
                preventDefaultAndInvoke(onTogglePopup)
                : null
            }
            autoFocus={autoFocus}
          />
        )}
      </div>
      <button
        type="submit"
        className={`blue-button ${disabled ? "disabled" : ""}`}
        disabled={(disabled || isEmptyText(text)) && !userIsAnonymous()}
      >
        Submit
      </button>
      {isComment ? (
        <a
          href="#"
          onClick={preventDefaultAndInvoke(cancelReply)}
          className="cancel-button"
        >
          Cancel
        </a>
      ) : null}
    </form>
  </div>
)

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

const mapDispatchToProps = (dispatch: any, ownProps: CommentFormProps) => {
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
    onSubmit:     R.curry((postID, text, commentID, post, e) => {
      e.preventDefault()
      return dispatch(actions.comments.post(postID, text, commentID))
        .then(() => {
          dispatch(
            setPostData({
              ...post,
              num_comments: post.num_comments + 1
            })
          )
          cancelReply(dispatch, formKey)()
        })
        .catch(err => {
          dispatch(clearCommentError())
          if (err.errorStatusCode === 410) {
            // Comment was deleted
            dispatch(
              setBannerMessage(
                "This comment has been deleted and cannot be replied to"
              )
            )
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
        })
    }),
    patchComment: comment =>
      dispatch(actions.comments.patch(comment.id, comment)).then(() => {
        cancelReply(dispatch, formKey)()
      }),
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
    CommentFormProps,
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

      return R.has(formKey, forms)
        ? commentForm(
          this.onSubmit,
          text,
          onUpdate,
          cancelReply,
          true,
          replying,
          true
        )
        : null
    }
  }
)

export const EditCommentForm: Class<React$Component<*, *>> = connect(
  mapStateToProps,
  mapDispatchToProps
)(
  class EditCommentForm extends React.Component<*, *> {
    constructor(props) {
      super(props)
      this.state = {
        patching: false
      }
    }

    props: CommentFormProps

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

      return commentForm(
        this.onSubmit,
        text,
        onUpdate,
        cancelReply,
        true,
        patching,
        true
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
        patching: false
      }
    }

    props: CommentFormProps

    state: {
      patching: boolean
    }

    onSubmit = async e => {
      const { formKey, forms, patchPost, post } = this.props
      const { text } = R.prop(formKey, forms).value

      e.preventDefault()

      const { id } = post
      this.setState({ patching: true })
      try {
        await patchPost({ id, text })
      } catch (_) {
        this.setState({ patching: false })
      }
    }

    render() {
      const { forms, formKey, onUpdate, cancelReply } = this.props
      const { patching } = this.state
      const text = R.pathOr("", [formKey, "value", "text"], forms)

      return commentForm(
        this.onSubmit,
        text,
        onUpdate,
        cancelReply,
        true,
        patching,
        true,
        true
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
    props: CommentFormProps

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
      const { forms, onUpdate, cancelReply, formDataLens } = this.props
      const { replying, popupVisible } = this.state
      const { text } = getFormData(formDataLens, forms)

      return (
        <React.Fragment>
          <LoginPopup
            message={commentLoginText}
            visible={popupVisible}
            closePopup={this.onTogglePopup}
            className="downshift"
          />
          {commentForm(
            this.onSubmit,
            text,
            onUpdate,
            cancelReply,
            false,
            replying || userIsAnonymous(),
            false,
            false,
            this.onTogglePopup
          )}
        </React.Fragment>
      )
    }
  }
)

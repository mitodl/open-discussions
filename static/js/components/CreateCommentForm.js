// @flow
import React from "react"
import R from "ramda"
import { connect } from "react-redux"

import { actions } from "../actions"
import { setPostData } from "../actions/post"
import { isEmptyText } from "../lib/util"

import type { Comment, Post, CommentForm } from "../flow/discussionTypes"
import type { FormsState } from "../flow/formTypes"
import type { Dispatch } from "redux"

type CreateCommentFormProps = {
  dispatch: Dispatch,
  forms: FormsState,
  post: Post,
  initialValue: CommentForm,
  formKey: string,
  beginReply: (initialValue: Object, e: ?Event) => void,
  onSubmit: (p: string, t: string, c: string, p: Post, e: Event) => Promise<*>,
  onUpdate: (e: Event) => void,
  cancelReply: () => void,
  formDataLens: (s: string) => Object,
  processing: boolean
}

export const replyToCommentKey = (comment: Comment) =>
  `post:${comment.post_id}:comment:${comment.id}:comment:new`

export const replyToPostKey = (post: Post) => `post:${post.id}:comment:new`

export const getCommentReplyInitialValue = (parent: Comment) => ({
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
  autoFocus: boolean
) =>
  <div className="reply-form">
    <form
      onSubmit={onSubmit}
      className="form"
      onKeyDown={e => {
        if (e.key === "Enter" && e.ctrlKey && !disabled && !isEmptyText(text)) {
          onSubmit(e)
        }
      }}
    >
      <div className="form-item">
        <textarea
          name="text"
          type="text"
          className="input"
          placeholder="Write a reply here..."
          value={text || ""}
          onChange={onUpdate}
          autoFocus={autoFocus}
        />
      </div>
      <button
        type="submit"
        className={`blue-button ${disabled ? "disabled" : ""}`}
        disabled={disabled || isEmptyText(text)}
      >
        Submit
      </button>
      {isComment
        ? <a
          href="#"
          onClick={R.compose(cancelReply, e => e.preventDefault())}
          className="cancel-button"
        >
            Cancel
        </a>
        : null}
    </form>
  </div>

const getFormKeyFromOwnProps = ownProps =>
  ownProps.comment
    ? replyToCommentKey(ownProps.comment)
    : replyToPostKey(ownProps.post)

const mapStateToProps = (state, ownProps) => {
  const initialValue = ownProps.comment
    ? getCommentReplyInitialValue(ownProps.comment)
    : getPostReplyInitialValue(ownProps.post)

  return {
    initialValue,
    post:    ownProps.post || state.posts.data.get(initialValue.post_id),
    forms:   state.forms,
    formKey: getFormKeyFromOwnProps(ownProps)
  }
}

const cancelReply = R.curry((dispatch, formKey) => () =>
  dispatch(actions.forms.formEndEdit({ formKey }))
)

export const beginReply = R.curry((dispatch, formKey, initialValue, e) => {
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

const mapDispatchToProps = (dispatch, ownProps) => {
  const formKey = getFormKeyFromOwnProps(ownProps)

  return {
    onUpdate: e => {
      const { target: { name, value } } = e
      dispatch(
        actions.forms.formUpdate({
          formKey,
          value: { [name]: value }
        })
      )
    },
    cancelReply: cancelReply(dispatch, formKey),
    beginReply:  beginReply(dispatch, formKey),
    onSubmit:    R.curry((postID, text, commentID, post, e) => {
      e.preventDefault()
      return dispatch(
        actions.comments.post(postID, text, commentID)
      ).then(() => {
        dispatch(
          setPostData({
            ...post,
            num_comments: post.num_comments + 1
          })
        )
        cancelReply(dispatch, formKey)()
      })
    }),
    formDataLens: formDataLens(formKey)
  }
}

export const ReplyToCommentForm = connect(mapStateToProps, mapDispatchToProps)(
  class ReplyCommentForm extends React.Component {
    props: CreateCommentFormProps

    state: {
      replying: boolean
    }

    constructor(props) {
      super(props)
      this.state = {
        replying: false
      }
    }

    onSubmit = async (event: Event) => {
      const { formKey, forms, post, onSubmit } = this.props
      const { post_id, text, comment_id } = R.prop(formKey, forms).value

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

const formDataLens = R.curry((formKey, prop) =>
  R.lensPath([formKey, "value", prop])
)

const getFormData = (lensFunc, forms) => ({
  text:       R.view(lensFunc("text"), forms),
  post_id:    R.view(lensFunc("post_id"), forms),
  comment_id: R.view(lensFunc("comment_id"), forms)
})

export const ReplyToPostForm = connect(mapStateToProps, mapDispatchToProps)(
  class ReplyPostForm extends React.Component {
    props: CreateCommentFormProps

    state: {
      replying: boolean
    }

    constructor(props) {
      super(props)
      this.state = {
        replying: false
      }
    }

    // since this form is always open (unlike the comment-reply forms)
    // we have to be sure it's always ready for the user to start entering
    // a new comment
    ensureInitialState = () => {
      const { beginReply, initialValue, formDataLens, forms } = this.props
      const { post_id } = getFormData(formDataLens, forms)
      // eslint-disable-next-line camelcase
      if (!post_id) {
        beginReply(initialValue, undefined)
      }
    }

    componentDidMount() {
      this.ensureInitialState()
    }

    componentDidUpdate() {
      this.ensureInitialState()
    }

    onSubmit = async (event: Event) => {
      const { onSubmit, formDataLens, forms, post } = this.props
      const { post_id, text, comment_id } = getFormData(formDataLens, forms)

      this.setState({ replying: true })
      await onSubmit(post_id, text, comment_id, post, event)
      this.setState({ replying: false })
    }

    render() {
      const { forms, onUpdate, cancelReply, formDataLens } = this.props
      const { replying } = this.state
      const { text } = getFormData(formDataLens, forms)

      return commentForm(
        this.onSubmit,
        text,
        onUpdate,
        cancelReply,
        false,
        replying,
        false
      )
    }
  }
)

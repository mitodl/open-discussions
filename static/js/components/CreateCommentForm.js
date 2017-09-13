// @flow
import React from "react"
import R from "ramda"
import { connect } from "react-redux"

import { actions } from "../actions"
import { setPostData } from "../actions/post"

import type { Comment, Post, CommentForm } from "../flow/discussionTypes"
import type { FormsState } from "../flow/formTypes"
import type { Dispatch } from "redux"

type CreateCommentFormProps = {
  dispatch: Dispatch,
  forms: FormsState,
  post: Post,
  initialValue: CommentForm,
  formKey: string,
  beginReply: (initialValue: Object, e: ?Object) => void,
  onSubmit: (p: string, t: string, c: string, p: Post) => () => void,
  onUpdate: (e: Object) => void,
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

const isEmptyCommentBody = R.compose(R.isEmpty, R.trim, R.defaultTo(""))

const commentForm = (
  onSubmit: () => void,
  text: string,
  onUpdate: (e: any) => void,
  cancelReply: () => void,
  isComment: boolean,
  disabled: boolean
) =>
  <div className="reply-form">
    <form onSubmit={onSubmit} className="form">
      <div className="form-item">
        <textarea
          name="text"
          type="text"
          className="input"
          placeholder="Write a reply here..."
          value={text || ""}
          onChange={onUpdate}
        />
      </div>
      <button
        type="submit"
        className={`blue-button ${disabled ? "disabled" : ""}`}
        disabled={disabled || isEmptyCommentBody(text)}
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
      dispatch(actions.comments.post(postID, text, commentID)).then(() => {
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

export const ReplyToCommentForm = connect(
  mapStateToProps,
  mapDispatchToProps
)(
  ({
    forms,
    formKey,
    post,
    onSubmit,
    onUpdate,
    cancelReply,
    processing
    }: CreateCommentFormProps) => {
    if (R.has(formKey, forms)) {
      const { post_id, text, comment_id } = R.prop(formKey, forms).value

      return commentForm(
        onSubmit(post_id, text, comment_id, post),
        text,
        onUpdate,
        cancelReply,
        true,
        processing
      )
    }
    return null
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

    render() {
      const {
        forms,
        post,
        onSubmit,
        onUpdate,
        cancelReply,
        formDataLens,
        processing
      } = this.props
      const { post_id, text, comment_id } = getFormData(formDataLens, forms)

      return commentForm(
        onSubmit(post_id, text, comment_id, post),
        text,
        onUpdate,
        cancelReply,
        false,
        processing
      )
    }
  }
)

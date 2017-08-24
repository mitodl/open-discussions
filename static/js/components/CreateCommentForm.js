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
  formKey: string
}

type ReplyToCommentFormProps = {
  comment: Comment
}

type ReplyToPostFormProps = {
  post: Post
}

const replyToCommentKey = (comment: Comment) =>
  `post:${comment.post_id}:comment:${comment.id}:comment:new`
const replyToPostKey = (post: Post) => `post:${post.id}:comment:new`

const getCommentReplyInitialValue = (parent: Comment) => ({
  post_id:    parent.post_id,
  comment_id: parent.id,
  text:       ""
})
const getPostReplyInitialValue = (parent: Post) => ({
  post_id: parent.id,
  text:    ""
})

const CreateCommentForm = ({
  dispatch,
  forms,
  formKey,
  initialValue,
  post
  }: CreateCommentFormProps) => {
  const beginReply = e => {
    e.preventDefault()
    dispatch(
      actions.forms.formBeginEdit({
        formKey,
        value: R.clone(initialValue)
      })
    )
  }
  const onUpdate = e => {
    dispatch(
      actions.forms.formUpdate({
        formKey,
        value: { [e.target.name]: e.target.value }
      })
    )
  }
  const cancelReply = () => dispatch(actions.forms.formEndEdit({ formKey }))

  if (R.has(formKey, forms)) {
    const { post_id, text, comment_id } = R.prop(formKey, forms).value
    const onSubmit = e => {
      e.preventDefault()
      dispatch(actions.comments.post(post_id, text, comment_id)).then(() => {
        dispatch(
          setPostData({
            ...post,
            num_comments: post.num_comments + 1
          })
        )
        cancelReply()
      })
    }

    return (
      <div className="reply-form">
        <form onSubmit={onSubmit} className="form">
          <div className="form-item">
            <label htmlFor="public_description" className="label">
              Comment
            </label>
            <textarea
              name="text"
              type="text"
              className="input"
              value={text}
              onChange={onUpdate}
            />
          </div>
          <button type="submit">Save</button>
          <a href="#" onClick={cancelReply} className="cancel-button">
            Cancel
          </a>
        </form>
      </div>
    )
  }
  return (
    <div className="reply-button">
      <a href="#" onClick={beginReply}>
        Reply
      </a>
    </div>
  )
}

const ConnectedCreateCommentForm = connect((state, otherProps) => {
  return {
    forms: state.forms,
    post:  state.posts.data.get(otherProps.initialValue.post_id)
  }
})(CreateCommentForm)

export const ReplyToCommentForm = ({ comment }: ReplyToCommentFormProps) => {
  const formKey = replyToCommentKey(comment)
  const initialValue = getCommentReplyInitialValue(comment)

  return (
    <ConnectedCreateCommentForm formKey={formKey} initialValue={initialValue} />
  )
}

export const ReplyToPostForm = ({ post }: ReplyToPostFormProps) => {
  const formKey = replyToPostKey(post)
  const initialValue = getPostReplyInitialValue(post)

  return (
    <ConnectedCreateCommentForm formKey={formKey} initialValue={initialValue} />
  )
}

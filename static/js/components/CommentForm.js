// @flow
/* global SETTINGS:false */
import React, { useState } from "react"
import { connect } from "react-redux"
import { Formik, Form, Field } from "formik"

import LoginPopup from "./LoginPopup"
import ProfileImage, { PROFILE_IMAGE_MICRO } from "../containers/ProfileImage"

import {
  isEmptyText,
  userIsAnonymous,
  preventDefaultAndInvoke
} from "../lib/util"
import { actions } from "../actions"
import { clearCommentError } from "../actions/comment"
import { setPostData } from "../actions/post"
import { setBannerMessage } from "../actions/ui"

import type { CommentInTree, Post, Profile } from "../flow/discussionTypes"

const userOrAnonymousFunction = (
  //Return one of two functions depending on whether the user is logged in or anonymous.
  userFunc: ?Function,
  anonymousFunc: ?Function
) =>
  userIsAnonymous() && anonymousFunc
    ? preventDefaultAndInvoke(anonymousFunc)
    : userFunc

type DispatchProps = {|
  onSubmit: (t: string, c: ?string, p: Post) => Promise<*>,
  patchComment: (c: Object) => Promise<*>
|}

type OwnProps = {|
  profile?: Profile,
  autoFocus?: boolean,
  editing?: boolean,
  post: Post,
  comment?: CommentInTree,
  closeReply?: Function
|}

type Props = {|
  ...DispatchProps,
  ...OwnProps
|}

function CommentFormInner(props: Props) {
  const {
    profile,
    onSubmit,
    post,
    comment,
    closeReply,
    patchComment,
    editing,
    autoFocus
  } = props

  const [popupVisible, setPopupVisible] = useState(false)

  return (
    <div className={comment ? "reply-form" : "reply-post-form"}>
      {userIsAnonymous() ? (
        <LoginPopup
          visible={popupVisible}
          closePopup={setPopupVisible}
          className="post-reply-popup"
        />
      ) : null}
      <Formik
        onSubmit={async (values, actions) => {
          const { commentText } = values

          if (editing && comment) {
            const { id } = comment
            const updatedComment = {
              id,
              text: commentText
            }
            await patchComment(updatedComment)
          } else {
            await onSubmit(commentText, comment ? comment.id : undefined, post)
          }
          actions.setSubmitting(false)
          if (closeReply) {
            closeReply()
          } else {
            actions.resetForm({ commentText: "" })
          }
        }}
        initialValues={{
          commentText: editing && comment ? comment.text : ""
        }}
      >
        {({ isSubmitting, values, handleSubmit }) => (
          <Form
            onKeyDown={e => {
              if (
                e.key === "Enter" &&
                e.ctrlKey &&
                !isSubmitting &&
                !isEmptyText(values.commentText)
              ) {
                handleSubmit(e)
              }
            }}
          >
            <div className="form-item">
              {profile ? (
                <React.Fragment>
                  <ProfileImage
                    profile={profile}
                    imageSize={PROFILE_IMAGE_MICRO}
                  />
                  <div className="triangle" />
                </React.Fragment>
              ) : null}
              <Field
                type="text"
                name="commentText"
                className="input"
                placeholder="Write a reply here..."
                autoFocus={autoFocus}
                render={({ field }) => (
                  <textarea
                    type="text"
                    {...field}
                    onChange={userOrAnonymousFunction(field.onChange, () =>
                      setPopupVisible(true)
                    )}
                    onFocus={userOrAnonymousFunction(null, () =>
                      setPopupVisible(true)
                    )}
                  />
                )}
              />
            </div>
            <button
              type="submit"
              disabled={
                isSubmitting || userIsAnonymous() || !values.commentText
              }
            >
              Submit
            </button>
            {closeReply ? (
              <button
                onClick={preventDefaultAndInvoke(closeReply)}
                className="cancel"
                disabled={isSubmitting}
              >
                Cancel
              </button>
            ) : null}
          </Form>
        )}
      </Formik>
    </div>
  )
}

const mapDispatchToProps = (dispatch): DispatchProps => ({
  onSubmit: async (text, commentID, post) => {
    try {
      await dispatch(actions.comments.post(post.id, text, commentID))
      dispatch(
        setPostData({
          ...post,
          num_comments: post.num_comments + 1
        })
      )
    } catch (err) {
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
    }
  },
  patchComment: async comment => {
    try {
      await dispatch(actions.comments.patch(comment.id, comment))
    } catch (err) {
      dispatch(clearCommentError())
      if (err.errorStatusCode === 410) {
        // Comment was deleted
        dispatch(
          setBannerMessage("This comment has been deleted and cannot be edited")
        )
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
  }
})

const CommentForm = connect<Props, OwnProps, _, DispatchProps, _, _>(
  null,
  mapDispatchToProps
)(CommentFormInner)
export default CommentForm

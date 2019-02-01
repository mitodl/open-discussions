// @flow
/* global SETTINGS: false */
import React from "react"

import Dialog from "../components/Dialog"

import { actions } from "../actions"
import {
  setSnackbarMessage,
  showDialog,
  hideDialog,
  DIALOG_REMOVE_COMMENT
} from "../actions/ui"
import { setFocusedComment, clearFocusedComment } from "../actions/focus"
import { approveComment, removeComment } from "../util/api_actions"
import { getChannelName } from "../lib/util"

import type { CommentInTree } from "../flow/discussionTypes"

export const withCommentModeration = (
  WrappedComponent: Class<React.Component<*, *>>
) => {
  class WithCommentModeration extends React.Component<*, *> {
    static WrappedComponent: Class<React.Component<*, *>>

    openCommentDialog = (comment: CommentInTree) => {
      const { dispatch } = this.props
      dispatch(setFocusedComment(comment))
      dispatch(showDialog(DIALOG_REMOVE_COMMENT))
    }

    hideCommentDialog = () => {
      const { dispatch } = this.props
      dispatch(clearFocusedComment())
      dispatch(hideDialog(DIALOG_REMOVE_COMMENT))
    }

    approveComment = async (comment: CommentInTree) => {
      const { dispatch, channelName, shouldGetReports } = this.props

      await approveComment(dispatch, comment)
      if (shouldGetReports) {
        await dispatch(actions.reports.get(channelName))
      }
      dispatch(
        setSnackbarMessage({
          message: "Comment has been approved"
        })
      )
    }

    removeComment = async (event: Event) => {
      const {
        dispatch,
        focusedComment,
        channelName,
        shouldGetReports
      } = this.props
      event.preventDefault()

      await removeComment(dispatch, focusedComment)
      if (shouldGetReports) {
        await dispatch(actions.reports.get(channelName))
      }

      this.hideCommentDialog()
      dispatch(
        setSnackbarMessage({
          message: "Comment has been removed"
        })
      )
    }

    ignoreReports = async (comment: CommentInTree) => {
      const { dispatch, channelName, shouldGetReports } = this.props

      await dispatch(
        actions.comments.patch(comment.id, { ignore_reports: true })
      )
      if (shouldGetReports) {
        await dispatch(actions.reports.get(channelName))
      }
    }

    render() {
      const { showRemoveCommentDialog } = this.props

      return (
        <React.Fragment>
          <Dialog
            id="remove-comment-dialog"
            open={showRemoveCommentDialog}
            onAccept={this.removeComment}
            hideDialog={this.hideCommentDialog}
            submitText="Yes, remove"
            title="Remove Comment"
          >
            <p>
              Are you sure? You will still be able to see the comment, but it
              will be deleted for normal users. You can undo this later by
              clicking "approve".
            </p>
          </Dialog>
          <WrappedComponent
            {...this.props}
            removeComment={this.openCommentDialog}
            approveComment={this.approveComment}
            ignoreCommentReports={this.ignoreReports}
          />
        </React.Fragment>
      )
    }
  }

  WithCommentModeration.WrappedComponent = WrappedComponent

  return WithCommentModeration
}

export const commentModerationSelector = (state: Object, ownProps: Object) => {
  const { ui, focus } = state
  const channelName = ownProps.channelName || getChannelName(ownProps)

  return {
    showRemoveCommentDialog: ui.dialogs.has(DIALOG_REMOVE_COMMENT),
    focusedComment:          focus.comment,
    channelName
  }
}

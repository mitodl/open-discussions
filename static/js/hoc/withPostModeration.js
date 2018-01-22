// @flow
/* global SETTINGS: false */
import React from "react"

import { Dialog } from "@mitodl/mdl-react-components"

import { actions } from "../actions"
import { approvePost, removePost } from "../util/api_actions"
import {
  setSnackbarMessage,
  showDialog,
  hideDialog,
  DIALOG_REMOVE_POST
} from "../actions/ui"
import { setFocusedPost, clearFocusedPost } from "../actions/focus"
import { getChannelName } from "../lib/util"
import { isModerator } from "../lib/channels"
import { getSubscribedChannels } from "../lib/redux_selectors"
import { anyErrorExcept404 } from "../util/rest"

import type { Post } from "../flow/discussionTypes"

export const withPostModeration = (
  WrappedComponent: Class<React.Component<*, *>>
) => {
  class WithPostModeration extends React.Component<*, *> {
    openRemovePostDialog = (post: Post) => {
      const { dispatch } = this.props

      dispatch(setFocusedPost(post))
      dispatch(showDialog(DIALOG_REMOVE_POST))
    }

    hideDialog = () => {
      const { dispatch } = this.props
      dispatch(clearFocusedPost())
      dispatch(hideDialog(DIALOG_REMOVE_POST))
    }

    removePost = async () => {
      const { dispatch, focusedPost, channelName } = this.props
      await removePost(dispatch, focusedPost)
      await dispatch(actions.reports.get(channelName))
      dispatch(
        setSnackbarMessage({
          message: "Post has been removed"
        })
      )
    }

    approvePost = async (post: Post) => {
      const { dispatch } = this.props
      await approvePost(dispatch, post)
      dispatch(
        setSnackbarMessage({
          message: "Post has been approved"
        })
      )
    }

    ignoreReports = async (post: Post) => {
      const { dispatch, channelName } = this.props

      await dispatch(actions.posts.patch(post.id, { ignore_reports: true }))
      await dispatch(actions.reports.get(channelName))
    }

    render() {
      const { showRemovePostDialog } = this.props

      return (
        <div>
          <Dialog
            id="remove-post-dialog"
            open={showRemovePostDialog}
            onAccept={this.removePost}
            hideDialog={this.hideDialog}
            submitText="Yes, remove"
          >
            <p>
              Are you sure? You will still be able to see the post, but it will
              be deleted for normal users. You can undo this later by clicking
              "approve".
            </p>
          </Dialog>
          <WrappedComponent
            {...this.props}
            removePost={this.openRemovePostDialog}
            approvePost={this.approvePost}
            ignorePostReports={this.ignoreReports}
          />
        </div>
      )
    }
  }
  return WithPostModeration
}

export const postModerationSelector = (state: Object, ownProps: Object) => {
  const { channels, reports, ui, focus } = state
  const channelName = getChannelName(ownProps)
  const channel = channels.data.get(channelName)
  const channelModerators = state.channelModerators.data.get(channelName) || []

  const userIsModerator = isModerator(channelModerators, SETTINGS.username)

  const loaded =
    channels.error || reports.error ? true : channels.loaded && reports.loaded

  const notFound = loaded
    ? channels.error && channels.error.errorStatusCode === 404
    : false

  return {
    channelName,
    channel,
    loaded,
    notFound,
    isModerator:          userIsModerator,
    subscribedChannels:   getSubscribedChannels(state),
    reports:              reports.data.reports,
    postReports:          state.reports.data.posts,
    showRemovePostDialog: ui.dialogs.has(DIALOG_REMOVE_POST),
    focusedPost:          focus.post,
    errored:              anyErrorExcept404([
      channels,
      state.posts,
      state.subscribedChannels
    ])
  }
}

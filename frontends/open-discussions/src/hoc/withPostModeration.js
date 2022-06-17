// @flow
/* global SETTINGS: false */
import React from "react"
import R from "ramda"
import qs from "query-string"

import ReportForm from "../components/ReportForm"
import Dialog from "../components/Dialog"

import { actions } from "../actions"
import { approvePost, removePost } from "../util/api_actions"
import {
  setSnackbarMessage,
  showDialog,
  hideDialog,
  DIALOG_REMOVE_POST,
  DIALOG_DELETE_POST
} from "../actions/ui"
import { setFocusedPost, clearFocusedPost } from "../actions/focus"
import { getChannelName } from "../lib/util"
import { getSubscribedChannels } from "../lib/redux_selectors"
import { anyErrorExcept404 } from "../util/rest"
import {
  getReportForm,
  onReportUpdate,
  REPORT_CONTENT_PAYLOAD,
  REPORT_CONTENT_NEW_FORM
} from "../lib/reports"
import { preventDefaultAndInvoke } from "../lib/util"
import { formBeginEdit, formEndEdit } from "../actions/forms"
import { validateContentReportForm } from "../lib/validation"

import type { Post } from "../flow/discussionTypes"

export const REPORT_POST_DIALOG = "REPORT_POST_DIALOG"

export const withPostModeration = (
  WrappedComponent: Class<React.Component<*, *>>
) => {
  class WithPostModeration extends React.Component<*, *> {
    static WrappedComponent: Class<React.Component<*, *>>

    openRemovePostDialog = (post: Post) => {
      const { dispatch } = this.props

      dispatch(setFocusedPost(post))
      dispatch(showDialog(DIALOG_REMOVE_POST))
    }

    openDeletePostDialog = (post: Post) => {
      const { dispatch } = this.props

      dispatch(setFocusedPost(post))
      dispatch(showDialog(DIALOG_DELETE_POST))
    }

    openReportPostDialog = (post: Post) => {
      const { dispatch } = this.props

      dispatch(setFocusedPost(post))
      dispatch(formBeginEdit({ ...REPORT_CONTENT_NEW_FORM }))
      dispatch(showDialog(REPORT_POST_DIALOG))
    }

    hideRemoveDialog = () => {
      const { dispatch } = this.props
      dispatch(clearFocusedPost())
      dispatch(hideDialog(DIALOG_REMOVE_POST))
    }

    hideDeleteDialog = () => {
      const { dispatch } = this.props
      dispatch(clearFocusedPost())
      dispatch(hideDialog(DIALOG_DELETE_POST))
    }

    removePost = async (event: Event) => {
      const {
        dispatch,
        focusedPost,
        channelName,
        shouldGetReports
      } = this.props

      event.preventDefault()
      await removePost(dispatch, focusedPost)
      if (shouldGetReports) {
        await dispatch(actions.reports.get(channelName))
      }
      await this.refreshPostList()

      this.hideRemoveDialog()
      dispatch(
        setSnackbarMessage({
          message: "Post has been removed"
        })
      )
    }

    refreshPostList = async () => {
      const {
        loadPosts,
        clearPosts,
        location: { search }
      } = this.props

      if (loadPosts && clearPosts) {
        clearPosts()
        await loadPosts(qs.parse(search))
      }
    }

    deletePost = async (event: Event) => {
      // ⚠️  this is a destructive action! ⚠️
      const {
        dispatch,
        shouldGetReports,
        focusedPost,
        channelName
      } = this.props

      event.preventDefault()
      await dispatch(actions.posts["delete"](focusedPost.id))
      if (shouldGetReports) {
        await dispatch(actions.reports.get(channelName))
      }
      await this.refreshPostList()

      this.hideDeleteDialog()
      dispatch(
        setSnackbarMessage({
          message: "Post has been deleted"
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
      const { dispatch, channelName, shouldGetReports } = this.props

      await dispatch(actions.posts.patch(post.id, { ignore_reports: true }))
      if (shouldGetReports) {
        await dispatch(actions.reports.get(channelName))
      }
    }

    hideReportPostDialog = () => {
      const { dispatch } = this.props
      dispatch(formEndEdit({ ...REPORT_CONTENT_PAYLOAD }))
      dispatch(hideDialog(REPORT_POST_DIALOG))
      dispatch(clearFocusedPost())
    }

    reportPost = async () => {
      const { dispatch, focusedPost, forms } = this.props
      const form = getReportForm(forms)
      const { reason } = form.value
      const validation = validateContentReportForm(form)

      if (!R.isEmpty(validation)) {
        dispatch(
          actions.forms.formValidate({
            ...REPORT_CONTENT_PAYLOAD,
            errors: validation.value
          })
        )
      } else {
        await dispatch(
          actions.reports.post({
            post_id: focusedPost.id,
            reason:  reason
          })
        )

        this.hideReportPostDialog()
        dispatch(
          setSnackbarMessage({
            message: "Post has been reported"
          })
        )
      }
    }

    render() {
      const {
        showRemovePostDialog,
        showDeletePostDialog,
        reportPostDialogVisible,
        forms,
        dispatch
      } = this.props

      const reportForm = getReportForm(forms)

      return (
        <React.Fragment>
          <Dialog
            open={reportPostDialogVisible}
            hideDialog={preventDefaultAndInvoke(this.hideReportPostDialog)}
            onCancel={this.hideReportPostDialog}
            onAccept={this.reportPost}
            validateOnClick={true}
            title="Report Post"
            submitText="Yes, Report"
            id="report-post-dialog"
          >
            {reportForm ? (
              <ReportForm
                reportForm={reportForm.value}
                validation={reportForm.errors}
                onUpdate={onReportUpdate(dispatch)}
                description="Are you sure you want to report this post for violating the rules of this site?"
                label="Why are you reporting this post?"
              />
            ) : null}
          </Dialog>
          <Dialog
            id="remove-post-dialog"
            open={showRemovePostDialog}
            onAccept={this.removePost}
            hideDialog={this.hideRemoveDialog}
            submitText="Yes, remove"
            title="Remove Post"
          >
            <p>
              Are you sure? After you remove the post, it will no longer appear
              in channel listings but you can access it directly. You can undo
              this later by clicking "approve".
            </p>
          </Dialog>
          <Dialog
            id="delete-post-dialog"
            open={showDeletePostDialog}
            onAccept={this.deletePost}
            hideDialog={this.hideDeleteDialog}
            submitText="Yes, delete"
            title="Delete Post"
          >
            <p>
              Are you sure you want to delete this post? This is a permanent
              action and cannot be reversed.
            </p>
          </Dialog>
          <WrappedComponent
            {...this.props}
            removePost={this.openRemovePostDialog}
            deletePost={this.openDeletePostDialog}
            approvePost={this.approvePost}
            ignorePostReports={this.ignoreReports}
            reportPost={this.openReportPostDialog}
          />
        </React.Fragment>
      )
    }
  }

  WithPostModeration.WrappedComponent = WrappedComponent
  WithPostModeration.displayName = `withPostModeration(${WrappedComponent.name})`
  return WithPostModeration
}

export const postModerationSelector = (state: Object, ownProps: Object) => {
  const { channels, reports, ui, focus, forms } = state
  const channelName = ownProps.channelName || getChannelName(ownProps)
  const channel = channels.data.get(channelName)

  const userIsModerator = channel && channel.user_is_moderator

  const loaded =
    channels.error || reports.error ? true : channels.loaded && reports.loaded

  const notFound = loaded
    ? channels.error && channels.error.errorStatusCode === 404
    : false

  const notAuthorized = loaded
    ? channels.error && channels.error.errorStatusCode === 403
    : false

  return {
    forms,
    channelName,
    channel,
    loaded,
    notFound,
    notAuthorized,
    shouldGetReports:        false, // by default, we won't fetch these
    isModerator:             userIsModerator,
    subscribedChannels:      getSubscribedChannels(state),
    reports:                 reports.data.reports,
    showRemovePostDialog:    ui.dialogs.has(DIALOG_REMOVE_POST),
    showDeletePostDialog:    ui.dialogs.has(DIALOG_DELETE_POST),
    reportPostDialogVisible: ui.dialogs.has(REPORT_POST_DIALOG),
    focusedPost:             focus.post,
    errored:                 anyErrorExcept404([
      channels,
      state.posts,
      state.subscribedChannels
    ])
  }
}

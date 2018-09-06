// @flow
/* global SETTINGS: false */
import React from "react"
import { Dialog } from "@mitodl/mdl-react-components"
import R from "ramda"

import ReportForm from "../components/ReportForm"

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

const REPORT_POST_DIALOG = "REPORT_POST_DIALOG"

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

    removePost = async () => {
      const {
        dispatch,
        focusedPost,
        channelName,
        shouldGetReports
      } = this.props
      await removePost(dispatch, focusedPost)
      if (shouldGetReports) {
        await dispatch(actions.reports.get(channelName))
      }
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
                description="Are you sure you want to report this post for violating the rules of MIT Open Discussions?"
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
            reportPost={this.openReportPostDialog}
          />
        </React.Fragment>
      )
    }
  }

  WithPostModeration.WrappedComponent = WrappedComponent
  WithPostModeration.displayName = `withPostModeration(${
    WrappedComponent.name
  })`
  return WithPostModeration
}

export const postModerationSelector = (state: Object, ownProps: Object) => {
  const { channels, reports, ui, focus, forms } = state
  const channelName = getChannelName(ownProps)
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
    reportPostDialogVisible: ui.dialogs.has(REPORT_POST_DIALOG),
    focusedPost:             focus.post,
    errored:                 anyErrorExcept404([
      channels,
      state.posts,
      state.subscribedChannels
    ])
  }
}

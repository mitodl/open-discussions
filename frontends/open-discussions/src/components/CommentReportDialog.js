// @flow
import React, { useCallback } from "react"
import { Formik, Form, Field } from "formik"
import { useDispatch } from "react-redux"

import Dialog from "./Dialog"

import { validationMessage, validateCommentReportForm } from "../lib/validation"
import { actions } from "../actions"
import { setSnackbarMessage } from "../actions/ui"

import type { CommentInTree } from "../flow/discussionTypes"

type Props = {
  comment: CommentInTree,
  hideDialog: Function
}

export default function CommentReportDialog(props: Props) {
  const { comment, hideDialog } = props

  const dispatch = useDispatch()

  const reportComment = useCallback(
    async reason => {
      await dispatch(
        actions.reports.post({
          comment_id: comment.id,
          reason
        })
      )
      hideDialog()
      dispatch(
        setSnackbarMessage({
          message: "Comment has been reported"
        })
      )
    },
    [dispatch, comment, hideDialog]
  )

  return (
    <Formik
      onSubmit={async (values, actions) => {
        const { reason } = values
        reportComment(reason)
      }}
      initialValues={{
        reason: ""
      }}
      validate={validateCommentReportForm}
      validateOnBlur={false}
      validateOnChange={false}
    >
      {({ handleSubmit, errors }) => (
        <Form>
          <Dialog
            open={true}
            hideDialog={hideDialog}
            onCancel={hideDialog}
            onAccept={handleSubmit}
            validateOnClick={true}
            title="Report Comment"
            submitText="Yes, Report"
            id="report-comment-dialog"
          >
            <div className="form">
              <p>
                Are you sure you want to report this comment for violating the
                rules of this site?
              </p>
              <div className="reason row">
                <label>Why are you reporting this comment?</label>
                <Field
                  type="text"
                  name="reason"
                  placeholder="e.g. this is spam, abusive, etc"
                />
                {validationMessage(errors.reason)}
              </div>
            </div>
          </Dialog>
        </Form>
      )}
    </Formik>
  )
}

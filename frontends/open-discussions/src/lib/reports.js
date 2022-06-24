// @flow
import R from "ramda"

import { actions } from "../actions"

export const REPORT_FORM_KEY = "report:content"

export const getReportForm = R.prop(REPORT_FORM_KEY)

export const REPORT_CONTENT_PAYLOAD = {
  formKey: REPORT_FORM_KEY
}

export const REPORT_CONTENT_NEW_FORM = {
  ...REPORT_CONTENT_PAYLOAD,
  value: {
    reason: ""
  }
}

export const onReportUpdate = R.curry((dispatch: Function, e: Object) => {
  dispatch(
    actions.forms.formUpdate({
      ...REPORT_CONTENT_PAYLOAD,
      value: {
        [e.target.name]: e.target.value
      }
    })
  )
})

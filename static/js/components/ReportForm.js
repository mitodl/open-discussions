// @flow
import React from "react"

import { validationMessage } from "../lib/validation"

import type { GenericReport, ReportValidation } from "../flow/discussionTypes"

type ReportFormProps = {
  onUpdate: Function,
  reportForm: GenericReport,
  validation: ReportValidation,
  description: string,
  label: string
}

const ReportForm = ({
  reportForm,
  validation,
  onUpdate,
  description,
  label
  }: ReportFormProps) => {
  const { reason } = reportForm
  return (
    <div className="form">
      <p>
        {description}
      </p>
      <div className="reason row">
        <label>
          {label}
        </label>
        <input
          type="text"
          placeholder="e.g. this is spam, abusive, etc"
          name="reason"
          value={reason}
          onChange={onUpdate}
        />
        {validationMessage(validation.reason)}
      </div>
    </div>
  )
}

export default ReportForm

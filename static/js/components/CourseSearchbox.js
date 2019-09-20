// @flow
import React from "react"

import { validationMessage } from "../lib/validation"

type Props = {
  onChange?: Function,
  value?: string,
  onSubmit: Function,
  validation?: ?string,
  autoFocus?: boolean,
  children?: React$Node
}

export default function CourseSearchbox(props: Props) {
  const { onChange, value, onSubmit, validation, autoFocus, children } = props

  return (
    <div className="course-searchbox">
      <div className="input-wrapper">
        <input
          autoFocus={autoFocus}
          type="text"
          name="query"
          className="search-input"
          onChange={onChange}
          onKeyDown={event => (event.key === "Enter" ? onSubmit(event) : null)}
          placeholder="Search Learning Offerings"
          value={value}
        />
        <i className="material-icons search-icon" onClick={onSubmit}>
          search
        </i>
        {children}
      </div>
      {validationMessage(validation)}
    </div>
  )
}

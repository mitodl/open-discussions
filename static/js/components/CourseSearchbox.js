// @flow
import React, { useState } from "react"

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

  const [text, setText] = useState("")

  return (
    <div className="course-searchbox">
      <div className="input-wrapper">
        <input
          autoFocus={autoFocus}
          type="text"
          name="query"
          className="search-input"
          onChange={
            onChange ||
            (e => {
              const { value } = e.target
              setText(value)
            })
          }
          onKeyDown={event => (event.key === "Enter" ? onSubmit(event) : null)}
          placeholder="Search Learning Offerings"
          value={value}
        />
        <i
          className="material-icons search-icon"
          onClick={
            onChange ? onSubmit : () => onSubmit({ target: { value: text } })
          }
        >
          search
        </i>
        {children}
      </div>
      {validationMessage(validation)}
    </div>
  )
}

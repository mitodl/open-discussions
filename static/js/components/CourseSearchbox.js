// @flow
import React, { useState } from "react"

import { validationMessage } from "../lib/validation"

type Props = {
  onChange?: Function,
  onClear?: Function,
  value?: string,
  onSubmit: Function,
  validation?: ?string,
  autoFocus?: boolean,
  children?: React$Node
}

export default function CourseSearchbox(props: Props) {
  const { children, onChange, onClear, onSubmit, validation, value } = props

  const [text, setText] = useState("")

  return (
    <div className="course-searchbox">
      <div className="input-wrapper">
        <input
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
        {value ? (
          <i
            className="material-icons clear-icon"
            onClick={onClear}
            onKeyPress={e => {
              if (e.key === "Enter" && onClear) {
                onClear()
              }
            }}
            tabIndex="0"
          >
            clear
          </i>
        ) : null}
        {children}
      </div>
      {validationMessage(validation)}
    </div>
  )
}

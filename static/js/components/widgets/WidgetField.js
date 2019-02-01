/* global SETTINGS: false */
// @flow
import React from "react"
import R from "ramda"

import Editor, { editorUpdateFormShim } from "../Editor"
import EmbedlyCard from "../EmbedlyCard"

import type { WidgetFieldSpec } from "../../flow/widgetTypes"
import {
  WIDGET_FIELD_TYPE_MARKDOWN,
  WIDGET_FIELD_TYPE_NUMBER,
  WIDGET_FIELD_TYPE_TEXTAREA,
  WIDGET_FIELD_TYPE_URL
} from "../../lib/constants"

type Props = {
  fieldSpec: WidgetFieldSpec,
  onChange: (event: any) => void,
  value: any
}

const WidgetField = ({ fieldSpec, value, onChange }: Props) => {
  const valueOrDefault = R.defaultTo(fieldSpec.default || "", value)
  switch (fieldSpec.input_type) {
  case WIDGET_FIELD_TYPE_MARKDOWN:
    return (
      <Editor
        initialValue={valueOrDefault}
        onChange={editorUpdateFormShim("text", onChange)}
        placeHolder=""
      />
    )
  case WIDGET_FIELD_TYPE_TEXTAREA:
    return (
      <textarea
        value={valueOrDefault}
        className="field"
        onChange={onChange}
        minLength={fieldSpec.props.min_length}
        maxLength={fieldSpec.props.max_length}
        placeholder={fieldSpec.props.placeholder}
      />
    )
  case WIDGET_FIELD_TYPE_NUMBER:
    return (
      <select className="field" value={valueOrDefault} onChange={onChange}>
        {R.range(fieldSpec.props.min, fieldSpec.props.max + 1).map(index => (
          <option value={index} key={index}>
            {index}
          </option>
        ))}
      </select>
    )
  case WIDGET_FIELD_TYPE_URL:
    return (
      <React.Fragment>
        <input
          type="text"
          className="field"
          value={valueOrDefault}
          onChange={onChange}
          minLength={fieldSpec.props.min_length}
          maxLength={fieldSpec.props.max_length}
          placeholder={fieldSpec.props.placeholder}
        />
        {fieldSpec.props.show_embed ? (
          <EmbedlyCard url={valueOrDefault} />
        ) : null}
      </React.Fragment>
    )
  default:
    return (
      <input
        type="text"
        className="field"
        value={valueOrDefault}
        onChange={onChange}
        minLength={fieldSpec.props.min_length}
        maxLength={fieldSpec.props.max_length}
        placeholder={fieldSpec.props.placeholder}
      />
    )
  }
}

export default WidgetField

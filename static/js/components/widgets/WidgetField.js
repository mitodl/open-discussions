// @flow
import React from "react"
import R from "ramda"

import Editor, { editorUpdateFormShim } from "../../components/Editor"
import EmbedlyContainer from "../../containers/EmbedlyContainer"

import type { WidgetFieldSpec } from "../../flow/widgetTypes"

type Props = {
  fieldSpec: WidgetFieldSpec,
  onChange: (event: any) => void,
  value: any
}

const WidgetField = ({ fieldSpec, value, onChange }: Props) => {
  const valueOrDefault = R.defaultTo(fieldSpec.default || "", value)
  switch (fieldSpec.input_type) {
  case "markdown_wysiwyg":
    return (
      <Editor
        initialValue={valueOrDefault}
        onChange={editorUpdateFormShim("text", onChange)}
        placeHolder=""
      />
    )
  case "textarea":
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
  case "number":
    return (
      <select className="field" value={valueOrDefault} onChange={onChange}>
        {R.range(fieldSpec.props.min, fieldSpec.props.max + 1).map(index => (
          <option value={index} key={index}>
            {index}
          </option>
        ))}
      </select>
    )
  case "url":
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
        <EmbedlyContainer url={valueOrDefault} debounceKey="widget-field" />
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

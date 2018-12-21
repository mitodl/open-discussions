// @flow
import React from "react"

import type { WidgetFieldSpec } from "../../flow/widgetTypes"

type Props = {
  fieldSpec: WidgetFieldSpec,
  onChange: (event: any) => void,
  value: any
}

const WidgetField = ({ fieldSpec, value, onChange }: Props) => {
  const valueOrDefault = value !== undefined ? value : fieldSpec.props.default
  switch (fieldSpec.input_type) {
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
      <input
        type="number"
        className="field"
        value={valueOrDefault}
        onChange={onChange}
        min={fieldSpec.props.min}
        max={fieldSpec.props.max}
      />
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

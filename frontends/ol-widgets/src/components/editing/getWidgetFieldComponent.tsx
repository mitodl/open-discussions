import React from "react"
import type { WidgetFieldSpec } from "../../interfaces"

/**
 * These are the fields formik will pass to our component when used via
 * `<Field as={SomeComponent} />`.
 *
 * See https://formik.org/docs/api/field#rendering
 */
interface WidgetEditingFieldProps {
  onChange: React.ChangeEventHandler
  onBlur: React.FocusEventHandler
  value: string
  name: string
}

type WidgetFieldComponent = React.FC<WidgetEditingFieldProps>

const getWidgetFieldComponent = (
  spec: WidgetFieldSpec
): WidgetFieldComponent | string => {
  if (spec.input_type === "markdown_wysiwyg") {
    return "textarea"
  }
  throw new Error("Unrecognized field input type.")
}

export { getWidgetFieldComponent }

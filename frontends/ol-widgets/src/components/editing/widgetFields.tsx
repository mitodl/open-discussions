import { mapKeys } from "lodash"
import { WIDGET_FIELD_TYPES } from "../../constants"
import { WidgetFieldSpec } from "../../interfaces"
import type { WidgetFieldComponent } from "./interfaces"
import MarkdownEditor from "./MarkdownEditor"
import UrlField from "./UrlField"

const getWidgetFieldComponent = (
  spec: WidgetFieldSpec
): WidgetFieldComponent | string => {
  if (spec.input_type === WIDGET_FIELD_TYPES.markdown) {
    return MarkdownEditor
  }
  if (spec.input_type === WIDGET_FIELD_TYPES.url) {
    return UrlField
  }
  if (spec.input_type === WIDGET_FIELD_TYPES.textarea) {
    return "textarea"
  }
  throw new Error(`Unrecognized field input type: '${spec.input_type}'`)
}

const propRenames: Record<string, Record<string, string>> = {
  [WIDGET_FIELD_TYPES.url]: {
    min_length: "minLength",
    max_length: "maxLength",
    show_embed: "showEmbed"
  }
}

const renameFieldProps = (fieldSpec: WidgetFieldSpec) => {
  const renames = propRenames[fieldSpec.field_name] ?? {}
  return mapKeys(fieldSpec.props, (_value, key) => renames[key] ?? key)
}

export { getWidgetFieldComponent, renameFieldProps }

import { WIDGET_FIELD_TYPES } from "../../constants"
import type { WidgetFieldSpec } from "../../interfaces"
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
    return 'textarea'
  }
  throw new Error(`Unrecognized field input type: '${spec.input_type}'`)
}

export { getWidgetFieldComponent }

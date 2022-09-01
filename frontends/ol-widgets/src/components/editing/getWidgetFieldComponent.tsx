import { WIDGET_FIELD_TYPES } from "../../constants"
import type { WidgetFieldSpec } from "../../interfaces"
import type { WidgetFieldComponent } from "./interfaces"
import MarkdownEditor from "./MarkdownEditor"

const getWidgetFieldComponent = (
  spec: WidgetFieldSpec
): WidgetFieldComponent | string => {
  if (spec.input_type === WIDGET_FIELD_TYPES.markdown) {
    return MarkdownEditor
  }
  throw new Error("Unrecognized field input type.")
}

export { getWidgetFieldComponent }

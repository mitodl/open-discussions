// @flow
import R from "ramda"
import casual from "casual-browserify"

import { incrementer } from "../lib/util"
import { validWidgetRenderers } from "../lib/widgets"

import type {
  WidgetFieldSpec,
  WidgetInstance,
  WidgetListResponse,
  WidgetSpec
} from "../flow/widgetTypes"

export const validWidgetTypes = ["Markdown", "URL", "Text", "RSS Feed"]
export const validFieldSpecTypes = ["text", "textarea", "number"]

const instanceIncr = incrementer()
const listIncr = incrementer()

export const makeWidgetConfiguration = (widgetName: string): Object => {
  switch (widgetName) {
  case "Markdown":
    return { source: `**${casual.word}**` }
  case "URL":
    return { url: casual.url }
  case "Text":
    return { body: casual.sentence }
  case "RSS Feed":
    return {
      url:                casual.url,
      feed_display_limit: casual.integer(0, 15)
    }
  default:
    return {}
  }
}

export const makeWidgetInstance = (
  rendererName: ?string = null,
  widgetType: ?string = null
): WidgetInstance => {
  if (!rendererName) {
    rendererName = casual.random_element(Object.keys(validWidgetRenderers))
  }

  if (!widgetType) {
    widgetType = casual.random_element(validWidgetTypes)
  }

  return {
    // $FlowFixMe
    id:             instanceIncr.next().value,
    widget_type:    widgetType,
    react_renderer: rendererName,
    title:          casual.sentence,
    html:           casual.boolean ? `<b>${casual.words}</b>` : null,
    configuration:  makeWidgetConfiguration(rendererName)
  }
}

export const makeFieldSpec = (
  specType: ?string = null,
  suffix: string = ""
): WidgetFieldSpec => {
  if (!specType) {
    specType = casual.random_element(validFieldSpecTypes)
  }
  const common = {
    field_name: `field_${suffix}`,
    label:      `Field ${suffix}`,
    input_type: specType
  }

  switch (specType) {
  case "number":
    return {
      ...common,
      props: {
        min: 0,
        max: casual.integer(1, 8)
      },
      default: 3
    }

  default:
    // text-like fields
    return {
      ...common,
      props: {
        max_length:  "",
        min_length:  "",
        placeholder: `Placeholder ${casual.words}`
      },
      default: ""
    }
  }
}

export const makeWidgetSpec = (widgetType: ?string = null): WidgetSpec => {
  if (!widgetType) {
    widgetType = casual.random_element(validWidgetTypes)
  }

  return {
    widget_type: widgetType,
    form_spec:   R.range(1, 5).map(i => makeFieldSpec(null, i))
  }
}

export const makeWidgetListResponse = (): WidgetListResponse => ({
  // $FlowFixMe
  id:                listIncr.next().value,
  widgets:           R.range(1, 3).map(() => makeWidgetInstance()),
  available_widgets: validWidgetTypes.map(widgetType =>
    makeWidgetSpec(widgetType)
  )
})

// @flow
import R from "ramda"
import casual from "casual-browserify"

import {
  WIDGET_FIELD_TYPE_MARKDOWN,
  WIDGET_FIELD_TYPE_NUMBER,
  WIDGET_FIELD_TYPE_URL,
  WIDGET_TYPE_MARKDOWN,
  WIDGET_TYPE_RSS,
  WIDGET_TYPE_URL
} from "../lib/constants"
import { incrementer } from "../lib/util"
import { validWidgetRenderers } from "../lib/widgets"

import type {
  WidgetFieldSpec,
  WidgetInstance,
  WidgetListResponse,
  WidgetSpec,
  RSSWidgetJson
} from "../flow/widgetTypes"

export const validFieldSpecTypes = ["text", "textarea", "number", "url"]

const instanceIncr = incrementer()
const listIncr = incrementer()

export const makeWidgetConfiguration = (widgetType: string): Object => {
  switch (widgetType) {
  case WIDGET_TYPE_MARKDOWN:
    return { source: `**${casual.word}**` }
  case WIDGET_TYPE_URL:
    return { url: casual.url }
  case WIDGET_TYPE_RSS:
    return {
      url:                casual.url,
      feed_display_limit: casual.integer(0, 15)
    }
  default:
    return {}
  }
}

export const makeWidgetJson = (widgetType: string): ?Object => {
  switch (widgetType) {
  case WIDGET_TYPE_MARKDOWN:
    return null
  case WIDGET_TYPE_URL:
    return null
  case WIDGET_TYPE_RSS:
    return ({
      title:   casual.title,
      entries: R.range(1, casual.integer(2, 8)).map(() => ({
        title:       casual.title,
        description: casual.description,
        link:        casual.url,
        timestamp:   casual.moment
      }))
    }: RSSWidgetJson)
  default:
    return {}
  }
}

export const makeWidgetInstance = (
  widgetType: ?string = null
): WidgetInstance => {
  if (!widgetType) {
    widgetType = casual.random_element(Object.keys(validWidgetRenderers))
  }

  return {
    // $FlowFixMe
    id:            instanceIncr.next().value,
    widget_type:   widgetType,
    title:         casual.sentence,
    json:          makeWidgetJson(widgetType),
    configuration: makeWidgetConfiguration(widgetType)
  }
}

export const makeFieldSpec = (
  specType?: string,
  name?: string
): WidgetFieldSpec => {
  if (!specType) {
    specType = casual.random_element(validFieldSpecTypes)
  }
  if (!name) {
    name = casual.name
  }
  const common = {
    field_name: name,
    label:      `Field ${name}`,
    input_type: specType
  }

  switch (specType) {
  case "number":
    return {
      ...common,
      props: {
        min: 1,
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
    widgetType = casual.random_element(Object.keys(validWidgetRenderers))
  }

  let fieldSpecs
  if (widgetType === WIDGET_TYPE_URL) {
    fieldSpecs = [makeFieldSpec(WIDGET_FIELD_TYPE_URL, "url")]
  } else if (widgetType === WIDGET_TYPE_MARKDOWN) {
    fieldSpecs = [makeFieldSpec(WIDGET_FIELD_TYPE_MARKDOWN, "source")]
  } else if (widgetType === WIDGET_TYPE_RSS) {
    fieldSpecs = [
      makeFieldSpec(WIDGET_FIELD_TYPE_URL, "url"),
      makeFieldSpec(WIDGET_FIELD_TYPE_NUMBER, "feed_display_limit")
    ]
  } else {
    throw new Error(`Unhandled case ${widgetType}, update factory code`)
  }

  return {
    widget_type: widgetType,
    description: casual.word,
    form_spec:   fieldSpecs
  }
}

export const makeWidgetListResponse = (): WidgetListResponse => ({
  // $FlowFixMe
  id:                listIncr.next().value,
  widgets:           R.range(1, 3).map(() => makeWidgetInstance()),
  available_widgets: Object.keys(validWidgetRenderers).map(widgetType =>
    makeWidgetSpec(widgetType)
  )
})

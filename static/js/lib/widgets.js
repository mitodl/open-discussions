// @flow
import MarkdownWidget from "../components/widgets/MarkdownWidget"

import { incrementer } from "./util"

import type { WidgetInstancePatchable } from "../flow/widgetTypes"

export const WIDGET_FORM_KEY = "widgets:edit"

export const validWidgetRenderers = {
  markdown: MarkdownWidget
}

const newWidgetIncr = incrementer()

export const newWidgetInstance = (): WidgetInstancePatchable => ({
  configuration: {},
  title:         "",
  widget_type:   "",
  newId:         `new-${String(newWidgetIncr.next().value)}`
})

export const getWidgetKey = (widgetInstance: WidgetInstancePatchable): string =>
  String(widgetInstance.id || widgetInstance.newId)

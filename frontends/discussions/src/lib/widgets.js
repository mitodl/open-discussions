// @flow
import MarkdownWidget from "../components/widgets/MarkdownWidget"
import RssWidget from "../components/widgets/RssWidget"
import UrlWidget from "../components/widgets/UrlWidget"
import PeopleWidget from "../components/widgets/PeopleWidget"

import {
  WIDGET_TYPE_MARKDOWN,
  WIDGET_TYPE_PEOPLE,
  WIDGET_TYPE_RSS,
  WIDGET_TYPE_URL
} from "./constants"
import { incrementer } from "./util"

import type { WidgetInstance } from "../flow/widgetTypes"

export const WIDGET_FORM_KEY = "widgets:edit"

export const validWidgetRenderers = {
  [WIDGET_TYPE_MARKDOWN]: MarkdownWidget,
  [WIDGET_TYPE_RSS]:      RssWidget,
  [WIDGET_TYPE_URL]:      UrlWidget,
  [WIDGET_TYPE_PEOPLE]:   PeopleWidget
}

const newWidgetIncr = incrementer()

export const newWidgetInstance = (): WidgetInstance => ({
  configuration: {},
  title:         "",
  widget_type:   "",
  newId:         `new-${String(newWidgetIncr.next().value)}`,
  json:          null
})

export const getWidgetKey = (widgetInstance: WidgetInstance): string =>
  String(widgetInstance.id || widgetInstance.newId)

// @flow
export type WidgetInstancePatchable = {
  id?: number,
  widget_type: string,
  title: string,
  configuration: Object,
  newId?: string
}

export type WidgetInstance = WidgetInstancePatchable & {
  json: any,
}

export type WidgetFieldSpec = {
  field_name: string,
  label: string,
  input_type: string,
  props: Object,
  default: any
}

export type WidgetSpec = {
  widget_type: string,
  description: string,
  form_spec: Array<WidgetFieldSpec>
}

export type WidgetListResponse = {
  id: number,
  widgets: Array<WidgetInstance>,
  available_widgets: Array<WidgetSpec>
}

export type WidgetDialogData = {
  state: string,
  instance: WidgetInstancePatchable,
  validation: Object
}

export type RSSWidgetEntry = {
  title: string,
  description: string,
  link: string,
  timestamp: string,
}

export type RSSWidgetJson = {
  title: string,
  entries: Array<RSSWidgetEntry>
}

export type WidgetForm = {
  instances: Array<WidgetInstance>,
  expanded: ?{[string]: boolean}
}

export type WidgetComponentProps = {
  widgetInstance: WidgetInstance
}

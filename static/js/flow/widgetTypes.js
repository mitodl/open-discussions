// @flow
export type WidgetInstancePatchable = {
  id?: number,
  widget_type: string,
  title: string,
  configuration: Object,
}

export type WidgetInstance = WidgetInstancePatchable & {
  react_renderer: string,
  html: string|null,
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
  form_spec: Array<WidgetFieldSpec>
}

export type WidgetListResponse = {
  id: number,
  widgets: Array<WidgetInstance>,
  available_widgets: Array<WidgetSpec>
}

export type WidgetDialogData = {
  isEditing: boolean,
  state: string,
  instance: WidgetInstancePatchable,
  validation: Object
}

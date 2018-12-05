// @flow

export type WidgetListsResponse = Array<{
  id: number,
}>

export type WidgetListResponse = Array<{
  id: number,
  widget_class: string,
  react_renderer: string,
  postition: number,
  title: string,
  widget_list: number,
  source: string,
}>

type WidgetConfiguration = {
  key: string,
  label: string,
  inputType: string,
  props: Object
}

export type WidgetConfigurationsResponse = {
  widgetClassConfigurations: {
    [widgetClass: string]: Array<WidgetConfiguration>
  }
}

export type WidgetResponse = {
  widgetClassConfigurations: {
    [widgetClass: string]: Array<WidgetConfiguration>
  },
  widgetData: {
    source: string,
    title: string,
  }
}

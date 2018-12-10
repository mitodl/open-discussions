import React, { Component } from "react"

import WidgetForm from "./WidgetForm"

import { getWidget, updateWidget } from "../../lib/api"

export default class EditWidgetForm extends Component {
  state = {
    currentWidgetData:        null,
    widgetClass:              null,
    widgetClassConfiguration: null
  }

  componentDidMount() {
    this.loadData()
  }

  loadData = async () => {
    const { widgetId } = this.props

    const data = await getWidget(widgetId)
    this.setState({
      currentWidgetData:        data.widgetData,
      widgetClassConfiguration: data.widgetClassConfigurations,
      widgetClass:              Object.keys(data.widgetClassConfigurations)[0]
    })
  }

  onSubmit = async (widgetClass, formData) => {
    const { onSubmit, widgetId } = this.props
    const { title, ...configuration } = formData
    const data = await updateWidget(widgetId, {
      configuration: configuration,
      title:         title,
      widget_class:  widgetClass
    })
    onSubmit(data)
  }

  render() {
    const { Loader } = this.props
    const {
      widgetClass,
      widgetClassConfiguration,
      currentWidgetData
    } = this.state
    if (widgetClass === null || widgetClassConfiguration === null) {
      return <Loader />
    } else {
      return (
        <WidgetForm
          formData={currentWidgetData}
          onSubmit={this.onSubmit}
          widgetClass={widgetClass}
          widgetClassConfigurations={widgetClassConfiguration}
          widgetClasses={[widgetClass]}
        />
      )
    }
  }
}

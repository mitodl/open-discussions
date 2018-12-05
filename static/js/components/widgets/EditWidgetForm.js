import React, { Component } from "react"

import WidgetForm from "./WidgetForm"

import { apiPath } from "../../lib/widgets"

export default class EditWidgetForm extends Component {
  state = {
    currentWidgetData:        null,
    widgetClass:              null,
    widgetClassConfiguration: null
  }

  componentDidMount() {
    const { errorHandler, fetchData, widgetId } = this.props
    fetchData(apiPath("widget", widgetId))
      .then(data =>
        this.setState({
          currentWidgetData:        data.widgetData,
          widgetClassConfiguration: data.widgetClassConfigurations,
          widgetClass:              Object.keys(data.widgetClassConfigurations)[0]
        })
      )
      .catch(errorHandler)
  }

  onSubmit = (widgetClass, formData) => {
    const { errorHandler, fetchData, onSubmit, widgetId } = this.props
    const { title, ...configuration } = formData
    fetchData(apiPath("widget", widgetId), {
      body: JSON.stringify({
        configuration: configuration,
        title:         title,
        widget_class:  widgetClass
      }),
      method: "PATCH"
    })
      .then(onSubmit)
      .catch(errorHandler)
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

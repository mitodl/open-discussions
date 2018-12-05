import React, { Component } from "react"

import WidgetForm from "./WidgetForm"

import { apiPath } from "../../lib/widgets"

export default class NewWidgetForm extends Component {
  state = {
    widgetClassConfigurations: null,
    widgetClasses:             null
  }

  componentDidMount() {
    const { errorHandler, fetchData } = this.props
    fetchData(apiPath("get_configurations"))
      .then(data => {
        this.setState({
          widgetClassConfigurations: data.widgetClassConfigurations,
          widgetClasses:             Object.keys(data.widgetClassConfigurations)
        })
      })
      .catch(errorHandler)
  }

  onSubmit = (widgetClass, formData) => {
    const {
      errorHandler,
      fetchData,
      onSubmit,
      widgetListId,
      listLength
    } = this.props
    const { title, ...configuration } = formData
    fetchData(apiPath("widget"), {
      body: JSON.stringify({
        configuration: configuration,
        title:         title,
        position:      listLength,
        widget_list:   widgetListId,
        widget_class:  widgetClass
      }),
      method: "POST"
    })
      .then(onSubmit)
      .catch(errorHandler)
  }

  render() {
    const { Loader } = this.props
    const { widgetClasses, widgetClassConfigurations } = this.state
    if (widgetClasses === null || widgetClassConfigurations === null) {
      return <Loader />
    } else {
      return (
        <WidgetForm
          formData={{ title: null }}
          onSubmit={this.onSubmit}
          widgetClass={""}
          widgetClassConfigurations={widgetClassConfigurations}
          widgetClasses={widgetClasses}
        />
      )
    }
  }
}

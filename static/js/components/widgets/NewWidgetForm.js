import React, { Component } from "react"

import WidgetForm from "./WidgetForm"
import { getWidgetConfigurations, addWidget } from "../../lib/api"

export default class NewWidgetForm extends Component {
  state = {
    widgetClassConfigurations: null,
    widgetClasses:             null
  }

  componentDidMount() {
    this.loadData()
  }

  loadData = async () => {
    const data = await getWidgetConfigurations()
    this.setState({
      widgetClassConfigurations: data.widgetClassConfigurations,
      widgetClasses:             Object.keys(data.widgetClassConfigurations)
    })
  }

  onSubmit = async (widgetClass, formData) => {
    const { onSubmit, widgetListId, listLength } = this.props
    const { title, ...configuration } = formData
    const data = await addWidget({
      configuration: configuration,
      title:         title,
      position:      listLength,
      widget_list:   widgetListId,
      widget_class:  widgetClass
    })
    onSubmit(data)
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

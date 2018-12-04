import React, { Component } from "react"

import WidgetForm from "./WidgetForm"

import { apiPath } from "../../lib/widgets"

export default class NewWidgetForm extends Component {
  /**
   * NewWidgetForm handles rendering a WidgetForm for a new widget and directing that form data as a POST request to
   *    the backend
   *
   * State:
   *    widgetClasses: the classes of the widget available to create
   *    widgetClassConfigurations: an object that maps the widget classes to those classes' configurations
   *
   * Props:
   *    formProps (see makeFormProps in widget_list.js)
   *    formWrapperProps (defined by custom FormWrapper or _defaultFormWrapper in defaults.js
   */
  state = {
    widgetClassConfigurations: null,
    widgetClasses:             null
  }

  componentDidMount() {
    /**
     * Fetch data on available widget classes and set state
     */
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
    /**
     * onSubmit is the onClick behavior of the submit button. It parses the title out of the data and makes a POST
     *    request to the backend. Then it calls the passed in prop onSubmit
     *
     * inputs:
     *    widgetClass: the class of the widget to create.
     *    formData: data from the WidgetForm
     */
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
    /**
     * If data is loaded, render a blank widget form
     */
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

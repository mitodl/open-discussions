import React, { Component } from "react"

import WidgetForm from "./WidgetForm"

import { apiPath } from "../../lib/widgets"

export default class EditWidgetForm extends Component {
  /**
   * EditWidgetForm handles rendering a WidgetForm with initial data matching a current widget and sending that form
   *    as a PATCH request to the backend
   *
   * State:
   *    currentWidgetData: the current data of the widget to edit
   *    widgetClass: the class of the widget to edit
   *    widgetClassConfiguration: an object that maps the widget's class to that class's configuration
   *
   * Props:
   *    widgetId: id of the widget to edit
   *
   *    formProps (see makeFormProps in widget_list.js)
   *    formWrapperProps (defined by custom FormWrapper or _defaultFormWrapper in defaults.js
   */
  state = {
    currentWidgetData:        null,
    widgetClass:              null,
    widgetClassConfiguration: null
  }

  componentDidMount() {
    /**
     * Fetch data about the widget to edit and set state
     */
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
    /**
     * onSubmit is the onClick behavior of the submit button. It parses the title out of the data and makes a PATCH
     *    request to the backend. Then it calls the passed in prop onSubmit
     *
     * inputs:
     *    widgetClass: the class of the widget to edit. Less important for EditWidgetForm but allows WidgetForm to
     *        accept onSubmit from both Edit- and Add- WidgetForm components
     *    formData: data from the WidgetForm
     */
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
    /**
     * If data is loaded, render a widget form with initial data from the widget
     */
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

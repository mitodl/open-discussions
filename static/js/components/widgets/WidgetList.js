import React, { Component } from "react"

import FormWrapper from "./FormWrapper"
import ListWrapper from "./ListWrapper"
import Loader from "./Loader"
import Renderer from "./Renderer"
import WidgetWrapper from "./WidgetWrapper"
import EditWidgetForm from "./EditWidgetForm"
import NewWidgetForm from "./NewWidgetForm"

import { apiPath } from "../../lib/widgets"

export default class WidgetList extends Component {
  static defaultProps = {
    FormWrapper:            FormWrapper,
    formWrapperProps:       null,
    ListWrapper:            ListWrapper,
    listWrapperProps:       null,
    Loader:                 Loader,
    WidgetWrapper:          WidgetWrapper,
    widgetWrapperProps:     null,
    defaultRenderer:        Renderer,
    disableWidgetFramework: false,
    errorHandler:           console.error, // eslint-disable-line no-console
    fetchData:              () => {
      throw new Error("unimplemented")
    },
    renderers: {}
  }

  state = { widgetInstances: null }

  componentDidMount() {
    this.loadData()
  }

  componentDidUpdate(prevProps) {
    if (prevProps.widgetListId !== this.props.widgetListId) {
      this.loadData()
    }
  }

  loadData = () => {
    const { widgetListId, errorHandler, fetchData } = this.props
    fetchData(apiPath("widget_list", widgetListId))
      .then(this.updateWidgetList)
      .catch(errorHandler)
  }

  updateWidgetList = data => {
    this.setState({ widgetInstances: data })
  }

  deleteWidget = widgetId => {
    const { errorHandler, fetchData } = this.props
    fetchData(apiPath("widget", widgetId), { method: "DELETE" })
      .then(this.updateWidgetList)
      .catch(errorHandler)
  }

  moveWidget = (widgetId, position) => {
    const { errorHandler, fetchData } = this.props
    fetchData(apiPath("widget", widgetId), {
      body:   JSON.stringify({ position: position }),
      method: "PATCH"
    })
      .then(this.updateWidgetList)
      .catch(errorHandler)
  }

  makePassThroughProps = widgetInstance => {
    const { widgetListId } = this.props
    const { widgetInstances } = this.state
    let passThroughProps = {
      deleteWidget:         this.deleteWidget,
      listLength:           widgetInstances.length,
      moveWidget:           this.moveWidget,
      renderList:           this.renderListBody,
      renderWidget:         this.renderWidgetBody,
      renderEditWidgetForm: this.renderEditWidgetForm,
      renderNewWidgetForm:  this.renderNewWidgetForm,
      updateWidgetList:     this.updateWidgetList,
      widgetListId:         widgetListId
    }
    if (widgetInstance !== undefined) {
      passThroughProps = Object.assign(passThroughProps, {
        deleteWidget:         () => this.deleteWidget(widgetInstance.id),
        moveWidget:           position => this.moveWidget(widgetInstance.id, position),
        renderEditWidgetForm: () =>
          this.renderEditWidgetForm(widgetInstance.id),
        renderWidget: () => this.renderWidgetBody(widgetInstance)
      })
    }

    return passThroughProps
  }

  makeFormProps = () => {
    const { widgetListId, errorHandler, fetchData, Loader } = this.props
    const { widgetInstances } = this.state
    return {
      fetchData:    fetchData,
      errorHandler: errorHandler,
      Loader:       Loader,
      widgetListId: widgetListId,
      listLength:   widgetInstances.length,
      onSubmit:     this.updateWidgetList
    }
  }

  renderWidgetList = () => {
    const { ListWrapper, listWrapperProps } = this.props
    return (
      <ListWrapper {...this.makePassThroughProps()} {...listWrapperProps} />
    )
  }

  renderListBody = listWrapperProps => {
    const { widgetInstances } = this.state
    return widgetInstances.map(widgetInstance =>
      this.renderWidget(widgetInstance, listWrapperProps)
    )
  }

  renderWidget = (widgetInstance, listWrapperProps) => {
    const { WidgetWrapper, widgetWrapperProps } = this.props
    return (
      <WidgetWrapper
        key={widgetInstance.id}
        {...widgetInstance}
        {...this.makePassThroughProps(widgetInstance)}
        {...widgetWrapperProps}
        {...listWrapperProps}
      />
    )
  }

  renderWidgetBody = widgetInstance => {
    const { renderers, defaultRenderer } = this.props
    const Renderer = renderers[widgetInstance.react_renderer] || defaultRenderer
    return <Renderer {...widgetInstance} {...widgetInstance.configuration} />
  }

  renderEditWidgetForm = (widgetId, listWrapperProps) => {
    const { FormWrapper, formWrapperProps } = this.props
    return (
      <FormWrapper
        {...this.makePassThroughProps(widgetId)}
        renderForm={formProps =>
          this.renderEditWidgetFormBody(widgetId, formProps)
        }
        {...formWrapperProps}
        {...listWrapperProps}
      />
    )
  }

  renderEditWidgetFormBody = (widgetId, formWrapperProps) => {
    return (
      <EditWidgetForm
        {...this.makeFormProps()}
        widgetId={widgetId}
        {...formWrapperProps}
      />
    )
  }

  renderNewWidgetForm = listWrapperProps => {
    const { FormWrapper, formWrapperProps } = this.props
    return (
      <FormWrapper
        {...this.makePassThroughProps()}
        renderForm={formProps => this.renderNewWidgetFormBody(formProps)}
        {...formWrapperProps}
        {...listWrapperProps}
      />
    )
  }

  renderNewWidgetFormBody = formWrapperProps => {
    return <NewWidgetForm {...this.makeFormProps()} {...formWrapperProps} />
  }

  render() {
    const { disableWidgetFramework, Loader } = this.props
    const { widgetInstances } = this.state
    if (disableWidgetFramework) {
      return null
    } else if (widgetInstances === null) {
      return <Loader />
    } else {
      return <div className="widget-list">{this.renderWidgetList()}</div>
    }
  }
}

// @flow
import React from "react"
import { connect } from "react-redux"
import R from "ramda"
import { arrayMove } from "react-sortable-hoc"

import { Loading } from "../../components/Loading"
import WidgetList from "../../components/widgets/WidgetList"

import { actions } from "../../actions"
import { WIDGET_FORM_KEY } from "../../lib/widgets"

import type { Dispatch } from "redux"
import type {
  WidgetInstance as WidgetInstanceType,
  WidgetListResponse
} from "../../flow/widgetTypes"
import type { FormValue } from "../../flow/formTypes"

type PatchPayload = {
  id: number,
  widgets: Array<WidgetInstanceType>
}

type Props = {
  clearForm: () => Promise<void>,
  form: FormValue<Array<WidgetInstanceType>>,
  loaded: boolean,
  widgetListId: number,
  loadWidgets: () => Promise<WidgetListResponse>,
  updateWidgetInstances: (widgetInstances: Array<WidgetInstanceType>) => void,
  patchWidgetInstances: (payload: PatchPayload) => Promise<WidgetListResponse>,
  widgetInstances: Array<WidgetInstanceType>
}

export class WidgetListContainer extends React.Component<Props> {
  componentDidMount() {
    const { clearForm } = this.props
    this.loadData()
    clearForm()
  }

  componentDidUpdate(prevProps: Props) {
    const { clearForm } = this.props
    if (prevProps.widgetListId !== this.props.widgetListId) {
      this.loadData()
      clearForm()
    }
  }

  loadData = async () => {
    const { loadWidgets } = this.props
    await loadWidgets()
  }

  onSortEnd = ({
    oldIndex,
    newIndex
  }: {
    oldIndex: number,
    newIndex: number
  }) => {
    const { updateWidgetInstances } = this.props
    const widgetInstances = this.getWidgetInstances()
    updateWidgetInstances(arrayMove(widgetInstances, oldIndex, newIndex))
  }

  deleteInstance = (widgetInstance: WidgetInstanceType) => {
    const { updateWidgetInstances } = this.props
    const widgetInstances = this.getWidgetInstances().filter(
      _widgetInstance => _widgetInstance.id !== widgetInstance.id
    )
    updateWidgetInstances(widgetInstances)
  }

  getWidgetInstances = () => {
    const { widgetInstances, form } = this.props
    if (!form || !form.value) {
      return widgetInstances
    }
    return form.value
  }

  submitForm = async () => {
    const { form, patchWidgetInstances, widgetListId, clearForm } = this.props
    if (!form || !form.value) {
      // no need to make any changes
      return
    }

    await patchWidgetInstances({
      widgets: form.value,
      id:      widgetListId
    })
    clearForm()
  }

  render() {
    const { clearForm, form, loaded } = this.props
    if (!loaded) {
      return <Loading />
    }

    return (
      <WidgetList
        editing={!!form}
        widgetInstances={this.getWidgetInstances()}
        onSortEnd={this.onSortEnd}
        clearForm={clearForm}
        submitForm={this.submitForm}
        deleteInstance={this.deleteInstance}
        useDragHandle={true}
      />
    )
  }
}

const mapStateToProps = state => ({
  form:            state.forms[WIDGET_FORM_KEY],
  loaded:          state.widgets.loaded,
  widgetInstances: state.widgets.data.widgets
})

const mapDispatchToProps = (dispatch: Dispatch<any>, ownProps) => ({
  clearForm: () =>
    dispatch(actions.forms.formEndEdit({ formKey: WIDGET_FORM_KEY })),
  loadWidgets:           async () => dispatch(actions.widgets.get(ownProps.widgetListId)),
  updateWidgetInstances: (widgetInstances: Array<WidgetInstanceType>) =>
    dispatch(
      actions.forms.formUpdate({
        formKey: WIDGET_FORM_KEY,
        value:   widgetInstances
      })
    ),
  patchWidgetInstances: async (payload: Object) =>
    dispatch(actions.widgets.patch(ownProps.widgetListId, payload))
})

export default R.compose(
  connect(
    mapStateToProps,
    mapDispatchToProps
  )
)(WidgetListContainer)

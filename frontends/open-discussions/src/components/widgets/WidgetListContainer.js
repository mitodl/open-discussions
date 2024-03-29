// @flow
import React from "react"
import { connect } from "react-redux"
import { bindActionCreators } from "redux"
import R from "ramda"
import { arrayMove } from "react-sortable-hoc"

import { Loading } from "../../components/Loading"
import WidgetList from "../../components/widgets/WidgetList"
import WidgetEditDialog, {
  WIDGET_EDIT,
  WIDGET_TYPE_SELECT
} from "../../components/widgets/WidgetEditDialog"

import { actions } from "../../actions"
import {
  DIALOG_EDIT_WIDGET,
  hideDialog,
  setDialogData,
  showDialog
} from "../../actions/ui"
import {
  WIDGET_FORM_KEY,
  newWidgetInstance,
  getWidgetKey
} from "../../lib/widgets"

import type { Dispatch } from "redux"
import type {
  WidgetInstance as WidgetInstanceType,
  WidgetListResponse,
  WidgetDialogData,
  WidgetForm,
  WidgetSpec
} from "../../flow/widgetTypes"
import type { FormValue } from "../../flow/formTypes"

type Props = {
  clearForm: () => void,
  dialogData: ?WidgetDialogData,
  dialogOpen: boolean,
  form: FormValue<WidgetForm>,
  loaded: boolean,
  widgetListId: number,
  loadWidgets: () => Promise<WidgetListResponse>,
  setDialogData: (data: WidgetDialogData) => void,
  setDialogVisibility: (open: boolean) => void,
  updateWidgetInstances: (widgetInstances: Array<WidgetInstanceType>) => void,
  updateExpanded: (keys: Array<string>, expanded: boolean) => void,
  specs: Array<WidgetSpec>,
  validation: Object,
  widgetInstances: Array<WidgetInstanceType>
}

export class WidgetListContainer extends React.Component<Props> {
  componentDidMount() {
    this.loadData()
  }

  componentDidUpdate(prevProps: Props) {
    const { clearForm } = this.props
    if (prevProps.widgetListId !== this.props.widgetListId) {
      this.loadData()
      clearForm()
    }
  }

  componentWillUnmount() {
    const { clearForm } = this.props
    clearForm()
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
    const key = getWidgetKey(widgetInstance)
    const widgetInstances = this.getWidgetInstances().filter(
      _widgetInstance => getWidgetKey(_widgetInstance) !== key
    )
    updateWidgetInstances(widgetInstances)
  }

  getWidgetInstances = (): Array<WidgetInstanceType> => {
    const { widgetInstances, form } = this.props
    if (!form || !form.value || !form.value.instances) {
      return widgetInstances
    }
    return form.value.instances
  }

  getExpanded = (): { [string]: boolean } => {
    const { form } = this.props
    if (!form || !form.value || !form.value.expanded) {
      // everything is collapsed by default
      return {}
    }
    return form.value.expanded
  }

  startAddInstance = () => {
    const { setDialogVisibility, setDialogData } = this.props

    setDialogVisibility(true)
    setDialogData({
      state:      WIDGET_TYPE_SELECT,
      instance:   newWidgetInstance(),
      validation: {}
    })
  }

  startEditInstance = (widgetInstance: WidgetInstanceType) => {
    const { setDialogVisibility, setDialogData } = this.props

    setDialogVisibility(true)
    setDialogData({
      state:      WIDGET_EDIT,
      instance:   widgetInstance,
      validation: {}
    })
  }

  updateForm = (data: WidgetDialogData) => {
    const { updateWidgetInstances } = this.props
    const instances = this.getWidgetInstances()

    const instanceFromDialog = data.instance
    const key = getWidgetKey(instanceFromDialog)
    const replacementInstances =
      data.state === WIDGET_EDIT
        ? instances.map(instance =>
          getWidgetKey(instance) === key ? instanceFromDialog : instance
        )
        : instances.concat([instanceFromDialog])
    updateWidgetInstances(replacementInstances)
  }

  render() {
    const {
      clearForm,
      dialogData,
      dialogOpen,
      form,
      loaded,
      setDialogData,
      setDialogVisibility,
      updateExpanded,
      specs
    } = this.props
    if (!loaded) {
      return <Loading />
    }

    const validation = dialogData ? dialogData.validation : {}
    return (
      <React.Fragment>
        <WidgetList
          expanded={this.getExpanded()}
          editing={!!form}
          widgetInstances={this.getWidgetInstances()}
          onSortEnd={this.onSortEnd}
          clearForm={clearForm}
          deleteInstance={this.deleteInstance}
          setExpanded={updateExpanded}
          startAddInstance={this.startAddInstance}
          startEditInstance={this.startEditInstance}
          useDragHandle={true}
        />
        <WidgetEditDialog
          updateForm={this.updateForm}
          dialogData={dialogData}
          dialogOpen={dialogOpen}
          setDialogData={setDialogData}
          setDialogVisibility={setDialogVisibility}
          specs={specs}
          validation={validation}
        />
      </React.Fragment>
    )
  }
}

const mapStateToProps = state => {
  const specs = state.widgets.data.available_widgets
  return {
    form:            state.forms[WIDGET_FORM_KEY],
    dialogOpen:      state.ui.dialogs.has(DIALOG_EDIT_WIDGET),
    dialogData:      state.ui.dialogs.get(DIALOG_EDIT_WIDGET),
    loaded:          state.widgets.loaded,
    widgetInstances: state.widgets.data.widgets,
    specs
  }
}

const mapDispatchToProps = (dispatch: Dispatch<any>, ownProps) =>
  bindActionCreators(
    {
      clearForm:     () => actions.forms.formEndEdit({ formKey: WIDGET_FORM_KEY }),
      setDialogData: (data: WidgetDialogData) =>
        setDialogData({ dialogKey: DIALOG_EDIT_WIDGET, data: data }),
      setDialogVisibility: (visibility: boolean) =>
        visibility
          ? showDialog(DIALOG_EDIT_WIDGET)
          : hideDialog(DIALOG_EDIT_WIDGET),
      loadWidgets:    () => actions.widgets.get(ownProps.widgetListId),
      updateExpanded: (keys: Array<string>, value: boolean) => {
        const expanded = {}
        for (const key of keys) {
          expanded[key] = value
        }
        return actions.forms.formUpdate({
          formKey: WIDGET_FORM_KEY,
          value:   { expanded }
        })
      },
      updateWidgetInstances: (instances: Array<WidgetInstanceType>) =>
        actions.forms.formUpdate({
          formKey: WIDGET_FORM_KEY,
          value:   { instances }
        })
    },
    dispatch
  )

export default R.compose(connect(mapStateToProps, mapDispatchToProps))(
  WidgetListContainer
)

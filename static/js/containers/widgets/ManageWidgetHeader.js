// @flow
import React from "react"
import { connect } from "react-redux"
import { bindActionCreators } from "redux"
import R from "ramda"

import { WIDGET_FORM_KEY } from "../../lib/widgets"
import { actions } from "../../actions"

import type { Dispatch } from "redux"
import type {
  WidgetInstance as WidgetInstanceType,
  WidgetListResponse
} from "../../flow/widgetTypes"
import type { FormValue } from "../../flow/formTypes"
import type { Channel } from "../../flow/discussionTypes"

type PatchPayload = {
  id: number,
  widgets: Array<WidgetInstanceType>
}

type Props = {
  clearForm: () => void,
  form: FormValue<Array<WidgetInstanceType>>,
  patchWidgetInstances: (payload: PatchPayload) => Promise<WidgetListResponse>,
  submitForm: () => Promise<void>,
  channel: Channel,
  widgetIsEditing: boolean
}

export class ManageWidgetHeader extends React.Component<Props> {
  submitForm = async () => {
    const { channel, form, patchWidgetInstances, clearForm } = this.props
    if (form && form.value) {
      await patchWidgetInstances({
        widgets: form.value,
        // $FlowFixMe: if we're at this point we definitely have a widget id
        id:      channel.widget_list_id
      })
    }

    clearForm()
  }

  render() {
    const { clearForm, form } = this.props

    if (!form) {
      return null
    }

    return (
      <span className="manage-widgets-navbar">
        <span className="manage-title">Manage widgets</span>
        <button className="cancel" onClick={clearForm}>
          Cancel
        </button>
        <button className="submit" onClick={this.submitForm}>
          Done
        </button>
      </span>
    )
  }
}

const mapStateToProps = state => ({
  form: state.forms[WIDGET_FORM_KEY]
})

const mapDispatchToProps = (dispatch: Dispatch<*>, ownProps) =>
  bindActionCreators(
    {
      clearForm:            () => actions.forms.formEndEdit({ formKey: WIDGET_FORM_KEY }),
      patchWidgetInstances: (payload: Object) =>
        actions.widgets.patch(ownProps.channel.widget_list_id, payload)
    },
    dispatch
  )

export default R.compose(
  connect(
    mapStateToProps,
    mapDispatchToProps
  )
)(ManageWidgetHeader)

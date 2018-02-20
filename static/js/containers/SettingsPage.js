// @flow
import React from "react"
import { connect } from "react-redux"
import DocumentTitle from "react-document-title"
import { Radio } from "@mitodl/mdl-react-components"
import { FETCH_PROCESSING } from "redux-hammock/constants"

import Card from "../components/Card"

import { formatTitle } from "../lib/title"
import { actions } from "../actions"
import {
  FRONTPAGE_FREQUENCY_CHOICES,
  FREQUENCY_DAILY
} from "../reducers/settings"
import { setSnackbarMessage } from "../actions/ui"

export const SETTINGS_FORM_KEY = "SETTINGS_FORM_KEY"
const FREQUENCY_INPUT_NAME = "trigger_frequency"

class SettingsPage extends React.Component<*, *> {
  componentWillMount() {
    this.loadData()
  }

  loadData = async () => {
    const { dispatch, token } = this.props

    const [{ trigger_frequency }] = await dispatch(actions.settings.get(token))

    dispatch(
      actions.forms.formBeginEdit({
        formKey: SETTINGS_FORM_KEY,
        value:   {
          [FREQUENCY_INPUT_NAME]: trigger_frequency
        }
      })
    )
  }

  onSubmit = async (e: Object) => {
    const { dispatch, form, token } = this.props

    e.preventDefault()

    await dispatch(actions.settings.patch(form.value, token))
    dispatch(
      setSnackbarMessage({
        message: "Notification Settings Saved"
      })
    )
  }

  onChange = (e: Object) => {
    const { dispatch } = this.props
    dispatch(
      actions.forms.formUpdate({
        formKey: SETTINGS_FORM_KEY,
        value:   {
          [e.target.name]: e.target.value
        }
      })
    )
  }

  render() {
    const { form, saving } = this.props

    return form
      ? <div className="content">
        <DocumentTitle title={formatTitle("Settings")} />
        <div className="main-content settings-page">
          <div className="breadcrumbs">Email Settings</div>
          <form onSubmit={this.onSubmit} className="form">
            <Card>
              <label htmlFor="frequency" className="label">
                  How often do you want to receive discussion digest emails?
              </label>
              <Radio
                className="settings-radio"
                name={FREQUENCY_INPUT_NAME}
                value={form.value[FREQUENCY_INPUT_NAME] || FREQUENCY_DAILY}
                onChange={this.onChange}
                options={FRONTPAGE_FREQUENCY_CHOICES}
              />
            </Card>
            <button
              type="submit"
              disabled={saving}
              className={`blue-button ${saving ? "disabled" : ""}`}
            >
                Save
            </button>
          </form>
        </div>
      </div>
      : null
  }
}

const mapStateToProps = (state, ownProps) => ({
  settings: state.settings.data,
  token:    ownProps.match.params.token || "",
  form:     state.forms[SETTINGS_FORM_KEY],
  saving:
    state.settings.processing && state.settings.patchStatus === FETCH_PROCESSING
})

export default connect(mapStateToProps)(SettingsPage)

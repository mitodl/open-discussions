// @flow
import React from "react"
import R from "ramda"
import { connect } from "react-redux"
import DocumentTitle from "react-document-title"
import { Radio } from "@mitodl/mdl-react-components"
import Checkbox from "rmwc/Checkbox"
import { FETCH_PROCESSING } from "redux-hammock/constants"

import Card from "../components/Card"

import { formatTitle } from "../lib/title"
import { actions } from "../actions"
import {
  FRONTPAGE_FREQUENCY_CHOICES,
  FREQUENCY_DAILY,
  FREQUENCY_NEVER,
  FREQUENCY_IMMEDIATE,
  FRONTPAGE_NOTIFICATION,
  COMMENT_NOTIFICATION
} from "../reducers/settings"
import { setSnackbarMessage } from "../actions/ui"

export const SETTINGS_FORM_KEY = "SETTINGS_FORM_KEY"

const FRONTPAGE_INPUT_NAME = "frontpage"
const COMMENTS_INPUT_NAME = "comments"

const getFrontpageFrequency = R.compose(
  R.prop("trigger_frequency"),
  R.find(R.propEq("notification_type", FRONTPAGE_NOTIFICATION))
)

const getCommentFrequency = R.compose(
  R.prop("trigger_frequency"),
  R.find(R.propEq("notification_type", COMMENT_NOTIFICATION))
)

class SettingsPage extends React.Component<*, *> {
  componentWillMount() {
    this.loadData()
  }

  loadData = async () => {
    const { dispatch, token } = this.props

    const settings = await dispatch(actions.settings.get(token))

    dispatch(
      actions.forms.formBeginEdit({
        formKey: SETTINGS_FORM_KEY,
        value:   {
          [FRONTPAGE_INPUT_NAME]: getFrontpageFrequency(settings),
          [COMMENTS_INPUT_NAME]:  getCommentFrequency(settings)
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

  onFrontpageChange = (e: Object) => {
    const { dispatch, form } = this.props
    dispatch(
      actions.forms.formUpdate({
        formKey: SETTINGS_FORM_KEY,
        value:   {
          ...form.value,
          [FRONTPAGE_INPUT_NAME]: e.target.value
        }
      })
    )
  }

  onCommentsChange = () => {
    const { dispatch, form } = this.props
    dispatch(
      actions.forms.formUpdate({
        formKey: SETTINGS_FORM_KEY,
        value:   {
          ...form.value,
          [COMMENTS_INPUT_NAME]:
          form.value[COMMENTS_INPUT_NAME] === FREQUENCY_IMMEDIATE
            ? FREQUENCY_NEVER
            : FREQUENCY_IMMEDIATE
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
                name={FRONTPAGE_INPUT_NAME}
                value={form.value[FRONTPAGE_INPUT_NAME] || FREQUENCY_DAILY}
                onChange={this.onFrontpageChange}
                options={FRONTPAGE_FREQUENCY_CHOICES}
              />
            </Card>
            <Card>
              <label htmlFor="notifications" className="label">
                  When do you want to receive an email notification?
              </label>
              <Checkbox
                checked={
                  form.value[COMMENTS_INPUT_NAME] === FREQUENCY_IMMEDIATE
                }
                className="settings-checkbox"
                name="notifications"
                onChange={this.onCommentsChange}
              >
                  When someone responds to one of my posts or comments
              </Checkbox>
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

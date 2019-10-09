// @flow
import React from "react"
import R from "ramda"
import { connect } from "react-redux"
import { MetaTags } from "react-meta-tags"
import { Radio } from "@mitodl/mdl-react-components"
import { Checkbox } from "@rmwc/checkbox"
import { FETCH_PROCESSING } from "redux-hammock/constants"

import Card from "../components/Card"
import SettingsTabs from "../components/SettingsTabs"
import CanonicalLink from "../components/CanonicalLink"

import { formatTitle } from "../lib/title"
import { getTokenFromUrl } from "../lib/util"
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
import { withRouter } from "react-router"

import type { Dispatch } from "redux"
import type { FormValue } from "../flow/formTypes"
import type { FrontpageFrequency, CommentFrequency } from "../reducers/settings"

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

type SettingsForm = {
  comments: CommentFrequency,
  frontpage: FrontpageFrequency
}

type StateProps = {
  form: FormValue<SettingsForm>,
  saving: boolean,
  token: string
}

type Props = {
  dispatch: Dispatch<*>
} & StateProps

class SettingsPage extends React.Component<Props> {
  componentDidMount() {
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

    return form ? (
      <React.Fragment>
        <MetaTags>
          <title>{formatTitle("Settings")}</title>
          <CanonicalLink relativeUrl="settings" />
        </MetaTags>
        <div className="main-content settings-page">
          <SettingsTabs />
          <form onSubmit={this.onSubmit}>
            <Card>
              <label htmlFor="frequency" className="label">
                How often do you want to receive discussion digest emails?
              </label>
              <Radio
                className="radio"
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
      </React.Fragment>
    ) : null
  }
}

const mapStateToProps = (state, ownProps): StateProps => ({
  token:  getTokenFromUrl(ownProps),
  form:   state.forms[SETTINGS_FORM_KEY],
  saving:
    state.settings.processing && state.settings.patchStatus === FETCH_PROCESSING
})

export default R.compose(
  connect(mapStateToProps),
  withRouter
)(SettingsPage)

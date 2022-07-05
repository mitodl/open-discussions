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
import { CanonicalLink } from "ol-util"

import { formatTitle } from "../lib/title"
import { getTokenFromUrl } from "../lib/util"
import { actions } from "../actions"
import {
  FRONTPAGE_FREQUENCY_CHOICES,
  FREQUENCY_DAILY,
  FREQUENCY_NEVER,
  FREQUENCY_IMMEDIATE,
  FRONTPAGE_NOTIFICATION,
  COMMENT_NOTIFICATION,
  MODERATOR_NOTIFICATION
} from "../reducers/settings"
import { setSnackbarMessage } from "../actions/ui"
import { withRouter } from "react-router"

import type { Dispatch } from "redux"
import type { FormValue } from "../flow/formTypes"
import type {
  FrontpageFrequency,
  CommentFrequency,
  ModeratorFrequency
} from "../reducers/settings"

export const SETTINGS_FORM_KEY = "SETTINGS_FORM_KEY"

const getFrontpageFrequency = R.compose(
  R.prop("trigger_frequency"),
  R.find(R.propEq("notification_type", FRONTPAGE_NOTIFICATION))
)

const getCommentFrequency = R.compose(
  R.prop("trigger_frequency"),
  R.find(R.propEq("notification_type", COMMENT_NOTIFICATION))
)

const filterModeratorSettings = R.compose(
  R.filter(R.propEq("notification_type", MODERATOR_NOTIFICATION))
)

type SettingsFormModerator = {
  channel_name: string,
  channel_title: string,
  trigger_frequency: ModeratorFrequency
}

type SettingsForm = {
  comments: CommentFrequency,
  frontpage: FrontpageFrequency,
  moderator_posts: { [key: string]: SettingsFormModerator }
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

    const formValues: SettingsForm = {
      [FRONTPAGE_NOTIFICATION]: getFrontpageFrequency(settings),
      [COMMENT_NOTIFICATION]:   getCommentFrequency(settings),
      [MODERATOR_NOTIFICATION]: {}
    }

    for (const setting of filterModeratorSettings(settings)) {
      const moderatorSettingForChannel: SettingsFormModerator = {
        channel_name:      setting.channel_name,
        channel_title:     setting.channel_title,
        trigger_frequency: setting.trigger_frequency
      }

      formValues[MODERATOR_NOTIFICATION][
        setting.channel_name
      ] = moderatorSettingForChannel
    }

    dispatch(
      actions.forms.formBeginEdit({
        formKey: SETTINGS_FORM_KEY,
        value:   formValues
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
          [FRONTPAGE_NOTIFICATION]: e.target.value
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
          [COMMENT_NOTIFICATION]:
            form.value[COMMENT_NOTIFICATION] === FREQUENCY_IMMEDIATE
              ? FREQUENCY_NEVER
              : FREQUENCY_IMMEDIATE
        }
      })
    )
  }

  onModeratorChange = channelName => {
    const { dispatch, form } = this.props
    const setting = form.value[MODERATOR_NOTIFICATION][channelName]
    setting.trigger_frequency =
      setting.trigger_frequency === FREQUENCY_IMMEDIATE
        ? FREQUENCY_NEVER
        : FREQUENCY_IMMEDIATE

    dispatch(
      actions.forms.formUpdate({
        formKey: SETTINGS_FORM_KEY,
        value:   {
          ...form.value,
          [MODERATOR_NOTIFICATION]: {
            ...form.value[MODERATOR_NOTIFICATION],
            [channelName]: setting
          }
        }
      })
    )
  }

  render() {
    const { form, saving } = this.props

    if (form) {
      const moderatorNotificationCheckboxes = []

      for (const channelSetting of Object.keys(
        form.value[MODERATOR_NOTIFICATION]
      ).map(key => form.value[MODERATOR_NOTIFICATION][key])) {
        moderatorNotificationCheckboxes.push(
          <Checkbox
            checked={
              form.value[MODERATOR_NOTIFICATION][channelSetting.channel_name]
                .trigger_frequency === FREQUENCY_IMMEDIATE
            }
            className="settings-checkbox"
            name="notifications"
            key={channelSetting.channel_name}
            onChange={() => this.onModeratorChange(channelSetting.channel_name)}
          >
            {channelSetting.channel_title}
          </Checkbox>
        )
      }

      return (
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
                  name={FRONTPAGE_NOTIFICATION}
                  value={form.value[FRONTPAGE_NOTIFICATION] || FREQUENCY_DAILY}
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
                    form.value[COMMENT_NOTIFICATION] === FREQUENCY_IMMEDIATE
                  }
                  className="settings-checkbox"
                  name="notifications"
                  onChange={this.onCommentsChange}
                >
                  When someone responds to one of my posts or comments
                </Checkbox>
                {Object.keys(form.value[MODERATOR_NOTIFICATION]).length > 0 ? (
                  <div>
                    <div className="moderator-notifications-label">
                      When someone makes a post in a channel I moderate:
                    </div>
                    {moderatorNotificationCheckboxes}
                  </div>
                ) : null}
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
      )
    } else {
      return null
    }
  }
}

const mapStateToProps = (state, ownProps): StateProps => ({
  token:  getTokenFromUrl(ownProps),
  form:   state.forms[SETTINGS_FORM_KEY],
  saving:
    state.settings.processing && state.settings.patchStatus === FETCH_PROCESSING
})

export default R.compose(connect(mapStateToProps), withRouter)(SettingsPage)

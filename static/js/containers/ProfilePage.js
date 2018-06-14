// @flow
/* global SETTINGS:false */
import React from "react"
import { connect } from "react-redux"
import R from "ramda"
import DocumentTitle from "react-document-title"

import { actions } from "../actions"
import { formatTitle } from "../lib/title"
import { validateProfileForm } from "../lib/validation"

import type { FormValue } from "../flow/formTypes"
import type { Profile, ProfileForm } from "../flow/discussionTypes"
import type { Dispatch } from "redux"
import ProfileImage from "./ProfileImage"
import { getUserName } from "../lib/util"

type ProfilePageProps = {
  dispatch: Dispatch,
  profileForm: ?FormValue,
  history: Object,
  processing: boolean,
  profile: Profile,
  userName: string
}

const PROFILE_KEY = "profile"
const PROFILE_PAYLOAD = { formKey: PROFILE_KEY }
const getForm = R.prop(PROFILE_KEY)

class ProfilePage extends React.Component<*, void> {
  props: ProfilePageProps

  componentDidMount() {
    const { profile } = this.props
    if (!profile) {
      this.loadData()
    }
  }

  loadData = async () => {
    const { dispatch, userName } = this.props
    await dispatch(actions.profiles.get(userName))
  }

  componentWillUnmount() {
    const { dispatch } = this.props
    dispatch(actions.forms.formEndEdit(PROFILE_PAYLOAD))
  }

  onUpdate = async (e: Object) => {
    const { dispatch } = this.props
    const { name, value } = e.target

    dispatch(
      actions.forms.formUpdate({
        ...PROFILE_PAYLOAD,
        value: {
          [name]: value
        }
      })
    )
  }

  onSubmit = (e: Object) => {
    const { dispatch, profileForm } = this.props

    e.preventDefault()

    const validation = validateProfileForm(profileForm)

    if (!profileForm || !R.isEmpty(validation)) {
      dispatch(
        actions.forms.formValidate({
          ...PROFILE_PAYLOAD,
          errors: validation.value
        })
      )
    } else {
      const data: ProfileForm = profileForm.value
      dispatch(actions.profiles.post(SETTINGS.username, data))
    }
  }

  render() {
    const { profile, userName } = this.props
    if (!profile) {
      return null
    }

    return (
      <div className="content edit-profile-page">
        <DocumentTitle title={formatTitle("Edit your profile")} />
        <div className="main-content">
          <ProfileImage
            profile={profile}
            userName={userName}
            editable={
              SETTINGS.profile_ui_enabled && userName === SETTINGS.username
            }
            useSmall={false}
          />
        </div>
      </div>
    )
  }
}

const mapStateToProps = (state, ownProps) => {
  const { profiles } = state
  const userName = getUserName(ownProps)
  const processing = state.profiles.processing
  const profileForm = getForm(state.forms)
  const profile = profiles.data.get(userName)
  return {
    profileForm,
    processing,
    profile,
    userName
  }
}

export default R.compose(connect(mapStateToProps))(ProfilePage)

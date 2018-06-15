// @flow
/* global SETTINGS:false */
import React from "react"
import { connect } from "react-redux"
import R from "ramda"
import DocumentTitle from "react-document-title"

import { actions } from "../actions"
import { formatTitle } from "../lib/title"

import type { Profile } from "../flow/discussionTypes"
import type { Dispatch } from "redux"
import ProfileImage from "./ProfileImage"
import { getUserName } from "../lib/util"

type ProfilePageProps = {
  dispatch: Dispatch,
  history: Object,
  processing: boolean,
  profile: Profile,
  userName: string
}

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
  const profile = profiles.data.get(userName)
  return {
    processing,
    profile,
    userName
  }
}

export default R.compose(connect(mapStateToProps))(ProfilePage)

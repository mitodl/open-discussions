// @flow
/* global SETTINGS:false */
import React from "react"
import { connect } from "react-redux"
import R from "ramda"
import { MetaTags } from "react-meta-tags"

import Card from "../components/Card"
import ProfileImage, { PROFILE_IMAGE_MEDIUM } from "./ProfileImage"
import withLoading from "../components/Loading"
import withSingleColumn from "../hoc/withSingleColumn"
import CanonicalLink from "../components/CanonicalLink"

import { actions } from "../actions"
import { formatTitle } from "../lib/title"
import { getUserName } from "../lib/util"
import { any404Error, anyErrorExcept404 } from "../util/rest"
import { clearPostError } from "../actions/post"

import type { Profile } from "../flow/discussionTypes"
import type { Dispatch } from "redux"

type Props = {
  dispatch: Dispatch<*>,
  profile: Profile,
  userName: string,
  history: Object,
  notFound: boolean,
  errored: boolean
}

class ProfilePage extends React.Component<Props> {
  componentDidMount() {
    const { profile } = this.props
    if (!profile) {
      this.loadData()
    }
  }

  componentWillUnmount() {
    const { dispatch, errored, notFound } = this.props

    if (errored || notFound) {
      dispatch(clearPostError())
    }
  }

  loadData = async () => {
    const { dispatch, userName } = this.props
    await dispatch(actions.profiles.get(userName))
  }

  onClick = () => {
    const { history, userName } = this.props
    history.push(`/profile/${userName}/edit`)
  }

  render() {
    const { profile, userName } = this.props
    if (!profile) {
      return null
    }

    return (
      <div className="profile-page">
        <MetaTags>
          <title>{formatTitle(`Profile for ${profile.name}`)}</title>
          <CanonicalLink relativeUrl="profile" />
        </MetaTags>
        <div className="main-content">
          <Card>
            <div className="profile-card">
              <div className="row profile-view">
                <ProfileImage
                  profile={profile}
                  userName={userName}
                  editable={false}
                  imageSize={PROFILE_IMAGE_MEDIUM}
                />
                <div className="row image-and-name">
                  <div className="profile-view-fullname">
                    <div className="profile-view-name">{profile.name}</div>
                  </div>
                </div>
              </div>
              <div className="row profile-view">
                <div className="row profile-view-headline">
                  {profile.headline}
                </div>
                <div className="row profile-view-bio">
                  {profile.bio
                    ? profile.bio.split("\n").map((item, key) => {
                      return (
                        <span key={key}>
                          {item}
                          <br />
                        </span>
                      )
                    })
                    : profile.bio}
                </div>
                {userName === SETTINGS.username ? (
                  <div className="row profile-edit-button">
                    <button type="submit" onClick={this.onClick}>
                      Edit Your Profile
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </Card>
        </div>
      </div>
    )
  }
}

const mapStateToProps = (state, ownProps) => {
  const { profiles } = state
  const userName = getUserName(ownProps)
  const profile = profiles.data.get(userName)
  const notFound = any404Error([profiles])
  const errored = anyErrorExcept404([profiles])
  const loaded = notFound ? true : R.none(R.isNil, [profile])
  return {
    profile,
    userName,
    notFound,
    errored,
    loaded
  }
}

export default R.compose(
  connect(mapStateToProps),
  withSingleColumn("profile-view-page"),
  withLoading
)(ProfilePage)

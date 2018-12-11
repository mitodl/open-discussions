// @flow
/* global SETTINGS:false */
import React from "react"
import { connect } from "react-redux"
import R from "ramda"
import { MetaTags } from "react-meta-tags"

import Card from "../components/Card"
import ProfileImage, { PROFILE_IMAGE_MEDIUM } from "./ProfileImage"
import { withSpinnerLoading } from "../components/Loading"
import withSingleColumn from "../hoc/withSingleColumn"
import CanonicalLink from "../components/CanonicalLink"
import { SocialSiteLogoLink, SiteLogoLink } from "../components/SiteLogoLink"

import { actions } from "../actions"
import { formatTitle } from "../lib/title"
import { getUserName } from "../lib/util"
import { PERSONAL_SITE_TYPE } from "../lib/constants"
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

  renderUserWebsiteLinks() {
    const { profile } = this.props

    if (!profile.user_websites || profile.user_websites.length === 0)
      return null

    // $FlowFixMe: profile.user_websites cannot be undefined here
    const socialSites = profile.user_websites
      .filter(site => site.site_type !== PERSONAL_SITE_TYPE)
      .map((site, i) => (
        <SocialSiteLogoLink site={site.site_type} url={site.url} key={i} />
      ))
    // $FlowFixMe: profile.user_websites cannot be undefined here
    const personalSite = profile.user_websites
      .filter(site => site.site_type === PERSONAL_SITE_TYPE)
      .map((site, i) => <SiteLogoLink url={site.url} key={i} />)

    const sites = socialSites.concat([personalSite]).filter(site => site)

    if (sites.length === 0) return null
    return <div className="card-site-links">{sites}</div>
  }

  render() {
    const { profile, userName } = this.props
    if (!profile) {
      return null
    }

    return (
      <React.Fragment>
        <MetaTags>
          <title>{formatTitle(`Profile for ${profile.name}`)}</title>
          <CanonicalLink relativeUrl="profile" />
        </MetaTags>
        <Card className="profile-card">
          <div className="row">
            <ProfileImage
              profile={profile}
              userName={userName}
              editable={false}
              imageSize={PROFILE_IMAGE_MEDIUM}
            />
            <div className="name-and-headline">
              <div className="name">{profile.name}</div>
              <div className="headline">{profile.headline}</div>
            </div>
          </div>
          <div className="row location">{profile.location || ""}</div>
          <div className="row bio">
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
            {this.renderUserWebsiteLinks()}
          </div>
        </Card>
        {userName === SETTINGS.username ? (
          <div className="row actions">
            <button type="submit" onClick={this.onClick}>
              Edit
            </button>
          </div>
        ) : null}
      </React.Fragment>
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
  withSpinnerLoading
)(ProfilePage)

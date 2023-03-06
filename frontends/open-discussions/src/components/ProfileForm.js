// @flow
/* global SETTINGS: false */
import React from "react"
import R from "ramda"
import { ValidationError } from "ol-forms"

import ProfileImage, { PROFILE_IMAGE_MEDIUM } from "./ProfileImage"
import { SocialSiteLogoLink, SiteLogoLink } from "./SiteLogoLink"
import Card from "./Card"

import { goBackAndHandleEvent } from "../lib/util"
import { getSocialSites, getPersonalSite } from "../lib/profile"
import { emptyOrNil } from "../lib/util"

import type {
  Profile,
  ProfilePayload,
  ProfileValidation
} from "../flow/discussionTypes"

type Props = {
  form: ProfilePayload,
  validation: ProfileValidation,
  onUpdate: Function,
  onSubmit: Function,
  profile: Profile,
  processing: boolean,
  history: Object,
  socialSiteFormValues: Object,
  socialSiteFormErrors: Object,
  personalSiteFormValues: Object,
  personalSiteFormErrors: Object,
  onUpdateSocialSite: Function,
  onSubmitSocialSite: Function,
  onUpdatePersonalSite: Function,
  onSubmitPersonalSite: Function,
  onDeleteSite: Function
}

export default class ProfileForm extends React.Component<Props> {
  renderUserWebsiteSection() {
    const {
      profile,
      socialSiteFormValues,
      socialSiteFormErrors,
      personalSiteFormValues,
      personalSiteFormErrors,
      onUpdateSocialSite,
      onSubmitSocialSite,
      onUpdatePersonalSite,
      onSubmitPersonalSite,
      onDeleteSite
    } = this.props

    const socialSites = getSocialSites(profile)
    const personalSite = getPersonalSite(profile)
    let acceptedSocialSites = ""
    if (!emptyOrNil(SETTINGS.accepted_social_sites)) {
      acceptedSocialSites = (
        <label className="bottom-label">
          Accepted sites:&nbsp;
          {R.join(", ", SETTINGS.accepted_social_sites)}
        </label>
      )
    }

    return (
      <React.Fragment>
        <div className="row social-site-links">
          <h4>Social media links</h4>
          <div className="input-row">
            <input
              type="text"
              name="socialSite"
              value={socialSiteFormValues.url || ""}
              placeholder="Add links to your social media profiles"
              maxLength="60"
              onChange={onUpdateSocialSite}
            />
            <button
              type="button"
              onClick={onSubmitSocialSite}
              className="outlined"
            >
              Submit
            </button>
          </div>
          {acceptedSocialSites}
          {
            <ValidationError
              className="validation-message-extra-padding"
              message={socialSiteFormErrors.url}
            />
          }
          {socialSites.map((site, i) => (
            <div key={i} className="site-row">
              <div className="site-link">
                <SocialSiteLogoLink site={site.site_type} url={site.url} />
                <a
                  href={site.url}
                  className="link-text"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {site.url}
                </a>
              </div>
              <button
                type="button"
                className="remove grey-surround"
                onClick={R.partial(onDeleteSite, [site.id])}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <div className="row personal-site-link">
          <h4>Your website</h4>
          {personalSite ? (
            <div className="site-row">
              <div className="site-link">
                <SiteLogoLink url={personalSite.url} />
                <a
                  href={personalSite.url}
                  className="link-text"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {personalSite.url}
                </a>
              </div>
              <button
                type="button"
                className="remove grey-surround"
                onClick={R.partial(onDeleteSite, [personalSite.id])}
              >
                Remove
              </button>
            </div>
          ) : (
            <React.Fragment>
              <div className="input-row">
                <input
                  type="text"
                  name="personalSite"
                  value={personalSiteFormValues.url || ""}
                  placeholder="Add a link to your website"
                  maxLength="60"
                  onChange={onUpdatePersonalSite}
                />
                <button
                  type="button"
                  onClick={onSubmitPersonalSite}
                  className="outlined"
                >
                  Submit
                </button>
              </div>
              {
                <ValidationError
                  className="validation-message-extra-padding"
                  message={personalSiteFormErrors.url}
                />
              }
            </React.Fragment>
          )}
        </div>
      </React.Fragment>
    )
  }

  render() {
    const {
      form,
      profile,
      validation,
      onUpdate,
      onSubmit,
      processing,
      history
    } = this.props
    if (!profile) {
      // wait until profile loads
      return null
    }

    return (
      <React.Fragment>
        <Card className="profile-card">
          <ProfileImage
            profile={profile}
            userName={profile.username}
            editable={profile.username === SETTINGS.username}
            imageSize={PROFILE_IMAGE_MEDIUM}
            className="float-left"
          />
          <form onSubmit={onSubmit} className="form">
            <div className="row image-and-name">
              <div className="profile-name">
                <div>
                  <input
                    type="text"
                    value={form.name || ""}
                    placeholder="Full name"
                    className="name"
                    name="name"
                    onChange={onUpdate}
                  />
                  {
                    <ValidationError
                      className="validation-message-extra-padding"
                      message={validation.name}
                    />
                  }
                </div>
              </div>
            </div>
            <div className="row headline">
              <input
                type="text"
                name="headline"
                value={form.headline || ""}
                placeholder="Headline"
                maxLength="60"
                onChange={onUpdate}
              />
              <label className="bottom-label">
                For example: 'Post Doc, Photonics MIT', max 60 characters
              </label>
            </div>
            <div className="row bio">
              <textarea
                value={form.bio || ""}
                name="bio"
                onChange={onUpdate}
                placeholder="Description"
              />
              <label className="bottom-label">
                Add a short description about yourself, max 1000 characters
              </label>
            </div>
            {this.renderUserWebsiteSection()}
          </form>
        </Card>
        <div className="row actions">
          <button className="cancel" onClick={goBackAndHandleEvent(history)}>
            Cancel
          </button>
          <button
            type="submit"
            onClick={onSubmit}
            className={`save-profile ${processing ? "disabled" : ""}`}
            disabled={processing}
          >
            Save
          </button>
        </div>
      </React.Fragment>
    )
  }
}

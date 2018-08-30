// @flow
/* global SETTINGS: false */
import React from "react"

import ProfileImage, { PROFILE_IMAGE_MEDIUM } from "../containers/ProfileImage"
import Card from "../components/Card"

import { validationMessage } from "../lib/validation"
import { goBackAndHandleEvent } from "../lib/util"

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
  history: Object
}

export default class ProfileForm extends React.Component<Props> {
  render() {
    const {
      form,
      profile,
      validation,
      onSubmit,
      onUpdate,
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
                  {validationMessage(validation.name)}
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

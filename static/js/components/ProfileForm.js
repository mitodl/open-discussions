// @flow
/* global SETTINGS: false */
import React from "react"

import ProfileImage, { PROFILE_IMAGE_MEDIUM } from "../containers/ProfileImage"

import { validationMessage } from "../lib/validation"
import { goBackAndHandleEvent } from "../lib/util"

import type {
  Profile,
  ProfilePayload,
  ProfileValidation
} from "../flow/discussionTypes"

type ProfileFormProps = {
  form: ProfilePayload,
  validation: ProfileValidation,
  onUpdate: Function,
  onSubmit: Function,
  profile: Profile,
  processing: boolean,
  history: Object
}

export default class ProfileForm extends React.Component<*, void> {
  props: ProfileFormProps

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
      <div>
        <ProfileImage
          profile={profile}
          userName={profile.username}
          editable={profile.username === SETTINGS.username}
          imageSize={PROFILE_IMAGE_MEDIUM}
        />
        <form onSubmit={onSubmit} className="form">
          <div className="row image-and-name">
            <div className="profile-name">
              <div>
                <label>Full Name</label>
                <input
                  type="text"
                  value={form.name}
                  placeholder="Your name"
                  className="name"
                  name="name"
                  onChange={onUpdate}
                />
                {validationMessage(validation.name)}
              </div>
            </div>
          </div>
          <div className="row headline">
            <label>Headline</label>
            <input
              type="text"
              name="headline"
              value={form.headline}
              placeholder="Add a headline (For example: 'Post Doc, Photonics MIT')"
              onChange={onUpdate}
            />
          </div>
          <div className="row bio">
            <label>Biography</label>
            <textarea
              value={form.bio}
              name="bio"
              onChange={onUpdate}
              placeholder="Add a short description of yourself"
            />
          </div>
          <div className="row actions">
            <button className="cancel" onClick={goBackAndHandleEvent(history)}>
              Cancel
            </button>
            <button
              type="submit"
              className={`save-profile ${processing ? "disabled" : ""}`}
              disabled={processing}
            >
              Save
            </button>
          </div>
        </form>
      </div>
    )
  }
}

// @flow
import React from "react"
import { Link } from "react-router-dom"
import { SortableElement } from "react-sortable-hoc"

import ProfileImage, { PROFILE_IMAGE_MICRO } from "../ProfileImage"

import DragHandle from "./DragHandle"

import { profileURL } from "../../lib/url"

import type { StatelessFunctionalComponent } from "react"
import type { Profile } from "../../flow/discussionTypes"

type Props = {
  addProfile?: (profile: Profile) => void,
  deleteProfile?: (profile: Profile) => void,
  editing: boolean,
  profile: Profile
}

export const PeopleItem: StatelessFunctionalComponent<Props> = ({
  addProfile,
  deleteProfile,
  editing,
  profile
}: Props) => (
  <div className="person">
    <ProfileImage imageSize={PROFILE_IMAGE_MICRO} profile={profile} />
    <div className="description">
      <Link to={profileURL(profile.username)} className="name navy">
        {profile.name}
      </Link>
      <span className="headline">{profile.headline}</span>
    </div>
    {editing ? (
      <div className="edit-buttons">
        <i
          className="material-icons delete widget-button"
          // $FlowFixMe: if editing is true deleteProfile should always be defined
          onClick={() => deleteProfile(profile)}
        >
          delete
        </i>
        <DragHandle />
      </div>
    ) : null}
    {addProfile ? (
      <button className="add-profile" onClick={() => addProfile(profile)}>
        Add
      </button>
    ) : null}
  </div>
)

const SortablePeopleItem: StatelessFunctionalComponent<Props> =
  SortableElement(PeopleItem)
export default SortablePeopleItem

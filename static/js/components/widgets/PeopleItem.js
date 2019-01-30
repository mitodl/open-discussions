// @flow
import React from "react"
import { SortableElement } from "react-sortable-hoc"

import DragHandle from "./DragHandle"
import ProfileImage, {
  PROFILE_IMAGE_MICRO
} from "../../containers/ProfileImage"

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
      <span className="name">{profile.name}</span>
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

const SortablePeopleItem: StatelessFunctionalComponent<Props> = SortableElement(
  PeopleItem
)
export default SortablePeopleItem

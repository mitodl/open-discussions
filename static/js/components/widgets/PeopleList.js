// @flow
import React from "react"
import { SortableContainer } from "react-sortable-hoc"

import PeopleItem from "./PeopleItem"

import type { StatelessFunctionalComponent } from "react"
import type { Profile } from "../../flow/discussionTypes"

type Props = {
  profiles: Array<Profile>,
  editing?: boolean,
  addProfile?: ?((profile: Profile) => void) | null,
  deleteProfile?: ?((profile: Profile) => void) | null
}
const PeopleList: StatelessFunctionalComponent<Props> = SortableContainer(
  ({ profiles, editing, addProfile, deleteProfile }) => (
    <div className="people-list">
      {profiles.map((profile: Profile, index) => (
        <PeopleItem
          index={index}
          key={profile.username}
          profile={profile}
          editing={editing}
          addProfile={addProfile}
          deleteProfile={deleteProfile}
        />
      ))}
    </div>
  )
)
export default PeopleList

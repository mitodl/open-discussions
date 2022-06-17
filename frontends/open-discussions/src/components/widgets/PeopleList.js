// @flow
import React from "react"
import { Link } from "react-router-dom"
import { SortableContainer } from "react-sortable-hoc"
import { withRouter } from "react-router"

import PeopleItem from "./PeopleItem"

import { getChannelNameFromPathname, channelMembersURL } from "../../lib/url"

import type { StatelessFunctionalComponent } from "react"
import type { Profile } from "../../flow/discussionTypes"

type Props = {
  profiles: Array<Profile>,
  editing?: boolean,
  addProfile?: ?((profile: Profile) => void) | null,
  deleteProfile?: ?((profile: Profile) => void) | null,
  showAllMembersLink?: boolean
}

const PeopleList: StatelessFunctionalComponent<Props> = SortableContainer(
  ({
    profiles,
    editing,
    addProfile,
    deleteProfile,
    showAllMembersLink,
    location
  }) => (
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
      {!editing && showAllMembersLink ? (
        <Link
          to={channelMembersURL(getChannelNameFromPathname(location.pathname))}
          className="see-all-members"
        >
          See all members
        </Link>
      ) : null}
    </div>
  )
)
export default withRouter<Props>(PeopleList)

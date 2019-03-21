// @flow
import React from "react"

import PeopleList from "./PeopleList"

import type { WidgetComponentProps } from "../../flow/widgetTypes"

const PeopleWidget = ({
  widgetInstance: {
    json: { people, show_all_members_link } // eslint-disable-line camelcase
  }
}: WidgetComponentProps) => (
  <PeopleList
    profiles={people}
    showAllMembersLink={show_all_members_link} // eslint-disable-line camelcase
    useDragHandle={true}
  />
)
export default PeopleWidget

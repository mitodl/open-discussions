// @flow
import React from "react"

import PeopleList from "./PeopleList"

import type { WidgetComponentProps } from "../../flow/widgetTypes"

const PeopleWidget = ({
  widgetInstance: {
    json: { people }
  }
}: WidgetComponentProps) => (
  <PeopleList profiles={people} useDragHandle={true} />
)
export default PeopleWidget

// @flow
import React from "react"
import { shallow } from "enzyme"
import { assert } from "chai"

import PeopleWidget from "./PeopleWidget"
import PeopleList from "./PeopleList"

import { WIDGET_TYPE_PEOPLE } from "../../lib/constants"
import { makeWidgetInstance } from "../../factories/widgets"

describe("PeopleWidget", () => {
  it("renders a PeopleList", () => {
    const widgetInstance = makeWidgetInstance(WIDGET_TYPE_PEOPLE)
    const wrapper = shallow(<PeopleWidget widgetInstance={widgetInstance} />)
    assert.deepEqual(
      wrapper.find(PeopleList).prop("profiles"),
      widgetInstance.json.people
    )
    assert.deepEqual(
      wrapper.find(PeopleList).prop("showAllMembersLink"),
      widgetInstance.json.show_all_members_link
    )
    assert.isTrue(wrapper.find(PeopleList).prop("useDragHandle"))
  })
})

import React from "react"
import { assert } from "chai"
import { shallow } from "enzyme"
import R from "ramda"

import EditChannelMembersForm from "./EditChannelMembersForm"

import { MISSING_TEXT } from "../../lib/channels"
import { profileURL } from "../../lib/url"
import {
  makeContributors,
  makeModerators
} from "../../factories/channels"

describe("EditChannelMembersForm", () => {
  let contributors, moderators

  beforeEach(() => {
    contributors = makeContributors()
    moderators = makeModerators(null, true)
  })
  ;[
    ["contributors", R.prop("contributor_name")],
    ["moderators", R.prop("moderator_name")]
  ].forEach(([pageDescription, usernameGetter]) => {
    describe(pageDescription, () => {
      let members

      beforeEach(() => {
        members = pageDescription === "contributors" ? contributors : moderators
      })

      const renderForm = () =>
        shallow(
          <EditChannelMembersForm
            members={members}
            usernameGetter={usernameGetter}
          />
        )

      it("should render names and emails", () => {
        const wrapper = renderForm()
        const rows = wrapper.find(".members .row")
        members.forEach((member, i) => {
          const row = rows.at(i)
          const link = row.find(".name")
          assert.equal(link.children().text(), member.full_name)
          assert.equal(link.props().to, profileURL(usernameGetter(member)))
          assert.equal(row.find(".email").text(), member.email)
        })
      })

      it("should fill in missing names and emails", () => {
        members = members.map(member => ({
          ...member,
          full_name: null,
          email:     null
        }))

        const wrapper = renderForm()
        const rows = wrapper.find(".members .row")
        members.forEach((member, i) => {
          const row = rows.at(i)
          assert.equal(row.find(".name").text(), MISSING_TEXT)
          assert.equal(row.find(".email").text(), MISSING_TEXT)
        })
      })
    })
  })
})

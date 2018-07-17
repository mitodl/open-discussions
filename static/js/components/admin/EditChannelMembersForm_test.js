import React from "react"
import { assert } from "chai"
import { shallow } from "enzyme"

import EditChannelMembersForm from "./EditChannelMembersForm"

import { MISSING_TEXT } from "../../lib/channels"
import { profileURL } from "../../lib/url"
import {
  makeChannel,
  makeContributors,
  makeModerators
} from "../../factories/channels"

describe("EditChannelMembersForm", () => {
  let channel, contributors, moderators

  beforeEach(() => {
    channel = makeChannel()
    contributors = makeContributors()
    moderators = makeModerators(null, true)
  })
  ;[
    ["contributors", "contributor_name"],
    ["moderators", "moderator_name"]
  ].forEach(([pageDescription, usernameField]) => {
    describe(pageDescription, () => {
      let members

      beforeEach(() => {
        members = pageDescription === "contributors" ? contributors : moderators
      })

      const renderForm = () =>
        shallow(
          <EditChannelMembersForm
            channelName={channel.name}
            members={members}
            usernameField={usernameField}
          />
        )

      it("should render names and emails", () => {
        const wrapper = renderForm()
        const rows = wrapper.find(".members .row")
        members.forEach((member, i) => {
          const row = rows.at(i)
          const link = row.find(".name")
          assert.equal(link.children().text(), member.full_name)
          assert.equal(link.props().to, profileURL(member[usernameField]))
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

import React from "react"
import sinon from "sinon"
import R from "ramda"
import { assert } from "chai"
import { shallow } from "enzyme"

import MembersList from "./MembersList"

import { MISSING_TEXT } from "../../lib/channels"
import { profileURL } from "../../lib/url"
import {
  makeChannel,
  makeContributors,
  makeModerators
} from "../../factories/channels"

describe("MembersList", () => {
  let sandbox, channel

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    channel = makeChannel()
  })
  afterEach(() => {
    sandbox.restore()
  })
  ;[
    ["contributors", R.prop("contributor_name")],
    ["moderators", R.prop("moderator_name")]
  ].forEach(([pageDescription, usernameGetter]) => {
    describe(pageDescription, () => {
      let members

      beforeEach(() => {
        members =
          pageDescription === "contributors"
            ? makeContributors()
            : makeModerators(null, true)
      })

      const renderForm = ({ ...props }) =>
        shallow(
          <MembersList
            members={members}
            usernameGetter={usernameGetter}
            channel={channel}
            {...props}
          />
        )

      it("should render names and emails", () => {
        const wrapper = renderForm()
        const rows = wrapper.find(".row")
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
        const rows = wrapper.find(".row")
        members.forEach((member, i) => {
          const row = rows.at(i)
          assert.equal(row.find(".name").text(), MISSING_TEXT)
          assert.equal(row.find(".email").text(), MISSING_TEXT)
        })
      })
      ;[true, false].forEach(editable => {
        it(`should ${
          editable ? "" : "not "
        }render 'remove' links when the channel is ${
          editable ? "" : "not "
        } editable`, () => {
          const removeMember = sandbox.stub()
          const wrapper = renderForm({ removeMember, editable })
          const rows = wrapper.find(".row")
          members.forEach((member, i) => {
            const row = rows.at(i)
            const link = row.find(".remove")

            if (!editable) {
              assert.equal(link.length, 0)
            } else {
              assert.equal(link.length, 1)
              link.props().onClick()
              sinon.assert.calledWith(
                removeMember,
                channel,
                usernameGetter(member)
              )
            }
          })
        })
      })
    })
  })
})

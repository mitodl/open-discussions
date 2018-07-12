import React from "react"
import { assert } from "chai"
import { shallow } from "enzyme"
import R from "ramda"
import sinon from "sinon"

import EditChannelMembersForm from "./EditChannelMembersForm"

import { MISSING_TEXT, newMemberForm } from "../../lib/channels"
import { profileURL } from "../../lib/url"
import {
  makeChannel,
  makeContributors,
  makeModerators
} from "../../factories/channels"

describe("EditChannelMembersForm", () => {
  let sandbox, channel, contributors, moderators, form

  beforeEach(() => {
    channel = makeChannel()
    contributors = makeContributors()
    moderators = makeModerators(null, true)
    form = newMemberForm()
    sandbox = sinon.createSandbox()
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
        members = pageDescription === "contributors" ? contributors : moderators
      })

      const renderForm = ({ ...props }) =>
        shallow(
          <EditChannelMembersForm
            members={members}
            usernameGetter={usernameGetter}
            channel={channel}
            validation={{}}
            form={form}
            {...props}
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
      ;[true, false].forEach(editable => {
        it(`should ${
          editable ? "" : "not "
        }render 'remove' links when the channel is ${
          editable ? "" : "not "
        } editable`, () => {
          const removeMember = sandbox.stub()
          channel.membership_is_managed = !editable
          const wrapper = renderForm({ removeMember })
          const rows = wrapper.find(".members .row")
          members.forEach((member, i) => {
            const row = rows.at(i)
            const link = row.find(".remove")

            if (!editable) {
              assert.equal(link.length, 0)
            } else {
              assert.equal(link.length, 1)
              link.props().onClick()
              sinon.assert.calledWith(removeMember, usernameGetter(member))
            }
          })
        })
      })

      it("displays a notice that membership is managed by micromasters", () => {
        channel.membership_is_managed = true
        const wrapper = renderForm({})
        assert.equal(
          wrapper.find(".membership-notice").text(),
          "Membership is managed via MicroMasters"
        )
      })

      describe("adding a new member", () => {
        beforeEach(() => {
          channel.membership_is_managed = false
        })

        it("enters text into the field", () => {
          const updateEmail = sandbox.stub()
          const preventDefault = sandbox.stub()
          const validation = {}
          const wrapper = renderForm({ updateEmail, validation })
          wrapper
            .find("input[name='email']")
            .simulate("change", { preventDefault, target: { value: "xyz" } })
          sinon.assert.calledWith(updateEmail, "xyz")
          sinon.assert.called(preventDefault)
        })

        it("shows a validation message", () => {
          const validation = {
            email: "abcdefg"
          }
          const wrapper = renderForm({ validation })
          assert.equal(wrapper.find(".validation-message").text(), "abcdefg")
        })

        it("disables the submit button while API request is processing", () => {
          const wrapper = renderForm({ processing: true, validation: {} })
          assert.isTrue(wrapper.find("button[type='submit']").props().disabled)
        })
      })
    })
  })
})

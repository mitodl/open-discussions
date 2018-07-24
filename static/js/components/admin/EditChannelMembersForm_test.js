import React from "react"
import { assert } from "chai"
import { shallow } from "enzyme"
import R from "ramda"
import sinon from "sinon"

import EditChannelMembersForm from "./EditChannelMembersForm"

import { newMemberForm } from "../../lib/channels"
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

      describe("adding a new member", () => {
        beforeEach(() => {
          channel.membership_is_managed = false
        })

        it("enters text into the field", () => {
          const onUpdate = sandbox.stub()
          const validation = {}
          const wrapper = renderForm({ onUpdate, validation })
          wrapper
            .find("input[name='email']")
            .simulate("change", { target: { value: "xyz" } })
          sinon.assert.calledWith(onUpdate, { target: { value: "xyz" } })
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

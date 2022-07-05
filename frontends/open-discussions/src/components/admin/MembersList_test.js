/* global SETTINGS */
import sinon from "sinon"
import R from "ramda"
import { assert } from "chai"

import MembersList from "./MembersList"

import { MISSING_TEXT } from "../../lib/channels"
import { profileURL } from "../../lib/url"
import {
  makeChannel,
  makeContributors,
  makeModerators
} from "../../factories/channels"
import { configureShallowRenderer } from "../../lib/test_utils"

describe("MembersList", () => {
  let sandbox, channel

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    channel = makeChannel()
  })

  afterEach(() => {
    sandbox.restore()
  })

  //
  ;[
    ["contributor", R.prop("contributor_name")],
    ["moderator", R.prop("moderator_name")]
  ].forEach(([memberTypeDescription, usernameGetter]) => {
    describe(memberTypeDescription, () => {
      let members, renderForm

      beforeEach(() => {
        members =
          memberTypeDescription === "contributor"
            ? makeContributors()
            : makeModerators(null, true)

        renderForm = configureShallowRenderer(MembersList, {
          members,
          usernameGetter,
          channel,
          memberTypeDescription
        })
      })

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

        const wrapper = renderForm({ members })
        const rows = wrapper.find(".row")
        members.forEach((member, i) => {
          const row = rows.at(i)
          assert.equal(row.find(".name").text(), MISSING_TEXT)
          assert.equal(row.find(".email").text(), MISSING_TEXT)
        })
      })

      //
      ;[true, false].forEach(editable => {
        it(`should ${
          editable ? "" : "not "
        }render remove links when the channel is ${
          editable ? "" : "not "
        }editable`, () => {
          members.forEach(member => {
            member.can_remove = true
          })

          const removeMember = sandbox.stub()
          const yourIndex = 1
          SETTINGS.username = usernameGetter(members[yourIndex])
          const wrapper = renderForm({ removeMember, editable })
          const rows = wrapper.find(".row")
          members.forEach((member, i) => {
            const row = rows.at(i)
            const link = row.find(".remove")

            if (!editable) {
              assert.equal(link.length, 0)
            } else {
              assert.equal(link.length, 1)

              assert.equal(link.text(), i === yourIndex ? "Leave" : "Remove")
            }
          })
        })
      })

      it("shows a dialog box when the user clicks remove or leave", () => {
        members.forEach(member => {
          member.can_remove = true
        })
        const setDialogVisibility = sandbox.stub()
        const setDialogData = sandbox.stub()
        const removeMember = sandbox.stub()
        const yourIndex = 1
        SETTINGS.username = usernameGetter(members[yourIndex])
        const wrapper = renderForm({
          editable: true,
          setDialogVisibility,
          setDialogData,
          removeMember
        })
        const rows = wrapper.find(".row")
        members.forEach((member, i) => {
          const row = rows.at(i)
          const link = row.find(".remove")

          link.props().onClick()
          sinon.assert.calledWith(setDialogVisibility, true)
          setDialogVisibility.reset()
          sinon.assert.calledWith(setDialogData, member)
          setDialogData.reset()
        })

        assert.equal(removeMember.callCount, 0)
      })

      //
      ;[true, false].forEach(isYou => {
        it(`removes ${
          isYou ? "you" : "a member"
        } from the member list when the dialog box accept button is clicked`, () => {
          const memberToRemove = members[0]
          if (isYou) {
            SETTINGS.username = usernameGetter(memberToRemove)
          }
          const removeMember = sandbox.stub()
          const wrapper = renderForm({
            editable:   true,
            removeMember,
            dialogOpen: true,
            memberToRemove
          })
          const dialog = wrapper.find("OurDialog")
          const name = isYou ? "yourself" : memberToRemove.full_name
          assert.equal(dialog.props().title, `Remove ${name}?`)

          dialog.props().onAccept({ type: "click" })
          assert.equal(removeMember.callCount, 1)
          sinon.assert.calledWith(removeMember, channel, memberToRemove)
        })
      })

      it("dismisses the dialog box", () => {
        const memberToRemove = members[0]
        const setDialogVisibility = sandbox.stub()
        const removeMember = sandbox.stub()
        const wrapper = renderForm({
          editable:   true,
          removeMember,
          dialogOpen: true,
          memberToRemove,
          setDialogVisibility
        })
        wrapper
          .find("OurDialog")
          .props()
          .hideDialog()

        assert.equal(removeMember.callCount, 0)
        assert.equal(setDialogVisibility.callCount, 1)
        sinon.assert.calledWith(setDialogVisibility, false)
      })

      it(`should tell the user it can't remove if the field is explicitly set that way`, () => {
        const member = members[0]
        member.can_remove = false

        const wrapper = renderForm({ editable: true })
        const text = wrapper
          .find(".row")
          .first()
          .find(".cant_remove")
        assert.equal(text.text(), "Can't remove")
        assert.equal(
          wrapper
            .find(".row")
            .first()
            .find(".remove").length,
          0
        )
      })

      it("should show a special message in place of the user's own name", () => {
        const member = members[0]
        SETTINGS.username = usernameGetter(member)

        const wrapper = renderForm({ editable: true })
        const text = wrapper
          .find(".row")
          .first()
          .find("td")
          .first()
          .text()
        assert.equal(text, `You are a ${memberTypeDescription} of this channel`)
      })
    })
  })
})

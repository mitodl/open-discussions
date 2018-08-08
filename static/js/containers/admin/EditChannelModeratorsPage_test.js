// @flow
import { assert } from "chai"
import sinon from "sinon"

import {
  makeChannel,
  makeModerator,
  makeModerators
} from "../../factories/channels"
import { actions } from "../../actions"
import { SET_CHANNEL_DATA } from "../../actions/channel"
import { SHOW_DIALOG, SET_DIALOG_DATA } from "../../actions/ui"
import { newMemberForm } from "../../lib/channels"
import { formatTitle } from "../../lib/title"
import { editChannelModeratorsURL, channelURL } from "../../lib/url"
import IntegrationTestHelper from "../../util/integration_test_helper"

describe("EditChannelModeratorsPage", () => {
  let helper, renderComponent, listenForActions, channel, moderators

  beforeEach(() => {
    channel = makeChannel()
    channel.user_is_moderator = true
    moderators = makeModerators()
    helper = new IntegrationTestHelper()
    helper.getChannelStub.returns(Promise.resolve(channel))
    helper.getChannelsStub.returns(Promise.resolve([channel]))
    helper.getChannelModeratorsStub.returns(Promise.resolve(moderators))
    helper.getPostsForChannelStub.returns(
      Promise.resolve({
        pagination: {},
        posts:      []
      })
    )
    helper.getFrontpageStub.returns(
      Promise.resolve({
        pagination: {},
        posts:      []
      })
    )
    helper.getProfileStub.returns(Promise.resolve(""))
    renderComponent = helper.renderComponent.bind(helper)
    listenForActions = helper.listenForActions.bind(helper)
    window.scrollTo = helper.sandbox.stub()
  })

  afterEach(() => {
    helper.cleanup()
  })

  const renderPage = async (extraActions = []) => {
    const [wrapper] = await renderComponent(
      editChannelModeratorsURL(channel.name),
      [
        actions.subscribedChannels.get.requestType,
        actions.subscribedChannels.get.successType,
        actions.channels.get.requestType,
        actions.channels.get.successType,
        actions.channelModerators.get.requestType,
        actions.channelModerators.get.successType,
        actions.profiles.get.requestType,
        actions.profiles.get.successType,
        SET_CHANNEL_DATA,
        actions.forms.FORM_BEGIN_EDIT,
        ...extraActions
      ]
    )
    return wrapper.update()
  }

  it("should set the document title", async () => {
    await renderPage()
    assert.equal(document.title, formatTitle("Edit Channel"))
  })

  it("displays a notice that membership is managed by micromasters", async () => {
    channel.membership_is_managed = true
    const wrapper = await renderPage()
    assert.equal(
      wrapper.find(".membership-notice").text(),
      "Membership is managed via MicroMasters"
    )
  })

  it("renders the member list", async () => {
    const wrapper = await renderPage()
    const props = wrapper.find("MembersList").props()
    assert.deepEqual(props.members, moderators)
    assert.equal(props.editable, !channel.membership_is_managed)
    assert.equal(
      props.usernameGetter(moderators[0]),
      moderators[0].moderator_name
    )
    assert.deepEqual(props.channel, channel)
    assert.equal(props.memberTypeDescription, "moderator")
  })

  it("redirects if the user is not a moderator", async () => {
    channel.user_is_moderator = false
    await renderPage([
      actions.channels.get.requestType,
      actions.channels.get.successType,
      actions.forms.FORM_END_EDIT
    ])

    const history = helper.browserHistory
    assert.equal(history.location.pathname, channelURL(channel.name))
  })

  describe("editable", () => {
    beforeEach(() => {
      channel.membership_is_managed = false
    })

    it("renders the form", async () => {
      const wrapper = await renderPage()
      const props = wrapper.find("EditChannelMembersForm").props()
      assert.deepEqual(props.memberTypeDescription, "moderator")
      assert.deepEqual(props.form, newMemberForm())
    })

    it("tries to add a new moderator but fails validation", async () => {
      const wrapper = await renderPage()
      await listenForActions([actions.forms.FORM_VALIDATE], () => {
        wrapper
          .find("form")
          .props()
          .onSubmit({ preventDefault: helper.sandbox.stub() })
      })

      assert.equal(
        helper.store.getState().forms["channel:edit:moderators"].errors.email,
        "Email must not be blank"
      )
    })

    it("tries to add a new moderator but the API request fails", async () => {
      const wrapper = await renderPage()
      const email = "new@email.com"

      helper.addChannelModeratorStub.returns(Promise.reject())

      wrapper
        .find("input[name='email']")
        .props()
        .onChange({
          target: { name: "email", value: email }
        })
      await listenForActions(
        [
          actions.channelModerators.post.requestType,
          actions.channelModerators.post.failureType,
          actions.forms.FORM_VALIDATE,
          actions.forms.FORM_VALIDATE
        ],
        () => {
          wrapper
            .find("form")
            .props()
            .onSubmit({ preventDefault: helper.sandbox.stub() })
        }
      )

      sinon.assert.calledWith(
        helper.addChannelModeratorStub,
        channel.name,
        email
      )
      assert.equal(
        helper.store.getState().forms["channel:edit:moderators"].errors.email,
        "Error adding new moderator"
      )
    })

    it("adds a new moderator", async () => {
      const wrapper = await renderPage()
      const email = "new@email.com"

      const newModerator = makeModerator()
      helper.addChannelModeratorStub.returns(Promise.resolve(newModerator))

      wrapper
        .find("input[name='email']")
        .props()
        .onChange({
          target: { name: "email", value: email }
        })
      await listenForActions(
        [
          actions.channelModerators.post.requestType,
          actions.channelModerators.post.successType,
          actions.forms.FORM_VALIDATE
        ],
        () => {
          wrapper
            .find("form")
            .props()
            .onSubmit({ preventDefault: helper.sandbox.stub() })
        }
      )

      sinon.assert.calledWith(
        helper.addChannelModeratorStub,
        channel.name,
        email
      )
    })
    ;[true, false].forEach(isYou => {
      it(`removes ${
        isYou ? "yourself from being a moderator" : "a moderator"
      }`, async () => {
        const wrapper = await renderPage()

        helper.deleteChannelModeratorStub.returns(Promise.resolve())

        const redirectActions = isYou
          ? [
            actions.channels.get.requestType,
            actions.channels.get.successType,
            actions.forms.FORM_END_EDIT
          ]
          : []
        await listenForActions(
          [
            SHOW_DIALOG,
            SET_DIALOG_DATA,
            actions.channelModerators.delete.requestType,
            actions.channelModerators.delete.successType,
            ...redirectActions
          ],
          () => {
            if (isYou) {
              // this will be checked after the refresh
              channel.user_is_moderator = false
              helper.getChannelStub.returns(Promise.resolve(channel))
            }
            wrapper
              .find(".remove")
              .first()
              .props()
              .onClick({ preventDefault: helper.sandbox.stub() })

            wrapper.update()
            wrapper
              .find("#remove-member button.edit-button")
              .props()
              .onClick({
                type: "MDCDialog:accept"
              })
          }
        )

        sinon.assert.calledWith(
          helper.deleteChannelModeratorStub,
          channel.name,
          moderators[0].moderator_name
        )
        assert.equal(
          helper.browserHistory.location.pathname,
          isYou
            ? channelURL(channel.name)
            : editChannelModeratorsURL(channel.name)
        )
      })
    })
  })
})

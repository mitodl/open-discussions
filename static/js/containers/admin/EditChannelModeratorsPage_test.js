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
import { formatTitle } from "../../lib/title"
import { editChannelModeratorsURL } from "../../lib/url"
import IntegrationTestHelper from "../../util/integration_test_helper"

describe("EditChannelModeratorsPage", () => {
  let helper, renderComponent, listenForActions, channel, moderators

  beforeEach(() => {
    channel = makeChannel()
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

  const renderPage = async () => {
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
        actions.forms.FORM_BEGIN_EDIT
      ]
    )
    return wrapper.update()
  }

  it("should set the document title", async () => {
    await renderPage()
    assert.equal(document.title, formatTitle("Edit Channel"))
  })

  it("renders the form", async () => {
    const wrapper = await renderPage()
    const props = wrapper.find("EditChannelMembersForm").props()
    assert.deepEqual(props.members, moderators)
    assert.equal(
      props.usernameGetter(moderators[0]),
      moderators[0].moderator_name
    )
    assert.deepEqual(props.channel, channel)
  })

  describe("editable", () => {
    beforeEach(() => {
      channel.membership_is_managed = false
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
          target:         { value: email },
          preventDefault: helper.sandbox.stub()
        })
      await listenForActions(
        [
          actions.channelModerators.post.requestType,
          actions.channelModerators.post.failureType,
          actions.forms.FORM_VALIDATE
        ],
        () => {
          wrapper
            .find("form")
            .props()
            .onSubmit({ preventDefault: helper.sandbox.stub() })
        }
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
          target:         { value: email },
          preventDefault: helper.sandbox.stub()
        })
      await listenForActions(
        [
          actions.channelModerators.post.requestType,
          actions.channelModerators.post.successType
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

    it("removes a moderator", async () => {
      const wrapper = await renderPage()

      helper.deleteChannelModeratorStub.returns(Promise.resolve())

      await listenForActions(
        [
          actions.channelModerators.delete.requestType,
          actions.channelModerators.delete.successType
        ],
        () => {
          wrapper
            .find(".remove")
            .first()
            .props()
            .onClick({ preventDefault: helper.sandbox.stub() })
        }
      )

      sinon.assert.calledWith(
        helper.deleteChannelModeratorStub,
        channel.name,
        moderators[0].moderator_name
      )
    })
  })
})

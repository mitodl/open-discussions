// @flow
import { assert } from "chai"
import sinon from "sinon"

import EditChannelModeratorsPage, {
  EditChannelModeratorsPage as InnerEditChannelModeratorsPage,
  MODERATORS_KEY
} from "./EditChannelModeratorsPage"

import {
  makeChannel,
  makeModerator,
  makeModerators,
  makeSubscriber
} from "../../factories/channels"
import { makeWidgetListResponse } from "../../factories/widgets"
import { actions } from "../../actions"
import { SET_CHANNEL_DATA } from "../../actions/channel"
import { FORM_VALIDATE, FORM_UPDATE } from "../../actions/forms"
import {
  DIALOG_REMOVE_MEMBER,
  SHOW_DIALOG,
  HIDE_DIALOG,
  SET_DIALOG_DATA,
  SET_SNACKBAR_MESSAGE
} from "../../actions/ui"

import { newMemberForm } from "../../lib/channels"
import { formatTitle } from "../../lib/title"
import { editChannelModeratorsURL, channelURL } from "../../lib/url"
import { wait } from "../../lib/util"
import IntegrationTestHelper from "../../util/integration_test_helper"
import * as embedLib from "../../lib/embed"

describe("EditChannelModeratorsPage", () => {
  let helper, render, channel, moderators, initialState, initialProps

  beforeEach(() => {
    channel = makeChannel()
    channel.user_is_moderator = true
    moderators = makeModerators(null, true)
    helper = new IntegrationTestHelper()
    initialState = {
      channels: {
        data:       new Map([[channel.name, channel]]),
        processing: false
      },
      channelModerators: {
        processing: false,
        data:       new Map([[channel.name, moderators]])
      },
      forms: {
        [MODERATORS_KEY]: {
          value:  newMemberForm(),
          errors: {}
        }
      },
      ui: {
        dialogs: new Map()
      }
    }
    initialProps = {
      match: {
        params: {
          channelName: channel.name
        }
      },
      channel: channel
    }

    render = helper.configureHOCRenderer(
      EditChannelModeratorsPage,
      InnerEditChannelModeratorsPage,
      initialState,
      initialProps
    )
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
    helper.getWidgetListStub.returns(Promise.resolve(makeWidgetListResponse(0)))
    helper.sandbox.stub(window, "scrollTo")
    helper.sandbox.stub(embedLib, "ensureTwitterEmbedJS")
  })

  afterEach(() => {
    helper.cleanup()
  })

  it("should set the document title", async () => {
    const { inner } = await render()
    assert.equal(
      inner.find("MetaTags").props().children.props.children,
      formatTitle("Edit Channel")
    )
  })

  it("displays a notice that membership is managed by micromasters", async () => {
    channel.membership_is_managed = true
    const { inner } = await render()
    assert.equal(
      inner.find(".membership-notice").text(),
      "Membership is managed via MicroMasters"
    )
  })

  it("renders the member list", async () => {
    const { inner } = await render()
    const props = inner.find("MembersList").props()
    assert.deepEqual(props.members, moderators)
    assert.equal(props.editable, !channel.membership_is_managed)
    assert.equal(
      props.usernameGetter(moderators[0]),
      moderators[0].moderator_name
    )
    assert.deepEqual(props.channel, channel)
    assert.equal(props.memberTypeDescription, "moderator")
  })

  describe("mounted tests", () => {
    let mountedRenderComponent

    beforeEach(() => {
      mountedRenderComponent = helper.renderComponent.bind(helper)
    })

    const mountedRenderPage = async (extraActions = []) => {
      const [wrapper] = await mountedRenderComponent(
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

    it("redirects if the user is not a moderator", async () => {
      channel.user_is_moderator = false
      await mountedRenderPage([
        actions.channels.get.requestType,
        actions.channels.get.successType,
        actions.postsForChannel.get.requestType,
        actions.postsForChannel.get.successType,
        actions.widgets.get.requestType,
        actions.widgets.get.successType,
        actions.forms.FORM_END_EDIT
      ])

      const history = helper.browserHistory
      assert.equal(history.location.pathname, channelURL(channel.name))
    })
  })

  describe("editable", () => {
    beforeEach(() => {
      channel.membership_is_managed = false
    })

    it("renders the form", async () => {
      const { inner } = await render()
      const props = inner.find("EditChannelMembersForm").props()
      assert.deepEqual(props.memberTypeDescription, "moderator")
      assert.deepEqual(props.form, newMemberForm())
    })

    it("updates the email", async () => {
      const { inner, store } = await render()
      const props = inner.find("EditChannelMembersForm").props()
      const email = "new@email.com"
      props.onUpdate({ target: { name: "email", value: email } })

      const actions = store.getActions()
      assert.deepEqual(actions[actions.length - 1], {
        type:    FORM_UPDATE,
        payload: {
          formKey: MODERATORS_KEY,
          value:   { email }
        }
      })
    })

    it("tries to add a new moderator but the API request fails", async () => {
      helper.addChannelModeratorStub.returns(Promise.reject("an error"))

      const email = "new@email.com"
      const { inner, store } = await render({
        forms: {
          [MODERATORS_KEY]: {
            value: {
              email
            },
            errors: {}
          }
        }
      })

      const props = inner.find("EditChannelMembersForm").props()
      await props.onSubmit({ preventDefault: helper.sandbox.stub() })
      sinon.assert.calledWith(
        helper.addChannelModeratorStub,
        channel.name,
        email
      )

      const actions = store.getActions()
      assert.deepEqual(actions[actions.length - 1], {
        type:    FORM_VALIDATE,
        payload: {
          formKey: MODERATORS_KEY,
          errors:  {
            email: "Error adding new moderator"
          }
        }
      })
    })

    it("adds a new moderator", async () => {
      const newModerator = makeModerator(null, true)
      const newSubscriber = makeSubscriber(newModerator.moderator_name)
      helper.addChannelModeratorStub.returns(Promise.resolve(newModerator))
      helper.addChannelSubscriberStub.returns(Promise.resolve(newSubscriber))

      const email = "new@email.com"
      const { inner, store } = await render({
        forms: {
          [MODERATORS_KEY]: {
            value: {
              email
            },
            errors: {}
          }
        }
      })

      inner
        .find("EditChannelMembersForm")
        .props()
        .onSubmit({ preventDefault: helper.sandbox.stub() })

      await wait(0)
      sinon.assert.calledWith(
        helper.addChannelModeratorStub,
        channel.name,
        email
      )
      sinon.assert.calledWith(
        helper.addChannelSubscriberStub,
        channel.name,
        newModerator.moderator_name
      )

      const actions = store.getActions()
      assert.deepEqual(actions[actions.length - 2], {
        type:    SET_SNACKBAR_MESSAGE,
        payload: {
          message: `Successfully added ${String(
            newModerator.email
          )} as a moderator`
        }
      })
    })
  })
  ;[true, false].forEach(isYou => {
    it(`removes ${
      isYou ? "yourself from being a moderator" : "a moderator"
    }`, async () => {
      const { inner, store } = await render(
        {},
        { history: helper.browserHistory }
      )

      helper.deleteChannelModeratorStub.returns(Promise.resolve())

      if (isYou) {
        // this will be checked after the loadPosts
        channel.user_is_moderator = false
        helper.getChannelStub.returns(Promise.resolve(channel))
      }
      inner.find("MembersList").props().removeMember(channel, moderators[0])

      // wait for promise to resolve
      await wait(0)
      sinon.assert.calledWith(
        helper.deleteChannelModeratorStub,
        channel.name,
        moderators[0].moderator_name
      )
      if (isYou) {
        assert.equal(
          helper.browserHistory.location.pathname,
          channelURL(channel.name)
        )
      }

      const actions = store.getActions()

      assert.deepEqual(actions[actions.length - 3], {
        type:    SET_SNACKBAR_MESSAGE,
        payload: {
          message: `Successfully removed ${String(
            moderators[0].email
          )} as a moderator`
        }
      })

      assert.deepEqual(actions[actions.length - 2], {
        type:    HIDE_DIALOG,
        payload: DIALOG_REMOVE_MEMBER
      })
    })
  })

  //
  ;[true, false].forEach(hasDialog => {
    it(`passes a dialog value of ${String(hasDialog)}`, async () => {
      const { inner } = await render({
        ui: {
          dialogs: new Map(hasDialog ? [[DIALOG_REMOVE_MEMBER, true]] : [])
        }
      })

      assert.equal(inner.find("MembersList").props().dialogOpen, hasDialog)
    })
  })
  ;[true, false].forEach(dialogVisibility => {
    it(`sets dialog visibility to ${String(dialogVisibility)}`, async () => {
      const { inner, store } = await render()
      inner.find("MembersList").props().setDialogVisibility(dialogVisibility)

      const actions = store.getActions()
      assert.deepEqual(actions[actions.length - 1], {
        type:    dialogVisibility ? SHOW_DIALOG : HIDE_DIALOG,
        payload: DIALOG_REMOVE_MEMBER
      })
    })
  })

  it("sets dialog data", async () => {
    const { inner, store } = await render()
    const data = { a: "data" }
    inner.find("MembersList").props().setDialogData(data)
    const actions = store.getActions()
    assert.deepEqual(actions[actions.length - 1], {
      type:    SET_DIALOG_DATA,
      payload: { data, dialogKey: DIALOG_REMOVE_MEMBER }
    })
  })

  it("has a channel header", async () => {
    render = helper.configureHOCRenderer(
      EditChannelModeratorsPage,
      "withChannelHeader(WithSingleColumn)",
      initialState,
      initialProps
    )

    const { inner } = await render()
    assert.isTrue(inner.find("ChannelHeader").exists())
  })
})

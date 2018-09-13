// @flow
import { actions } from "../actions"
import IntegrationTestHelper from "../util/integration_test_helper"
import { makeSubscriber } from "../factories/channels"

describe("channelSubscribers reducers", () => {
  let helper, dispatchThen, newSubscriber

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    newSubscriber = makeSubscriber("new_mod")
    dispatchThen = helper.store.createDispatchThen(
      state => state.channelSubscribers
    )
    helper.addChannelSubscriberStub.returns(Promise.resolve(newSubscriber))
    helper.deleteChannelSubscriberStub.returns(Promise.resolve())
  })

  afterEach(() => {
    helper.cleanup()
  })

  it("should add a new subscriber", async () => {
    const channelName = "a_channel"

    await dispatchThen(
      actions.channelSubscribers.post(
        channelName,
        newSubscriber.subscriber_name
      ),
      [
        actions.channelSubscribers.post.requestType,
        actions.channelSubscribers.post.successType
      ]
    )
    // if we got this far everything should have succeeded
  })

  it("should remove a subscriber", async () => {
    const channelName = "a_channel"

    await dispatchThen(
      actions.channelSubscribers.delete(
        channelName,
        newSubscriber.subscriber_name
      ),
      [
        actions.channelSubscribers.delete.requestType,
        actions.channelSubscribers.delete.successType
      ]
    )
    // if we got this far we should have succeeded
  })
})

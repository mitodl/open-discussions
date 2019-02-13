// @flow
import React from "react"
import { mount } from "enzyme/build"
import { assert } from "chai"
import sinon from "sinon"
import { SortableContainer } from "react-sortable-hoc"

import PeopleItem from "./PeopleItem"
import Router from "../../Router"

import { makeProfile } from "../../factories/profiles"
import { shouldIf } from "../../lib/test_utils"
import IntegrationTestHelper from "../../util/integration_test_helper"

describe("PeopleItem", () => {
  let profile, helper, addProfileStub, deleteProfileStub

  beforeEach(() => {
    profile = makeProfile()
    helper = new IntegrationTestHelper()
    deleteProfileStub = helper.sandbox.stub()
    addProfileStub = helper.sandbox.stub()
  })

  afterEach(() => {
    helper.cleanup()
  })

  const WrappedPeopleItem = SortableContainer(props => (
    <PeopleItem {...props} />
  ))

  const render = (props = {}) =>
    mount(
      <Router store={helper.store} history={helper.browserHistory}>
        <WrappedPeopleItem
          profile={profile}
          deleteProfile={deleteProfileStub}
          index={3}
          editing={false}
          addProfile={addProfileStub}
          {...props}
        />
      </Router>,
      {
        // for react-sortable-hoc
        context: {
          manager: {
            add:    helper.sandbox.stub(),
            remove: helper.sandbox.stub()
          }
        }
      }
    )

  it("renders a PeopleItem", () => {
    const wrapper = render()
    assert.deepEqual(wrapper.find("ProfileImage").prop("profile"), profile)
    assert.equal(wrapper.find("Link").text(), profile.name)
    assert.equal(
      wrapper.find(".description .headline").text(),
      profile.headline
    )
  })
  ;[true, false].forEach(hasEditButtons => {
    it(`${shouldIf(
      hasEditButtons
    )} have a delete button and a drag handle`, () => {
      const wrapper = render({ editing: hasEditButtons })
      assert.equal(wrapper.find(".delete").exists(), hasEditButtons)
      assert.equal(wrapper.find("sortableHandle").exists(), hasEditButtons)

      if (hasEditButtons) {
        assert.equal(deleteProfileStub.callCount, 0)
        wrapper.find(".delete").prop("onClick")()
        sinon.assert.calledWith(deleteProfileStub, profile)
      }
    })
  })
  ;[true, false].forEach(hasAddButton => {
    it(`${shouldIf(hasAddButton)} have an add button`, () => {
      const wrapper = render({
        addProfile: hasAddButton ? addProfileStub : null
      })
      assert.equal(wrapper.find(".add-profile").exists(), hasAddButton)
      if (hasAddButton) {
        assert.equal(addProfileStub.callCount, 0)
        wrapper.find(".add-profile").prop("onClick")()
        sinon.assert.calledWith(addProfileStub, profile)
      }
    })
  })
})

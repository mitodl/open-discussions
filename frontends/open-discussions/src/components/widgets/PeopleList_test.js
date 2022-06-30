// @flow
import React from "react"
import R from "ramda"
import { mount } from "enzyme"
import { assert } from "chai"
import sinon from "sinon"

import PeopleList from "./PeopleList"
import PeopleItem from "./PeopleItem"
import Router from "../../Router"

import IntegrationTestHelper from "../../util/integration_test_helper"
import { makeProfile } from "../../factories/profiles"
import { shouldIf } from "../../lib/test_utils"
import * as urlLib from "../../lib/url"

describe("PeopleList", () => {
  let profiles, helper, addProfileStub, deleteProfileStub

  beforeEach(() => {
    profiles = R.range(0, 10).map(index => makeProfile(`user_${index}`))
    helper = new IntegrationTestHelper()
    deleteProfileStub = helper.sandbox.stub()
    addProfileStub = helper.sandbox.stub()
  })

  afterEach(() => {
    helper.cleanup()
  })

  const render = (props = {}) =>
    mount(
      <Router store={helper.store} history={helper.browserHistory}>
        <PeopleList
          profiles={profiles}
          deleteProfile={deleteProfileStub}
          addProfile={addProfileStub}
          editing={false}
          {...props}
        />
      </Router>
    )

  //
  ;[true, false].forEach(editing => {
    it(`renders a list of PeopleItem with editing=${String(editing)}`, () => {
      const wrapper = render({ editing })
      assert.equal(wrapper.find(PeopleItem).length, profiles.length)

      profiles.forEach((profile, i) => {
        const props = wrapper.find(PeopleItem).at(i).props()
        assert.deepEqual(props.profile, profile)
        assert.equal(props.index, i)
        assert.equal(props.editing, editing)
        assert.equal(props.deleteProfile, deleteProfileStub)
        assert.equal(props.addProfile, addProfileStub)
      })
    })

    //
    ;[true, false].forEach(showAllMembersLink => {
      it(`${shouldIf(
        !editing && showAllMembersLink
      )} show a link to the members page if editing=${String(
        editing
      )} and showAllMembersLink = ${String(showAllMembersLink)}`, () => {
        const channelNameStub = helper.sandbox
          .stub(urlLib, "getChannelNameFromPathname")
          .returns("HEY")
        const channelMembersURLStub = helper.sandbox
          .stub(urlLib, "channelMembersURL")
          .returns("Boop")
        const wrapper = render({ editing, showAllMembersLink })

        if (!editing && showAllMembersLink) {
          assert.equal(wrapper.find("Link").length, profiles.length + 1)
          const { to, children } = wrapper.find("Link").last().props()
          assert.equal(children, "See all members")
          assert.equal(to, "Boop")
          sinon.assert.called(channelNameStub)
          sinon.assert.calledWith(channelMembersURLStub, "HEY")
        } else {
          assert.equal(wrapper.find("Link").length, profiles.length)
        }
      })
    })
  })
})

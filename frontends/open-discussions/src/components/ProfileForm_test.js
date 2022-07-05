// @flow
/* global SETTINGS: false */
import React from "react"
import { mount } from "enzyme"
import { assert } from "chai"

import ProfileForm from "./ProfileForm"
import { makeProfile, makeUserWebsite } from "../factories/profiles"
import ProfileImage from "./ProfileImage"
import { Provider } from "react-redux"
import IntegrationTestHelper from "../util/integration_test_helper"
import { PERSONAL_SITE_TYPE } from "../lib/constants"
import * as profileApi from "../lib/profile"

describe("ProfileForm", () => {
  let helper,
    profile,
    onUpdateStub,
    onSubmitStub,
    onUpdateSocialSiteStub,
    onSubmitSocialSiteStub,
    onUpdatePersonalSiteStub,
    onSubmitPersonalSiteStub,
    onDeleteSiteStub

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    profile = makeProfile()
    onUpdateStub = helper.sandbox.stub()
    onSubmitStub = helper.sandbox.stub()
    onUpdateSocialSiteStub = helper.sandbox.stub()
    onSubmitSocialSiteStub = helper.sandbox.stub()
    onUpdatePersonalSiteStub = helper.sandbox.stub()
    onSubmitPersonalSiteStub = helper.sandbox.stub()
    onDeleteSiteStub = helper.sandbox.stub()
  })

  afterEach(() => {
    helper.cleanup()
  })

  const renderForm = (
    props = {},
    form = {
      name:     profile.name,
      bio:      profile.bio,
      headline: profile.headline,
      location: profile.location
    },
    validation = { reason: "", name: "" }
  ) =>
    mount(
      <Provider store={helper.store}>
        <ProfileForm
          profile={profile}
          form={form}
          validation={validation}
          socialSiteFormValues={{}}
          socialSiteFormErrors={{}}
          personalSiteFormValues={{}}
          personalSiteFormErrors={{}}
          onUpdate={onUpdateStub}
          onSubmit={onSubmitStub}
          onUpdateSocialSite={onUpdateSocialSiteStub}
          onSubmitSocialSite={onSubmitSocialSiteStub}
          onUpdatePersonalSite={onUpdatePersonalSiteStub}
          onSubmitPersonalSite={onSubmitPersonalSiteStub}
          onDeleteSite={onDeleteSiteStub}
          history={{}}
          processing={false}
          {...props}
        />
      </Provider>
    )

  it("displays the name, headline and bio", () => {
    const wrapper = renderForm()
    assert.equal(
      wrapper
        .find(".profile-name")
        .find(".name")
        .props().value,
      profile.name
    )
    assert.equal(
      wrapper
        .find(".profile-name")
        .find(".name")
        .props().placeholder,
      "Full name"
    )
    assert.equal(
      wrapper
        .find(".bio")
        .find("textarea")
        .props().value,
      profile.bio
    )
    assert.equal(
      wrapper
        .find(".bio")
        .find("textarea")
        .props().placeholder,
      "Description"
    )
    assert.equal(
      wrapper
        .find(".bio")
        .find("label")
        .text(),
      "Add a short description about yourself, max 1000 characters"
    )
    assert.equal(
      wrapper
        .find(".headline")
        .find("input")
        .props().value,
      profile.headline
    )
    assert.equal(
      wrapper
        .find(".headline")
        .find("input")
        .props().placeholder,
      "Headline"
    )
    assert.equal(
      wrapper
        .find(".headline")
        .find("label")
        .text(),
      "For example: 'Post Doc, Photonics MIT', max 60 characters"
    )
  })

  //
  ;[true, false].forEach(sameUser => {
    it(`ProfileImage should ${
      sameUser ? "" : "not"
    } include an edit profile button`, async () => {
      SETTINGS.username = sameUser ? profile.username : "other_user"
      const wrapper = renderForm()
      const profileImage = wrapper.find(ProfileImage)
      assert.isTrue(profileImage.exists())
      assert.equal(profileImage.props().editable, sameUser)
    })
  })

  it("calls onUpdate", () => {
    const wrapper = renderForm()
    const event = {
      target: {
        name:  "name",
        value: "Test User"
      }
    }
    wrapper
      .find("input")
      .at(0)
      .simulate("change", event)
    assert.ok(onUpdateStub.called)
  })

  it("calls onSubmit", () => {
    const wrapper = renderForm({ processing: false })
    wrapper
      .find(".save-profile")
      .at(0)
      .simulate("click")
    assert.ok(onSubmitStub.called)
  })

  it("submit Button disabled when processing", () => {
    const wrapper = renderForm({ processing: true })
    const submitBtn = wrapper.find(".save-profile").at(0)
    assert.isTrue(submitBtn.props().disabled)
    submitBtn.simulate("click")
    assert.isNotOk(onSubmitStub.called)
  })

  it("renders an empty form", () => {
    ["name", "bio", "headline"].forEach(field => {
      // $FlowFixMe
      profile[field] = null
      const wrapper = renderForm()
      assert.equal(wrapper.find(`[name="${field}"]`).props().value, "")
    })
  })

  describe("websites section", () => {
    let getSocialSitesStub, getPersonalSiteStub, personalSite, socialSites

    beforeEach(() => {
      personalSite = makeUserWebsite()
      personalSite.site_type = PERSONAL_SITE_TYPE
      socialSites = [makeUserWebsite(), makeUserWebsite()]
      getSocialSitesStub = helper.sandbox.stub(profileApi, "getSocialSites")
      getSocialSitesStub.returns([])
      getPersonalSiteStub = helper.sandbox.stub(profileApi, "getPersonalSite")
      getPersonalSiteStub.returns(undefined)
    })
    ;["socialSite", "personalSite"].forEach(inputName => {
      it(`updates when text is entered into ${inputName} input`, () => {
        const updateStub =
          inputName === "socialSite"
            ? onUpdateSocialSiteStub
            : onUpdatePersonalSiteStub
        const wrapper = renderForm()
        const event = {
          target: {
            name:  "name",
            value: "example.com"
          }
        }
        wrapper
          .find(`input[name="${inputName}"]`)
          .at(0)
          .simulate("change", event)
        assert.isTrue(updateStub.called)
      })
    })

    it("renders an input when the user has not yet provided a personal site", () => {
      getPersonalSiteStub.returns(undefined)
      const wrapper = renderForm()
      assert.lengthOf(wrapper.find("SiteLogoLink"), 0)
      assert.isTrue(
        wrapper.find('.personal-site-link input[type="text"]').exists()
      )
    })

    it("renders existing personal site and social sites", () => {
      getSocialSitesStub.returns(socialSites)
      getPersonalSiteStub.returns(personalSite)
      const wrapper = renderForm()
      assert.lengthOf(wrapper.find("SiteLogoLink"), 1)
      assert.lengthOf(wrapper.find("SocialSiteLogoLink"), socialSites.length)
    })
    ;[
      [".social-site-links", "socialSiteFormValues", "social"],
      [".personal-site-link", "personalSiteFormValues", "personal"]
    ].forEach(([sectionSel, formValueProp, siteTypeDesc]) => {
      it(`submits input text when the submit button is clicked in the ${siteTypeDesc} site section`, () => {
        const submitStub =
          siteTypeDesc === "social"
            ? onSubmitSocialSiteStub
            : onSubmitPersonalSiteStub
        const wrapper = renderForm({
          [formValueProp]: {
            url: "example.com"
          }
        })
        wrapper
          .find(`${sectionSel} button`)
          .at(0)
          .simulate("click")
        assert.isTrue(submitStub.called)
      })
    })

    it("deletes site when the delete is clicked", () => {
      let wrapper
      getSocialSitesStub.returns(socialSites)
      getPersonalSiteStub.returns(personalSite)

      wrapper = renderForm()
      wrapper
        .find(".social-site-links button.remove")
        .at(0)
        .simulate("click")
      assert.isTrue(onDeleteSiteStub.calledWith(socialSites[0].id))

      wrapper = renderForm()
      wrapper
        .find(".personal-site-link button.remove")
        .at(0)
        .simulate("click")
      assert.isTrue(onDeleteSiteStub.calledWith(personalSite.id))
    })
  })
})

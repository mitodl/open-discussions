// @flow
import React from "react"
import R from "ramda"
import { assert } from "chai"
import { shallow } from "enzyme"
import sinon from "sinon"
import { arrayMove } from "react-sortable-hoc"

import PeopleSelector, {
  PeopleSelector as InnerPeopleSelector
} from "./PeopleSelector"
import PeopleList from "./PeopleList"

import IntegrationTestHelper from "../../util/integration_test_helper"
import { shouldIf } from "../../lib/test_utils"
import { makeProfile } from "../../factories/profiles"
import { makeSearchResponse } from "../../factories/search"
import { searchResultToProfile } from "../../lib/search"
import { actions } from "../../actions"

describe("PeopleSelector", () => {
  let helper,
    profiles,
    suggestionsResponse,
    suggestions,
    render,
    initialState,
    initialProps,
    updateProfilesStub

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    suggestionsResponse = makeSearchResponse(10, 15, "profile")
    suggestions = suggestionsResponse.hits.hits
      .map(item => item._source)
      .map((profile, i) => ({
        ...profile,
        author_id: `user ${i}`
      }))
    helper.searchStub.returns(Promise.resolve(suggestionsResponse))
    initialState = {
      search: {
        data: {
          results: suggestions
        }
      }
    }
    profiles = R.range(1, 9).map(i => makeProfile(`other_user_${i}`))
    updateProfilesStub = helper.sandbox.stub()
    initialProps = {
      profiles,
      updateProfiles: updateProfilesStub
    }
    render = helper.configureHOCRenderer(
      PeopleSelector,
      InnerPeopleSelector,
      initialState,
      initialProps
    )
  })

  afterEach(() => {
    helper.cleanup()
  })

  it("clears the search on mount", async () => {
    const { store } = await render()
    assert.deepEqual(store.getActions(), [
      { type: actions.search.clear.toString() }
    ])
  })

  describe("Autosuggest", () => {
    it("has suggestion props", async () => {
      const { inner } = await render()
      const props = inner.find("Autosuggest").props()
      assert.deepEqual(
        props.suggestions,
        suggestions.map(searchResultToProfile)
      )
      assert.equal(props.getSuggestionValue(profiles[0]), profiles[0].name)
      assert.isTrue(props.alwaysRenderSuggestions)
    })

    it("renders the input component", async () => {
      const { inner } = await render()
      const propKey = "newPropKey"
      const propValue = "newPropValue"
      const component = inner.find("Autosuggest").prop("renderInputComponent")({
        [propKey]: propValue
      })
      assert.deepEqual(
        shallow(component).find("input").prop(propKey),
        propValue
      )
    })

    it("renders a suggestion and adds a profile", async () => {
      const { inner, store } = await render()
      inner.setState({ text: "should not see this text later on" })
      const profile = makeProfile()
      const component = inner.find("Autosuggest").prop("renderSuggestion")(
        profile
      )

      const props = shallow(<div>{component}</div>)
        .find(".person-suggestion")
        .props()
      props.onClick(profile)
      sinon.assert.calledWith(updateProfilesStub, [...profiles, profile])

      const actionsList = store.getActions()
      assert.equal(
        actionsList[actionsList.length - 1].type,
        actions.search.clear.toString()
      )
      assert.equal(inner.state().text, "")
    })

    it("passes input props to the input component", async () => {
      const initialText = "initialText"
      const { wrapper, inner, store } = await render()
      inner.setState({ text: initialText })
      const inputProps = wrapper.find("Autosuggest").prop("inputProps")
      assert.equal(inputProps.value, initialText)
      assert.equal(inputProps.autoComplete, "off")

      const newText = "othertext"
      inputProps.onChange(null, { newValue: newText, method: "other" })
      // no change here due to mismatched method
      assert.equal(inner.state().text, initialText)
      inputProps.onChange(null, { newValue: newText, method: "type" })
      assert.equal(inner.state().text, newText)

      inputProps.onClear()
      assert.equal(inner.state().text, "")
      const actionsList = store.getActions()
      assert.equal(
        actionsList[actionsList.length - 1].type,
        actions.search.clear.toString()
      )
    })

    it("requests suggestions", async () => {
      const { inner } = await render()
      const value = "zxcvb"
      const reason = "input-changed"
      inner.find("Autosuggest").prop("onSuggestionsFetchRequested")({
        value,
        reason
      })
      sinon.assert.calledWith(helper.searchStub, {
        text: value,
        type: "profile"
      })
    })

    it("doesn't request suggestions if the reason doesn't match", async () => {
      const { inner } = await render()
      inner.find("Autosuggest").prop("onSuggestionsFetchRequested")({
        value:  "value",
        reason: "other"
      })
      assert.equal(helper.searchStub.callCount, 0)
    })

    it("clears suggestions if the text is emptyish", async () => {
      const { inner, store } = await render()
      const value = "  "
      const reason = "input-changed"
      inner.find("Autosuggest").prop("onSuggestionsFetchRequested")({
        value,
        reason
      })
      assert.equal(helper.searchStub.callCount, 0)
      const actionsList = store.getActions()
      assert.equal(
        actionsList[actionsList.length - 1].type,
        actions.search.clear.toString()
      )
    })
  })

  describe("PeopleList", () => {
    it("has props", async () => {
      const { inner } = await render()
      const props = inner.find(PeopleList).props()
      assert.deepEqual(props.profiles, profiles)
      assert.isTrue(props.useDragHandle)
      assert.isNull(props.addProfile)
      assert.isTrue(props.editing)
    })

    it("deletes", async () => {
      const { inner } = await render()
      const profile = profiles[3]
      const updatedProfiles = profiles.filter(
        _profile => _profile.username !== profile.username
      )
      inner.find(PeopleList).prop("deleteProfile")(profile)
      sinon.assert.calledWith(updateProfilesStub, updatedProfiles)
    })

    it("reorders", async () => {
      const { inner } = await render()
      const oldIndex = 3,
        newIndex = 1
      const reordered = arrayMove(profiles, oldIndex, newIndex)
      inner.find(PeopleList).prop("onSortEnd")({ oldIndex, newIndex })
      sinon.assert.calledWith(updateProfilesStub, reordered)
    })
  })

  //
  ;[true, false].forEach(hasDuplicate => {
    it(`${shouldIf(
      hasDuplicate
    )} filters out duplicate suggestions from state`, async () => {
      let expected = suggestions.map(searchResultToProfile)

      if (hasDuplicate) {
        profiles[0].username = suggestions[0].author_id
        expected = expected.filter(
          profile => profile.username !== profiles[0].username
        )
      }
      const { inner } = await render()

      assert.deepEqual(inner.find("Autosuggest").prop("suggestions"), expected)
    })
  })
})

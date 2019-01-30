// @flow
import React from "react"
import R from "ramda"
import Autosuggest from "react-autosuggest"
import { arrayMove } from "react-sortable-hoc"
import { connect } from "react-redux"

import PeopleList from "./PeopleList"
import { PeopleItem } from "./PeopleItem"
import SearchTextbox from "../SearchTextbox"

import { actions } from "../../actions"
import { searchResultToProfile } from "../../lib/search"
import { SEARCH_FILTER_PROFILE } from "../../lib/picker"

import type { Dispatch } from "redux"
import type { Profile } from "../../flow/discussionTypes"

type Props = {
  clearSearch: () => void,
  profiles: Array<Profile>,
  updateProfiles: (newJson: Array<Profile>) => void,
  suggestions: Array<Profile>,
  fetchSuggestions: (text: string) => Promise<Array<Profile>>
}
type State = {
  text: string
}
export class PeopleSelector extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)

    this.state = {
      text: ""
    }
  }

  componentDidMount() {
    const { clearSearch } = this.props
    clearSearch()
  }

  onSuggestionsFetchRequested = ({
    value,
    reason
  }: {
    value: string,
    reason: string
  }) => {
    const { clearSearch, fetchSuggestions } = this.props
    if (reason !== "input-changed") {
      return
    }

    if (value.trim().length === 0) {
      clearSearch()
      return
    }

    // NOTE: this may cause a race condition if a user types quickly and some requests resolve out of order
    fetchSuggestions(value)
  }

  renderInputComponent = (inputProps: Object) => (
    <SearchTextbox {...inputProps} />
  )

  onChangeText = (
    event: Event,
    { newValue, method }: { newValue: string, method: string }
  ) => {
    if (method !== "type") {
      return
    }

    this.setState({
      text: newValue
    })
  }

  clear = () => {
    const { clearSearch } = this.props
    clearSearch()
    this.setState({
      text: ""
    })
  }

  deleteProfile = (profile: Profile) => {
    const { profiles, updateProfiles } = this.props

    const newProfiles = profiles.filter(
      _profile => _profile.username !== profile.username
    )
    updateProfiles(newProfiles)
  }

  onSortEnd = ({
    oldIndex,
    newIndex
  }: {
    oldIndex: number,
    newIndex: number
  }) => {
    const { profiles, updateProfiles } = this.props
    updateProfiles(arrayMove(profiles, oldIndex, newIndex))
  }

  addProfile = (newProfile: Profile) => {
    const { updateProfiles, profiles } = this.props

    updateProfiles([...profiles, newProfile])
    this.clear()
  }

  render() {
    const { text } = this.state
    const { profiles, suggestions } = this.props

    return (
      <React.Fragment>
        <Autosuggest
          suggestions={suggestions}
          getSuggestionValue={profile => profile.name}
          onSuggestionsFetchRequested={this.onSuggestionsFetchRequested}
          alwaysRenderSuggestions={true}
          renderInputComponent={this.renderInputComponent}
          renderSuggestion={profile => (
            <PeopleItem
              profile={profile}
              editing={false}
              addProfile={this.addProfile}
            />
          )}
          inputProps={{
            value:        text,
            onChange:     this.onChangeText,
            onClear:      this.clear,
            autoComplete: "off"
          }}
        />
        <PeopleList
          profiles={profiles}
          editing={true}
          addProfile={null}
          deleteProfile={this.deleteProfile}
          onSortEnd={this.onSortEnd}
          useDragHandle={true}
        />
      </React.Fragment>
    )
  }
}
const mapStateToProps = (state, ownProps) => {
  const { profiles } = ownProps
  const suggestions = state.search.data.results.map(searchResultToProfile)

  // NOTE: ideally we should do this filtering in Elasticsearch, so that hits already filtered out don't occupy
  // space in the first set of hits. However this seems like an edge case and can be worked around by the user
  // by typing in more of the phrase to get the user they're looking for.
  const usernames = new Set(profiles.map(profile => profile.username))
  const newSuggestions = suggestions.filter(
    profile => !usernames.has(profile.username)
  )

  return {
    suggestions: newSuggestions
  }
}
const mapDispatchToProps = (dispatch: Dispatch<*>) => ({
  clearSearch:      () => dispatch(actions.search.clear()),
  fetchSuggestions: async (text: string): Promise<Array<Profile>> =>
    dispatch(
      actions.search.post({
        type: SEARCH_FILTER_PROFILE,
        text
      })
    )
})

export default R.compose(
  connect(
    mapStateToProps,
    mapDispatchToProps
  )
)(PeopleSelector)

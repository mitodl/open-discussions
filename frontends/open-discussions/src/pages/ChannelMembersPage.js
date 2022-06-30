// @flow
import React, { useEffect, useState } from "react"
import InfiniteScroll from "react-infinite-scroller"
import { connect } from "react-redux"

import SearchResult from "../components/SearchResult"
import { Grid, Cell } from "../components/Grid"
import { Loading } from "../components/Loading"
import { ChannelMembersSortPicker } from "../components/Picker"

import { actions } from "../actions"
import { clearSearch } from "../actions/search"
import { MEMBERS_SORT_AUTHOR_NAME, MEMBERS_SORT_JOIN_DATE } from "../lib/picker"

import type { SearchParams, Result } from "../flow/searchTypes"

export const CHANNEL_MEMBERS_PAGE_SIZE = 50

export const getSortOption = (sortField: string, channelName: string) => {
  switch (sortField) {
  case MEMBERS_SORT_AUTHOR_NAME:
    return "asc"
  case MEMBERS_SORT_JOIN_DATE:
    return {
      order:         "desc",
      nested_path:   "author_channel_join_data",
      nested_filter: {
        term: {
          "author_channel_join_data.name": channelName
        }
      }
    }
  }
}

const channelMemberParams = (channelName, from, sortField) => ({
  channelName,
  from,
  type: "profile",
  size: CHANNEL_MEMBERS_PAGE_SIZE,
  sort: {
    field:  sortField,
    option: getSortOption(sortField, channelName)
  }
})

type StateProps = {|
  results: Array<Result>,
  total: number,
  searchLoaded: boolean
|}

type DispatchProps = {|
  runSearch: Function,
  clearSearch: Function
|}

type OwnProps = {|
  channelName: string
|}

type Props = {|
  ...StateProps,
  ...DispatchProps,
  ...OwnProps
|}

function ChannelMembersPage(props: Props) {
  const { runSearch, results, total, searchLoaded, channelName, clearSearch } =
    props

  const [from, setFrom] = useState(0)
  const [sortField, setSortField] = useState(MEMBERS_SORT_AUTHOR_NAME)

  useEffect(() => {
    runSearch(channelMemberParams(channelName, from, sortField))
    setFrom(from + CHANNEL_MEMBERS_PAGE_SIZE)
    return clearSearch
    // empty dependencies is to run this effect only on startup, so
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="main-content two-column channel-member-page">
      <div className="header-row">
        <div className="picker-label">Sort by:</div>
        <ChannelMembersSortPicker
          value={sortField}
          updatePickerParam={param => () => {
            setSortField(param)
            clearSearch()
            setFrom(0)
            runSearch(channelMemberParams(channelName, 0, param))
          }}
        />
      </div>
      <InfiniteScroll
        hasMore={from + CHANNEL_MEMBERS_PAGE_SIZE < total}
        loadMore={() => {
          if (!searchLoaded) {
            return
          }
          runSearch(channelMemberParams(channelName, from, sortField))
          setFrom(from + CHANNEL_MEMBERS_PAGE_SIZE)
        }}
        initialLoad={from === 0}
        loader={<Loading className="infinite" key="loader" />}
      >
        <Grid>
          {results.map((result, i) => (
            <Cell key={i} width={6}>
              <SearchResult result={result} />
            </Cell>
          ))}
        </Grid>
      </InfiniteScroll>
    </div>
  )
}

const mapStateToProps = (state): StateProps => {
  const { search } = state
  const searchLoaded = search.loaded

  const { results, total } = search.data
  return { results, total, searchLoaded }
}

const mapDispatchToProps = (dispatch: Dispatch<*>): DispatchProps => ({
  runSearch: async (params: SearchParams) => {
    return await dispatch(actions.search.post(params))
  },
  clearSearch: async () => {
    dispatch(actions.search.clear())
    await dispatch(clearSearch())
  }
})

export default connect<Props, OwnProps, _, _, _, _>(
  mapStateToProps,
  mapDispatchToProps
)(ChannelMembersPage)

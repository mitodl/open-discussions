// @flow
import React, { useEffect, useState } from "react"
import InfiniteScroll from "react-infinite-scroller"
import { connect } from "react-redux"

import SearchResult from "../components/SearchResult"
import { Grid, Cell } from "../components/Grid"
import { Loading } from "../components/Loading"

import { actions } from "../actions"
import { clearSearch } from "../actions/search"

import type { SearchParams, Result } from "../flow/searchTypes"

export const CHANNEL_MEMBERS_PAGE_SIZE = 50

const channelMemberParams = (channelName, from) => ({
  channelName,
  from,
  type: "profile",
  size: CHANNEL_MEMBERS_PAGE_SIZE
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
  const {
    runSearch,
    results,
    total,
    searchLoaded,
    channelName,
    clearSearch
  } = props

  const [from, setFrom] = useState(0)

  useEffect(() => {
    runSearch(channelMemberParams(channelName, from))
    setFrom(from + CHANNEL_MEMBERS_PAGE_SIZE)
    return clearSearch
  }, [])

  return (
    <div className="main-content two-column channel-member-page">
      <InfiniteScroll
        hasMore={from + CHANNEL_MEMBERS_PAGE_SIZE < total}
        loadMore={() => {
          if (!searchLoaded) {
            return
          }
          runSearch(channelMemberParams(channelName, from))
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

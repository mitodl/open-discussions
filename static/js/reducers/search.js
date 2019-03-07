// @flow
import { POST, INITIAL_STATE } from "redux-hammock/constants"

import * as api from "../lib/api/api"

import type { FacetResult, Result, SearchParams } from "../flow/searchTypes"
import { CLEAR_SEARCH } from "../actions/search"

type PostFuncReturn = {
  response: Object,
  params: SearchParams
}
type SearchState = {
  results: Array<Result>,
  facets: ?Map<string, FacetResult>,
  total: number,
  initialLoad: boolean
}

export const searchEndpoint = {
  name:         "search",
  verbs:        [POST],
  initialState: {
    ...INITIAL_STATE,
    data: {
      initialLoad: true,
      results:     [],
      facets:      null,
      total:       0
    }
  },
  postFunc: async (params: SearchParams): Promise<PostFuncReturn> => {
    const response = await api.search(params)
    return { response, params }
  },
  postSuccessHandler: (
    { response, params }: PostFuncReturn,
    oldData: SearchState
  ) => {
    const from = params.from || 0
    const oldResults = oldData.results.slice(0, from)

    return {
      // $FlowFixMe: doesn't know about ES structure
      results:     oldResults.concat(response.hits.hits.map(item => item._source)),
      // $FlowFixMe: doesn't know about ES structure
      facets:      new Map(Object.entries(response.aggregations || {})),
      total:       response.hits.total,
      initialLoad: false
    }
  },
  extraActions: {
    [CLEAR_SEARCH]: () => {
      return {
        // $FlowFixMe: doesn't know about ES structure
        results:     [],
        facets:      null,
        total:       0,
        initialLoad: true
      }
    }
  }
}

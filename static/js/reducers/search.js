// @flow
import { POST, INITIAL_STATE } from "redux-hammock/constants"

import * as api from "../lib/api/api"
import { CLEAR_SEARCH } from "../actions/search"

import type { FacetResult, Result, SearchParams } from "../flow/searchTypes"

type PostFuncReturn = {
  response: Object,
  params: SearchParams
}

type SearchState = {
  results: Array<Result>,
  facets: ?Map<string, FacetResult>,
  total: number,
  suggest: Array<string>,
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
      suggest:     [],
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
      suggest:     response.suggest,
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
        suggest:     [],
        total:       0,
        initialLoad: true
      }
    }
  }
}

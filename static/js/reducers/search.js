// @flow
import { POST, INITIAL_STATE } from "redux-hammock/constants"

import * as api from "../lib/api/api"

import type { Result, SearchParams } from "../flow/searchTypes"

type PostFuncReturn = {
  response: Object,
  params: SearchParams
}
type SearchState = {
  results: Array<Result>,
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
      total:       response.hits.total,
      initialLoad: false
    }
  }
}

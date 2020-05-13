// @flow
import _ from "lodash"
import qs from "query-string"

import { toArray } from "../lib/util"

const urlParamToArray = param => _.union(toArray(param) || [])

type URLSearchParams = {
  text: string,
  activeFacets: {
    type: Array<string>,
    offered_by: Array<string>,
    topics: Array<string>
  }
}

type Loc = {
  search: string
}

export const deserializeSearchParams = (location: Loc): URLSearchParams => {
  const { type, o, t, q } = qs.parse(location.search)

  return {
    text:         q,
    activeFacets: {
      type:       urlParamToArray(type),
      offered_by: urlParamToArray(o),
      topics:     urlParamToArray(t)
    }
  }
}

export const serializeSearchParams = ({
  text,
  activeFacets
}: Object): string => {
  // eslint-disable-next-line camelcase
  const { type, offered_by, topics } = activeFacets

  return qs.stringify({
    q: text || undefined,
    type,
    o: offered_by,
    t: topics
  })
}

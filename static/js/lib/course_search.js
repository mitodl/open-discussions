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
    topics: Array<string>,
    cost: Array<string>,
    availability: Array<string>
  }
}

type Loc = {
  search: string
}

export const deserializeSearchParams = (location: Loc): URLSearchParams => {
  const { type, o, t, c, a, q } = qs.parse(location.search)

  return {
    text:         q,
    activeFacets: {
      type:         urlParamToArray(type),
      offered_by:   urlParamToArray(o),
      topics:       urlParamToArray(t),
      cost:         urlParamToArray(c),
      availability: urlParamToArray(a)
    }
  }
}

export const serializeSearchParams = ({
  text,
  activeFacets
}: Object): string => {
  // eslint-disable-next-line camelcase
  const { type, offered_by, topics, availability, cost } = activeFacets

  return qs.stringify({
    q: text || undefined,
    type,
    o: offered_by,
    t: topics,
    a: availability,
    c: cost
  })
}

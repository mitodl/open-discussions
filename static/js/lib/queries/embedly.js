// @flow
import R from "ramda"
import { createSelector } from "reselect"

import { embedlyApiURL } from "../url"

export const getEmbedlys = createSelector(
  state => state.entities.embedlys,
  embedlys => embedlys
)

export const embedlyRequest = (url: string) => ({
  queryKey:  `embedlyRequest${url}`,
  url:       `${embedlyApiURL}/${encodeURIComponent(encodeURIComponent(url))}/`,
  transform: (embedly: any) => ({
    embedlys: { [url]: embedly }
  }),
  update: {
    embedlys: R.merge
  }
})

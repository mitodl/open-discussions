// @flow
import { fetchJSONWithAuthFailure } from "./fetch_auth"

import type { EmbedlyResponse } from "../../reducers/embedly"

export const getEmbedly = async (url: string): Promise<EmbedlyResponse> => {
  const response = await fetchJSONWithAuthFailure(
    `/api/v0/embedly/${encodeURIComponent(encodeURIComponent(url))}/`
  )
  return { url, response }
}

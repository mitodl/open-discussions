import type { LearningResourceResult } from "ol-search-ui"
import { useQuery } from "react-query"
import * as urls from "./urls"

const useResource = (type: string, id: number) => {
  return useQuery<LearningResourceResult>(urls.resource(type, id))
}

export { useResource }

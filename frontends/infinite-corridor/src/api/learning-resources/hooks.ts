import type { LearningResource } from "ol-search-ui"
import { useQuery } from "react-query"
import * as urls from "./urls"

const useResource = (type: string, id: number) => {
  return useQuery<LearningResource>(urls.resource(type, id))
}

export { useResource }

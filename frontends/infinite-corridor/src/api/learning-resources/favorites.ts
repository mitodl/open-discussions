import { LearningResource, PaginatedListItems } from "ol-search-ui"
import { PaginationSearchParams } from "ol-util"
import axios from "../../libs/axios"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { urls, keys } from "./urls"
import { modifyCachedSearchResource } from "./search"
import { invalidateResourceQueries } from "./util"

const useFavoritesListing = (options?: PaginationSearchParams) => {
  const url = urls.favorite.listing(options)
  const key = keys.favorites.listing.page(options)
  return useQuery<PaginatedListItems>(key, () =>
    axios.get(url).then(res => res.data)
  )
}

const useFavorite = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (resource: LearningResource) => {
      const url = urls.resource.favorite(resource.object_type, resource.id)
      return axios.post(url).then(res => res.data)
    },
    onSuccess(_data, resource) {
      queryClient.invalidateQueries({ queryKey: keys.favorites.all })
      invalidateResourceQueries(queryClient, resource)
      modifyCachedSearchResource(
        queryClient,
        {
          id:          resource.id,
          object_type: resource.object_type
        },
        () => ({ is_favorite: true })
      )
    }
  })
}

const useUnfavorite = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (resource: LearningResource) => {
      const url = urls.resource.unfavorite(resource.object_type, resource.id)
      return axios.post(url).then(res => res.data)
    },
    onSuccess(_data, resource) {
      invalidateResourceQueries(queryClient, resource)
      modifyCachedSearchResource(
        queryClient,
        {
          id:          resource.id,
          object_type: resource.object_type
        },
        () => ({ is_favorite: false })
      )
    }
  })
}

export { useFavoritesListing, useFavorite, useUnfavorite }

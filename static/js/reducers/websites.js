// @flow
import * as api from "../lib/api/api"
import { POST, DELETE } from "redux-hammock/constants"

export const userWebsitesEndpoint = {
  name:     "userWebsites",
  verbs:    [POST, DELETE],
  postFunc: (username: string, url: string, submittedSiteType?: string) =>
    api.postUserWebsite(username, url, submittedSiteType),
  deleteFunc: (userWebsiteId: number) => api.deleteUserWebsite(userWebsiteId)
}

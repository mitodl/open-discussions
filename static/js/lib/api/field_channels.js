// @flow
import R from "ramda"
import { PATCH, POST, DELETE } from "redux-hammock/constants"

import { fetchJSONWithAuthFailure, fetchWithAuthFailure } from "./fetch_auth"
import { getPaginationSortQS } from "./util"

import type {
  Channel,
  ChannelContributors,
  ChannelInvitation,
  Contributor,
  Subscriber,
  PostListPaginationParams,
  PostListResponse, ChannelModerators, Moderator
} from "../../flow/discussionTypes"

export function getFieldChannel(fieldName: string): Promise<FieldChannel> {
  return fetchJSONWithAuthFailure(`/api/v0/fields/${fieldName}/`)
}

export function getFieldChannels(): Promise<Array<FieldChannel>> {
  return fetchJSONWithAuthFailure("/api/v0/fields/")
}

export function createFieldChannel(fieldChannel: FieldChannel): Promise<FieldChannel> {
  return fetchJSONWithAuthFailure(`/api/v0/fields/`, {
    method: POST,
    body:   JSON.stringify(
      R.pickAll(
        [
          "name",
          "title",
          "public_description",
        ],
        fieldChannel
      )
    )
  })
}

export function updateFieldChannel(fieldChannel: FieldChannel): Promise<FieldChannel> {
  return fetchJSONWithAuthFailure(`/api/v0/fields/${fieldChannel.name}/`, {
    method: PATCH,
    body:   JSON.stringify(
      R.pickAll(
        [
          "title",
          "public_description",
          "about",
          "ga_tracking_id"
        ],
        fieldChannel
      )
    )
  })
}

export function getFieldAdmins(
  fieldName: string
): Promise<FieldAdmins> {
  return fetchJSONWithAuthFailure(`/api/v0/fields/${fieldName}/admins/`)
}

export function addFieldAdmin(
  fieldName: string,
  email: string
): Promise<FieldAdmin> {
  return fetchJSONWithAuthFailure(
    `/api/v0/fields/${fieldName}/admins/`,
    {
      method: POST,
      body:   JSON.stringify({ email })
    }
  )
}

export function deleteFieldAdmin(
  fieldName: string,
  username: string
): Promise<void> {
  return fetchWithAuthFailure(
    `/api/v0/fields/${fieldName}/admins/${username}/`,
    { method: DELETE }
  )
}

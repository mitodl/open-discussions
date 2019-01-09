// @flow
import { fetchWithAuthFailure } from "./fetch_auth"

export const getCKEditorJWT = () => fetchWithAuthFailure("/api/v0/ckeditor/")

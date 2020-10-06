
import { fetchJSONWithAuthFailure } from "./fetch_auth";
import { getPaginationSortQS } from "./util";

import { PostListPaginationParams, PostListResponse } from "../../flow/discussionTypes";

export function getFrontpage(params: PostListPaginationParams): Promise<PostListResponse> {
  return fetchJSONWithAuthFailure(`/api/v0/frontpage/${getPaginationSortQS(params)}`);
}
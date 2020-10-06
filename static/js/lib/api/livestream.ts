
import { fetchJSONWithAuthFailure } from "./fetch_auth";

import { LiveStreamEvent } from "../../flow/livestreamTypes";

export type LiveStreamResponse = {
  total: number;
  data: Array<LiveStreamEvent>;
};

export const getLivestreamEvents = (): Promise<LiveStreamResponse> => fetchJSONWithAuthFailure(`/api/v0/livestream/`);
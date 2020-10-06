
import { createAction } from "redux-actions";

export const SET_CHANNEL_DATA = "SET_CHANNEL_DATA";
export const setChannelData = createAction<string, any>(SET_CHANNEL_DATA);

export const CLEAR_CHANNEL_ERROR = "CLEAR_CHANNEL_ERROR";
export const clearChannelError = createAction<string, any>(CLEAR_CHANNEL_ERROR);
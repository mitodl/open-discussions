
import { createAction } from "redux-actions";

export const CLEAR_SEARCH = "CLEAR_SEARCH";
export const clearSearch = createAction<string, any>(CLEAR_SEARCH);

export const SET_SEARCH_INCREMENTAL = "SET_SEARCH_INCREMENTAL";
export const setSearchIncremental = createAction<string, any>(SET_SEARCH_INCREMENTAL);


/* global SETTINGS:false */
import { safeBulkGet } from "../lib/maps";
import { createSelector } from "reselect";
import _ from "lodash";

import { INITIAL_AUDIO_STATE } from "../reducers/audio";

import { Channel } from "../flow/discussionTypes";
import { Profile } from "../flow/discussionTypes";

export const getSubscribedChannels = (state: Object): Array<Channel> => state.subscribedChannels.loaded ? safeBulkGet(state.subscribedChannels.data, state.channels.data) : [];

export const getOwnProfile = (state: Object): Profile | null | undefined => SETTINGS.username ? state.profiles.data.get(SETTINGS.username) : null;

export const audioPlayerStateSelector = createSelector(state => state.audio, audio => audio.playerState);

export const currentlyPlayingAudioSelector = createSelector(state => state.audio, audio => audio.currentlyPlaying);

export const isAudioPlayerLoadedSelector = createSelector(state => state.audio, audio => !_.isEqual(audio.currentlyPlaying, INITIAL_AUDIO_STATE.currentlyPlaying));
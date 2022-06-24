// @flow
import _ from "lodash"
import React, { useRef, useCallback } from "react"
import { useSelector } from "react-redux"
import Amplitude from "amplitudejs"

import { INITIAL_AUDIO_STATE } from "../reducers/audio"
import {
  audioPlayerStateSelector,
  currentlyPlayingAudioSelector
} from "../lib/redux_selectors"
import { AUDIO_PLAYER_PLAYING } from "../lib/constants"
import { useStopAudioPlayer } from "../hooks/audio_player"

export default function AudioPlayer() {
  const seekBar = useRef()
  const playPauseButton = useRef()

  const audioPlayerState = useSelector(audioPlayerStateSelector)
  const currentlyPlayingAudio = useSelector(currentlyPlayingAudioSelector)

  const audioLoaded = !_.isEqual(
    currentlyPlayingAudio,
    INITIAL_AUDIO_STATE.currentlyPlaying
  )

  const skipSeconds = seconds => {
    const duration = Amplitude.getSongDuration()
    const currentTime = parseFloat(Amplitude.getSongPlayedSeconds())
    const targetTime = parseFloat(currentTime + seconds)
    Amplitude.setSongPlayedPercentage((targetTime / duration) * 100)
  }

  const seekBarClick = useCallback(
    (e: Object) => {
      const { current } = seekBar
      if (current && current.getBoundingClientRect && current.offsetWidth) {
        const offset = current.getBoundingClientRect()
        const offsetWidth = current.offsetWidth
        const x = e.pageX - offset.left
        Amplitude.setSongPlayedPercentage(
          (parseFloat(x) / parseFloat(offsetWidth)) * 100
        )
      }
    },
    [seekBar]
  )

  const stopAudioPlayer = useStopAudioPlayer()

  return (
    <div
      className={`audio-player-container-outer${!audioLoaded ? " hidden" : ""}`}
    >
      <div className="audio-player-container-inner">
        <div className="audio-player-text">
          <div className="audio-player-titles">
            <div
              className="audio-player-title"
              data-amplitude-song-info="album"
            />
            <div
              className="audio-player-description"
              data-amplitude-song-info="name"
            />
          </div>
        </div>
        <div className="audio-player-controls">
          <div className="audio-player-playback-controls">
            <div className="audio-player-button-container">
              <i
                className="audio-player-close material-icons close"
                onClick={stopAudioPlayer}
              >
                close
              </i>
              <div
                className="audio-player-button"
                onClick={() => skipSeconds(-10)}
              >
                <span id="audio-player-back-ten" className="material-icons">
                  replay_10
                </span>
              </div>
              <div
                className="audio-player-button amplitude-play-pause"
                id="play-pause"
                ref={playPauseButton}
              >
                <span className="material-icons">
                  {audioPlayerState === AUDIO_PLAYER_PLAYING
                    ? "pause_circle_outline"
                    : "play_circle_outline"}
                </span>
              </div>
              <div
                id="audio-player-forward-thirty"
                className="audio-player-button"
                onClick={() => skipSeconds(30)}
              >
                <span className="material-icons">forward_30</span>
              </div>
            </div>
            <div className="audio-player-playback-speed-container">
              <button className="dark-outlined amplitude-playback-speed" />
            </div>
          </div>
          <div className="audio-player-progress-container">
            <time className="audio-player-time-text-left">
              <span className="amplitude-current-minutes" />:
              <span className="amplitude-current-seconds" />
            </time>
            <progress
              className="amplitude-song-played-progress audio-player-progress"
              id="audio-player-progress"
              ref={seekBar}
              onClick={seekBarClick}
            />
            <time className="audio-player-time-text-right">
              <span className="amplitude-duration-minutes" />:
              <span className="amplitude-duration-seconds" />
            </time>
          </div>
        </div>
      </div>
    </div>
  )
}

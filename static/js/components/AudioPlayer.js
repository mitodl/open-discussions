// @flow
import _ from "lodash"
import React, { useEffect, useRef, useCallback, useState } from "react"
import { useSelector } from "react-redux"
import Amplitude from "amplitudejs"

import { currentlyPlayingAudioSelector } from "../lib/redux_selectors"

export default function AudioPlayer() {
  const seekBar = useRef()
  const playPauseButton = useRef()
  const currentlyPlayingAudio = useSelector(currentlyPlayingAudioSelector)
  const [audioLoaded, setAudioLoaded] = useState(false)

  useEffect(
    () => {
      if (Amplitude.getPlayerState() === "playing") {
        Amplitude.pause()
      }
      if (_.values(currentlyPlayingAudio).every(_.isEmpty)) {
        setAudioLoaded(false)
        return
      }
      Amplitude.init({
        songs: [
          {
            album: currentlyPlayingAudio.title,
            name:  currentlyPlayingAudio.description,
            url:   currentlyPlayingAudio.url
          }
        ],
        waveforms: {
          sample_rate: 3000
        }
      })
      const { current } = playPauseButton
      if (current && current.click) {
        current.click()
      }
      setAudioLoaded(true)
    },
    [currentlyPlayingAudio]
  )

  const backTenClick = useCallback(() => {
    Amplitude.skipTo(Amplitude.getSongPlayedSeconds() - 10, 0, null)
  })

  const forwardThirtyClick = useCallback(() => {
    Amplitude.skipTo(Amplitude.getSongPlayedSeconds() + 30, 0, null)
  })

  const seekBarClick = useCallback((e: Object) => {
    const { current } = seekBar
    if (current && current.getBoundingClientRect && current.offsetWidth) {
      const offset = current.getBoundingClientRect()
      const offsetWidth = current.offsetWidth
      const x = e.pageX - offset.left
      Amplitude.setSongPlayedPercentage(
        (parseFloat(x) / parseFloat(offsetWidth)) * 100
      )
    }
  })

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
              <div className="audio-player-button" onClick={backTenClick}>
                <span className="material-icons">replay_10</span>
              </div>
              <div
                className="audio-player-button amplitude-play-pause"
                id="play-pause"
                ref={playPauseButton}
              >
                <span className="material-icons" />
              </div>
              <div className="audio-player-button" onClick={forwardThirtyClick}>
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
              id="song-played-progress"
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

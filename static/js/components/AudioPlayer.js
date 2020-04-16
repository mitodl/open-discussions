// @flow
import React, { useEffect, useRef, useCallback } from "react"
import { useSelector } from "react-redux"
import { currentlyPlayingAudioSelector } from "../lib/redux_selectors"
import Amplitude from "amplitudejs"

export default function AudioPlayer() {
  const seekBar = useRef()
  const currentlyPlaying = useSelector(currentlyPlayingAudioSelector)

  useEffect(
    () => {
      if (!currentlyPlaying) {
        return
      }
      Amplitude.init({
        songs: [
          {
            album: currentlyPlaying.title,
            name:  currentlyPlaying.description,
            url:   currentlyPlaying.url
          }
        ],
        waveforms: {
          sample_rate: 3000
        }
      })
    },
    [currentlyPlaying]
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
    <div className="audio-player-container-outer">
      <div className="audio-player-container-inner">
        <div className="audio-player-titles">
          <div
            className="audio-player-podcast-name"
            data-amplitude-song-info="album"
          />
          <div
            className="audio-player-podcast-title"
            data-amplitude-song-info="name"
          />
        </div>
        <div className="audio-player-controls">
          <div className="audio-player-button" onClick={backTenClick}>
            <span className="material-icons">replay_10</span>
          </div>
          <div
            className="audio-player-button amplitude-play-pause"
            id="play-pause"
          >
            <span className="material-icons" />
          </div>
          <div className="audio-player-button" onClick={forwardThirtyClick}>
            <span className="material-icons">forward_30</span>
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
          <div className="audio-player-playback-speed-container">
            <button className="light-outlined amplitude-playback-speed" />
          </div>
        </div>
      </div>
    </div>
  )
}

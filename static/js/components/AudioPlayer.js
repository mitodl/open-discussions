// @flow
/* global SETTINGS: false */
import React, { useState, useEffect, useRef } from "react"
import Amplitude from "amplitudejs"

type Props = {
  title: string,
  description: string,
  url: string
}

export default function AudioPlayer(props: Props) {
  const seekBar = useRef()
  const [title, setTitle] = useState(props.title)
  const [description, setDescription] = useState(props.description)
  const [url, setUrl] = useState(props.url)

  useEffect(
    () => {
      if (!title || !description || !url) {
        return
      }
      Amplitude.init({
        songs: [
          {
            album: title,
            name:  description,
            url:   url
          }
        ],
        waveforms: {
          sample_rate: 3000
        }
      })
    },
    [title, description, url]
  )

  const backTenClick = () => {
    Amplitude.skipTo(Amplitude.getSongPlayedSeconds() - 10, 0, null)
  }

  const forwardThirtyClick = () => {
    Amplitude.skipTo(Amplitude.getSongPlayedSeconds() + 30, 0, null)
  }

  const seekBarClick = (e: Object) => {
    const seekBar = this.seekBar && this.seekBar.current
    if (seekBar && seekBar.getBoundingClientRect && seekBar.offsetWidth) {
      const offset = seekBar.getBoundingClientRect()
      const offsetWidth = seekBar.offsetWidth
      const x = e.pageX - offset.left
      Amplitude.setSongPlayedPercentage(
        (parseFloat(x) / parseFloat(offsetWidth)) * 100
      )
    }
  }

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
          <div
            className="audio-player-button"
            onClick={forwardThirtyClick}
          >
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
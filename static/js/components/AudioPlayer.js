// @flow
/* global SETTINGS: false */
import React from "react"
import Amplitude from "amplitudejs"

type Props = {
  title: string,
  description: string,
  url: string
}

export default class AudioPlayer extends React.Component<Props> {
  seekBar: {
    current: null | React$ElementRef<typeof HTMLElement>
  }

  constructor(props: Props) {
    super(props)
    this.seekBar = React.createRef()
    this.seekBarClick = this.seekBarClick.bind(this)
    this.backTenClick = this.backTenClick.bind(this)
    this.forwardThirtyClick = this.forwardThirtyClick.bind(this)
  }

  componentDidMount() {
    Amplitude.init({
      songs: [
        {
          album: this.props.title,
          name:  this.props.description,
          url:   this.props.url

        }
      ],
      waveforms: {
        sample_rate: 3000
      }
    })
  }

  componentWillUnmount() {}

  backTenClick = () => {
    Amplitude.skipTo(Amplitude.getSongPlayedSeconds() - 10, 0, null)
  }

  forwardThirtyClick = () => {
    Amplitude.skipTo(Amplitude.getSongPlayedSeconds() + 30, 0, null)
  }

  seekBarClick = (e: Object) => {
    if (this.seekBar.current) {
      const offset = this.seekBar.current.getBoundingClientRect()
      const x = e.pageX - offset.left

      Amplitude.setSongPlayedPercentage(
        (parseFloat(x) / parseFloat(this.seekBar.current.offsetWidth)) * 100
      )
    }
  }

  render() {
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
            <div className="audio-player-button" onClick={this.backTenClick}>
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
              onClick={this.forwardThirtyClick}
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
                ref={this.seekBar}
                onClick={this.seekBarClick}
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
}

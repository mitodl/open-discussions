// @flow
/* global SETTINGS: false */
import React from "react"
import Amplitude from "amplitudejs"

type Props = {
  player: Object,
}

export default class AudioPlayer extends React.Component<Props> {
  playerRoot: {
    current: null | React$ElementRef<typeof HTMLElement>
  }
  toolbar: Object

  constructor(props: Props) {
    super(props)
    this.playerRoot = React.createRef()
  }

  componentDidMount() {
    this.player = Amplitude.init({
    bindings: {
        37: "prev",
        39: "next",
        32: "play_pause"
    },
    songs: [
        {
        name:   "Social Impact at Scale, One Project at a Time with Dr. Anjali Sastry",
        artist: "MIT OpenCourseWare",
        album:  "Chalk Radio",
        url:
            "https://chtbl.com/track/F9DD6B/cdn.simplecast.com/audio/2c64ac/2c64ace6-baf4-4e86-b527-445e611e6a31/152665b8-894b-4a14-abf5-e817a5e3bf5a/social-impact-at-scale-one-project-at-a-time-with-dr-anjali-sastry_tc.mp3",
        cover_art_url:
            "https://cdn.simplecast.com/images/fad9997e-4c46-4e62-8a3f-4a4c561b53a6/a2b3587e-9be1-4ba2-b5a3-a213a436a1cc/640x640/chalk-radio-album-art-v2.jpg"
        },
    ],
    waveforms: {
        sample_rate: 3000
    }
    })
  }

  componentWillUnmount() {
  }

  toggleShowDrawer = (e: Event) => {
    e.preventDefault()
    toggleShowDrawer()
  }

  render() {
    const { toggleShowUserMenu, showUserMenu, profile } = this.props

    return (
    <div className="audio-player-container-outer">
        <div className="audio-player-container-inner">
            <div className="header-main">
                <div className="player-container player">
                    <div className="player-wrap">
                        <div className="inner-player simplecast-player"
                            style={{transform: "scale(1); width: 100%"}}>
                            <div className="main">
                                <div className="main-wrap dark size-mini">
                                    <div className="controls size-mini">
                                        <div className="player-controls"><button aria-label="Play" className="amplitude-play-pause play-pause dark size-mini">
                                            <svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg" className="">
                                                <path d="M22 44C9.85 44 0 34.15 0 22S9.85 0 22 0s22 9.85 22 22-9.85 22-22 22zm-5.333-31.333v18.666L31.333 22l-14.666-9.333z"> </path>
                                            </svg>
                                            </button>
                                            <div className="scrubber-timer">
                                                <div className="scrubber dark" style={{opacity: " 1"}}>
                                                    <div className="scrubber-waveform dark">
                                                        <div>
                                                            <div className="amplitude-wave-form"></div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="controls-share-subscribe">
                                                    <button className="controls-share dark size-mini">
                                                        <span className="menu-text">Share</span>
                                                    </button> 
                                                    <button className="controls-subscribe dark size-mini">
                                                        <svg width="14" height="6" xmlns="http://www.w3.org/2000/svg" className="">
                                                            <path d="M0 0h14v1.75H0V0zm0 3.5h8.75v1.75H0V3.5z"></path>
                                                        </svg>
                                                        <span className="menu-icon"></span>
                                                        <span className="menu-text">Subscribe</span>
                                                    </button>
                                                </div>
                                                <div className="left">
                                                    <button aria-label="Speed Rate 1x" className="controls-speed dark size-mini">
                                                        1x
                                                    </button>
                                                </div>
                                                <div className="middle">
                                                    <button aria-label="15 Seconds Backward" className="controls-rewind dark">
                                                        <svg width="19" height="20" xmlns="http://www.w3.org/2000/svg" className="">
                                                            <path
                                                                d="M5.067 4H14a5 5 0 015 5v3a5 5 0 01-5 5h-1.166v-2H14a3 3 0 003-3V9a3 3 0 00-3-3H5.067v4L0 5l5.067-5v4z">
                                                            </path>
                                                            <text fontFamily="HelveticaNeue-Bold, Helvetica Neue" fontSize="10" fontWeight="bold" letterSpacing=".125">
                                                                <tspan x="0" y="19">15</tspan>
                                                            </text>
                                                        </svg>
                                                    </button>
                                                    <button aria-label="Play" className="play-pause dark size-mini">
                                                        <svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg" className="">
                                                            <path d="M22 44C9.85 44 0 34.15 0 22S9.85 0 22 0s22 9.85 22 22-9.85 22-22 22zm-5.333-31.333v18.666L31.333 22l-14.666-9.333z"></path>
                                                        </svg>
                                                    </button>
                                                    <button aria-label="15 Seconds Forward" className="controls-forward dark">
                                                        <svg width="19" height="20" xmlns="http://www.w3.org/2000/svg" className="">
                                                            <text fontFamily="HelveticaNeue-Bold, Helvetica Neue" fontSize="10" fontWeight="bold" letterSpacing=".125">
                                                                <tspan x="7" y="19">15</tspan>
                                                            </text>
                                                            <path d="M13.933 4H5a5 5 0 00-5 5v3a5 5 0 005 5h1.166v-2H5a3 3 0 01-3-3V9a3 3 0 013-3h8.933v4L19 5l-5.067-5v4z"></path>
                                                        </svg>
                                                    </button>
                                                </div>
                                                <div className="right">
                                                    <button className="controls-share dark size-mini">
                                                        <span className="menu-text">Share</span>
                                                    </button>
                                                    <button className="controls-subscribe dark size-mini">
                                                        <svg width="14" height="6" xmlns="http://www.w3.org/2000/svg" className="">
                                                            <path d="M0 0h14v1.75H0V0zm0 3.5h8.75v1.75H0V3.5z"></path>
                                                        </svg>
                                                        <span className="menu-icon"></span>
                                                        <span className="menu-text">Subscribe</span>
                                                    </button>
                                                    <div aria-hidden="true" className="artwork">
                                                        <div className="ratio ratio-1-1 dark" style={{backgroundImage: "url('https://cdn.simplecast.com/images/fad9997e-4c46-4e62-8a3f-4a4c561b53a6/a2b3587e-9be1-4ba2-b5a3-a213a436a1cc/chalk-radio-album-art-v2.jpg')"}}></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="desktop-player-controls">
                    <div className="player-controls">
                        <button className="player-control speed-control">
                            1x
                        </button>
                        <button className="player-control rewind-control">
                            <svg width="19" height="20" xmlns="http://www.w3.org/2000/svg" className="">
                                <path d="M5.067 4H14a5 5 0 015 5v3a5 5 0 01-5 5h-1.166v-2H14a3 3 0 003-3V9a3 3 0 00-3-3H5.067v4L0 5l5.067-5v4z"></path>
                                <text fontFamily="HelveticaNeue-Bold, Helvetica Neue" fontSize="10" fontWeight="bold" letterSpacing=".125">
                                    <tspan x="0" y="19">15</tspan>
                                </text>
                            </svg>
                        </button>
                        <button className="player-control forward-control">
                            <svg width="19" height="20" xmlns="http://www.w3.org/2000/svg" className="">
                                <text fontFamily="HelveticaNeue-Bold, Helvetica Neue" fontSize="10" fontWeight="bold" letterSpacing=".125">
                                    <tspan x="7" y="19">15</tspan>
                                </text>
                                <path d="M13.933 4H5a5 5 0 00-5 5v3a5 5 0 005 5h1.166v-2H5a3 3 0 01-3-3V9a3 3 0 013-3h8.933v4L19 5l-5.067-5v4z">
                                </path>
                            </svg>
                        </button>
                    </div>
                </div>
                <div className="desktop-player-title">
                    <div className="player-titles">
                        <h3 className="title podcast-title" data-amplitude-song-info="album"></h3>
                        <h3 className="title episode-title" data-amplitude-song-info="name"></h3>
                    </div>
                </div>
                <div className="burger">
                    <a href="#" className="bun">
                        <span className="hamburger-title">Open Menu</span>
                        <span className="hamburger">
                            <span className="line top"></span>
                            <span className="line mid"></span>
                            <span className="line bottom"></span>
                        </span>
                    </a>
                </div>
                <div className="logo">
                    <svg viewBox="0 0 25 25" xmlns="http://www.w3.org/2000/svg" className="icon-logo sc-logo">
                        <path d="M24.845 24.845H0V0l12.422 12.423zM21.382 17.518L7.327 3.463l2.021-2.02 14.055 14.054zM21.382 9.612l-6.148-6.148 2.02-2.021 6.15 6.149z"></path>
                    </svg>
                </div>
                <svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" className="sc-logo">
                    <g fill="none" fillRule="evenodd">
                        <path d="M0 20h20V0H0v20zm1.333-1.334h17.334V1.333H1.333v17.333z" className="sc-logo-border"></path>
                        <path d="M4 4v12h12zM15.057 12.485L7.515 4.942 8.457 4 16 11.542zM15.057 8.714l-3.771-3.772.943-.942 3.77 3.77z"></path>
                    </g>
                </svg>
            </div>
        </div>
    </div>
    )
  }
}

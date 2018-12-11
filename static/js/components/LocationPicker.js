// @flow
/* global SETTINGS: false */
import React from "react"
import Places from "places.js"

type Props = {
  placeholder?: string,
  onChange: Function,
  onClear: Function,
  options: Object,
  initialLocation: ?string
}

export default class LocationPicker extends React.Component<Props> {
  autocomplete: Object
  autocompleteElem: ?Object

  static defaultProps = {
    placeholder:     "Location (city)",
    initialLocation: "",
    options:         {
      type:     "city",
      language: "en"
    }
  }

  componentDidMount() {
    const { initialLocation, onChange, onClear, options } = this.props
    this.autocomplete = Places({
      appId:     SETTINGS.algolia_appId,
      apiKey:    SETTINGS.algolia_apiKey,
      ...options,
      container: this.autocompleteElem
    })

    this.autocomplete.on("change", onChange)
    this.autocomplete.on("clear", onClear)

    this.autocomplete.setVal(initialLocation)
  }

  shouldComponentUpdate() {
    return false
  }

  componentWillUnmount() {
    this.autocomplete.removeAllListeners("change")
    this.autocomplete.removeAllListeners("clear")
  }

  render() {
    const { placeholder } = this.props

    return (
      <div>
        <input
          type="text"
          aria-label={placeholder}
          ref={ref => {
            this.autocompleteElem = ref
          }}
        />
      </div>
    )
  }
}

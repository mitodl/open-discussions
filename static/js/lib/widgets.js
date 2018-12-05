import _ from "lodash"

export function makeOptionsFromList(values) {
  /**
   * constructs an options object from a list of values
   */
  return _.range(values.length).map(index => ({
    key:   values[index],
    label: values[index],
    value: values[index]
  }))
}

export function makeOptionsFromObject(options) {
  /**
   * constructs an options object from an object of key, value mappings where the keys are the value and the value
   * is the key and label
   */
  const keys = Object.keys(options)
  return _.range(keys.length).map(index => ({
    key:   options[keys[index]],
    label: options[keys[index]],
    value: keys[index]
  }))
}

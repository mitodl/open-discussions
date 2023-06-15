import React, { useCallback, ChangeEvent } from "react"
import Select, {
  CSSObjectWithLabel,
  MultiValue,
  SingleValue
} from "react-select"
import AsyncSelect from "react-select/async"
import { isNil } from "lodash"

export interface Option {
  label: string
  value: string
}

interface Props {
  name: string
  value?: null | string | string[]
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void
  multiple?: boolean
  options: Array<string | Option>
  loadOptions?: (s: string, cb: (options: Option[]) => void) => void
  placeholder?: string
  defaultOptions?: Option[]
  isOptionDisabled?: (option: Option) => boolean
}

export default function SelectField(props: Props): JSX.Element {
  const {
    value,
    onChange,
    name,
    options,
    loadOptions,
    defaultOptions,
    placeholder,
    isOptionDisabled
  } = props
  const multiple = props.multiple ?? false
  const selectOptions = options.map(option =>
    typeof option === "string" ? { label: option, value: option } : option
  )

  const changeHandler = useCallback(
    (newValue: MultiValue<Option> | SingleValue<Option>) => {
      const eventValue =
        newValue instanceof Array ?
          newValue.map((option: Option) => option.value) :
          newValue?.value
      onChange({
        target: { value: eventValue, name }
      } as ChangeEvent<HTMLSelectElement>)
    },
    [name, onChange]
  )

  /**
   * Get or create a select-field Option with the specified value,
   * so it will appear as a selected value even if there is no available
   * select option for it.
   **/
  const getSelectOption = (value: string) => {
    const selectOption = selectOptions.filter(
      option => option.value === value
    )[0]
    return selectOption || { label: value, value: value }
  }

  let selected
  if (multiple) {
    if (!Array.isArray(value)) {
      selected = []
    } else {
      selected = value.map(option => getSelectOption(option))
    }
  } else {
    if (Array.isArray(value)) {
      throw new Error("Array values should specify multiple=true")
    }
    selected = isNil(value) ? null : getSelectOption(value)
  }

  const commonSelectOptions = {
    className:   "w-100 form-input",
    value:       selected,
    isMulti:     multiple,
    onChange:    changeHandler,
    options:     selectOptions,
    placeholder: placeholder || null,
    styles:      {
      control: (base: CSSObjectWithLabel) => ({
        ...base,
        border:    0,
        boxShadow: "none"
      })
    },
    isOptionDisabled
  }

  return loadOptions ? (
    <AsyncSelect
      {...commonSelectOptions}
      loadOptions={loadOptions}
      defaultOptions={defaultOptions}
    />
  ) : (
    <Select {...commonSelectOptions} />
  )
}

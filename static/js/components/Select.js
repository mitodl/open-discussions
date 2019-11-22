// @flow
// Adapted from https://codesandbox.io/s/6ll36y9qjw
import React from "react"
import ReactSelect, { OptionsType, ValueType } from "react-select"
import { FieldProps } from "formik"

import type { FormOption } from "../flow/formTypes"

interface SelectProps extends FieldProps {
  options: OptionsType<FormOption>,
  isMulti?: boolean,
  closeMenuOnSelect?: boolean,
  openMenuOnClick?: boolean,
  className?: string,
  placeholder?: string,
  menuPlacement?: string,
}

export const Select = ({
  className,
  placeholder,
  field,
  form,
  options,
  isMulti = false,
  closeMenuOnSelect = true,
  openMenuOnClick = true,
  menuPlacement = "auto"
}: SelectProps) => {
  const onChange = (option: ValueType<FormOption | FormOption[]>) => {
    form.setFieldValue(
      field.name,
      isMulti ? option.map((item: FormOption) => item.value) : option.value
    )
  }

  const getValue = () => {
    if (options) {
      return isMulti
        ? options.filter(option => field.value.indexOf(option.value) >= 0)
        : options.find(option => option.value === field.value)
    } else {
      return isMulti ? [] : null
    }
  }

  return (
    <ReactSelect
      className={className}
      name={field.name}
      value={getValue()}
      onChange={onChange}
      placeholder={placeholder}
      options={options}
      isMulti={isMulti}
      closeMenuOnSelect={closeMenuOnSelect}
      openMenuOnClick={openMenuOnClick}
      menuPlacement={menuPlacement}
    />
  )
}

export default Select

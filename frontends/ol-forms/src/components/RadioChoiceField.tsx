import React from "react"
import RadioGroup, { RadioGroupProps } from "@mui/material/RadioGroup"
import Radio from "@mui/material/Radio"
import FormControlLabel from "@mui/material/FormControlLabel"
import FormControl from "@mui/material/FormControl"
import FormLabel from "@mui/material/FormLabel"
import { useId } from "ol-util"

interface RadioChoiceProps {
  value: string
  label: React.ReactNode
  className?: string
}

interface RadioChoiceFieldProps {
  label: string
  value?: string
  defaultValue?: string
  name: string
  choices: RadioChoiceProps[]
  row?: boolean
  onChange?: RadioGroupProps["onChange"]
  className?: string
}

/**
 * Wrapper around MUI components to make a form field with:
 *  - radio group input
 *  - label
 *  - help text and error message, if any
 *
 * Avoid using MUI's Radio and RadioGroup directly. Prefer this component.
 */
const RadioChoiceField: React.FC<RadioChoiceFieldProps> = ({
  label,
  value,
  row,
  defaultValue,
  name,
  choices,
  onChange,
  className
}) => {
  const labelId = useId()
  return (
    <FormControl className={className}>
      <FormLabel id={labelId}>{label}</FormLabel>
      <RadioGroup
        aria-labelledby={labelId}
        name={name}
        defaultValue={defaultValue}
        row={row}
        value={value}
        onChange={onChange}
      >
        {choices.map(choice => {
          const { value, label, className } = choice
          return (
            <FormControlLabel
              key={value}
              value={value}
              control={<Radio />}
              label={label}
              className={className}
            />
          )
        })}
      </RadioGroup>
    </FormControl>
  )
}

export default RadioChoiceField

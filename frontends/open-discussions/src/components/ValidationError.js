import React from "react"

type Props = {
  message?: string,
  className?: string
}

const ValidationError = ({ message, className }: Props): JSX.Element | null => {
  if (!message) return null
  const allClasses = ["validation-error", className].filter(Boolean).join(" ")
  return (
    <div role="alert" className={allClasses}>
      {message}
    </div>
  )
}

export default ValidationError

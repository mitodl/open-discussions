import React, { useCallback, useEffect } from "react"
import { WidgetEditingFieldProps } from "./interfaces"
import { CkeditorMarkdownLazy } from "ol-ckeditor"

const WIDGET_CKEDITOR_BODY_CLASS = "ol-widget-ckeditor"

const MarkdownField: React.FC<WidgetEditingFieldProps> = ({
  value,
  onChange,
  onBlur,
  name,
  id,
  className
}) => {
  const handleChange = useCallback(
    (eventValue: string) => {
      const event = { target: { name, value: eventValue } }
      onChange(event)
    },
    [onChange, name]
  )
  const handleBlur = useCallback(() => {
    const event = { target: { name } }
    onBlur(event)
  }, [onBlur, name])

  useEffect(() => {
    /**
     * CKEditor renders tooltips outside of the widget modal. We apply a class
     * to document body to resolve z-index issues between the MUI modal
     * and CKEditor tooltips.
     * See also https://ckeditor.com/docs/ckeditor5/latest/installation/getting-started/frameworks/css.html#bootstrap-modals
     */
    document.body.classList.add(WIDGET_CKEDITOR_BODY_CLASS)
    return () => document.body.classList.remove(WIDGET_CKEDITOR_BODY_CLASS)
  }, [])

  return (
    <CkeditorMarkdownLazy
      id={id}
      className={className}
      value={value}
      onChange={handleChange}
      onBlur={handleBlur}
    />
  )
}

export default MarkdownField

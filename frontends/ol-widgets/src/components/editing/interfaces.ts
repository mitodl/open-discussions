type FormikHandler<T = unknown> = (e: { target: { name: string } & T }) => void

interface WidgetEditingFieldProps {
  className?: string
  id: string
  onChange: FormikHandler<{ value: unknown }>
  onBlur: FormikHandler
  value: string
  name: string
}

type WidgetFieldComponent = React.FC<WidgetEditingFieldProps>

export { WidgetEditingFieldProps, WidgetFieldComponent }

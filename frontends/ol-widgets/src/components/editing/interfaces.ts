type FormikHandler<T = unknown> = (e: { target: { name: string } & T }) => void

type WidgetEditingFieldProps<E = unknown> = {
  className?: string
  id: string
  onChange: FormikHandler<{ value: unknown }>
  onBlur: FormikHandler
  value: string
  name: string
} & Partial<E>

type WidgetFieldComponent = React.FC<WidgetEditingFieldProps>

export { WidgetEditingFieldProps, WidgetFieldComponent }

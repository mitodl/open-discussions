export type WidgetInstance<T = unknown> = {
  id: number
  widget_type: string
  title: string
  configuration: T
}

export type WidgetProps<T extends WidgetInstance> = {
  className?: string
  widget: T
}

/**
 * Represents an input field for configuring a widget's behavior.
 */
export type WidgetFieldSpec = {
  field_name: string
  label: string
  /**
   * Used as the `type` for the `<input>` field.
   */
  input_type: string
  props: Record<string, unknown>
  default: unknown
  /**
   * Optional text displayed below the input field.
   */
  under_text?: string | null
}

export type WidgetSpec = {
  widget_type: string
  description: string
  form_spec: WidgetFieldSpec[]
}

export type WidgetListResponse = {
  id: number
  widgets: WidgetInstance[]
  available_widgets: WidgetSpec[]
}

interface RichTextWidgetConfig {
  source: string
}
export type RichTextWidgetInstance = WidgetInstance<RichTextWidgetConfig>

export enum WidgetTypes {
  RichText = "Markdown"
}

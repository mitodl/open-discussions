/**
 * Many widget-oriented components accept either a "full" widget instance that
 * has been saved to the database and therefore has an id, or a nascent widget
 * instance that has no id. Both the "full" and "nascent" versions implement
 * AnonymousWidget interface.
 */
export type AnonymousWidget<T = unknown> = {
  widget_type: string
  title: string
  configuration: T
  id?: number | null
}

export type WidgetInstance<T = unknown> = {
  id: number
} & AnonymousWidget<T>

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

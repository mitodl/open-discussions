// @flow
import React from "react"
import { EditorState } from "prosemirror-state"
import { EditorView } from "prosemirror-view"
import { exampleSetup } from "prosemirror-example-setup"

import { bigPostSchema } from "./schema"

type Props = {
  onChange: Function
}
type State = {
  editorState: Object
}

export default class BigPostEditor extends React.Component<Props, State> {
  node: { current: null | React$ElementRef<typeof HTMLDivElement> }
  view: Object
  dispatchTransaction: Function = this.dispatchTransaction.bind(this)

  constructor(props: Props) {
    super(props)

    this.node = React.createRef()

    const editorStateOptions = {
      schema: bigPostSchema,
      plugins: exampleSetup({
        schema: bigPostSchema,
        menuBar: false
      })
    }

    this.state = {
      editorState: EditorState.create(editorStateOptions)
    }
  }

  componentDidMount() {
    const { editorState } = this.state

    if (this.node.current) {
      this.view = new EditorView(this.node.current, {
        state:               editorState,
        dispatchTransaction: this.dispatchTransaction
      })
    }
  }

  dispatchTransaction(transaction: Object) {
    // we need our own handler for this so we can hook into
    // the EditorState lifecycle to synchronize it with the
    // redux store (via the onChange prop)
    const { onChange } = this.props

    const state = this.view.state.apply(transaction)
    this.view.updateState(state)
    this.setState({ editorState: state })

    onChange(
      this.view.state.toJSON()
    )
  }

  focusEditor = () => {
    this.view.focus()
  }

  render () {
    return (
      <div className="editor-wrapper">
        <div
          className="editor big-post-editor"
          id="editor"
          onClick={this.focusEditor}
          ref={this.node}
        />
      </div>
    )
  }
}

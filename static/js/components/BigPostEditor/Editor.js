// @flow
import React from 'react';

type Props = {
}

export class BigPostEditor extends React.Component<Props> {
  node: { current: null | React$ElementRef<typeof HTMLDivElement> }

  constructor (props: Props) {
super(props)

    this.viewNode = React.createRef()

  }
}

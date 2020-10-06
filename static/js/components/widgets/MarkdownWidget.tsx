
import React from "react";

import { Markdown } from "../Markdown";
import { WidgetComponentProps } from "../../flow/widgetTypes";

const MarkdownWidget = ({
  widgetInstance: {
    configuration: {
      source
    }
  }
}: WidgetComponentProps) => <Markdown source={source} />;

export default MarkdownWidget;
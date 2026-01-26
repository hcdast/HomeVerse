/// <reference types="vite/client" />

declare module 'react-quill' {
  import * as React from 'react';

  interface ReactQuillProps {
    theme?: string;
    value?: string;
    defaultValue?: string;
    placeholder?: string;
    readOnly?: boolean;
    modules?: Record<string, unknown>;
    formats?: string[];
    onChange?: (content: string, delta: unknown, source: string, editor: unknown) => void;
    onChangeSelection?: (range: unknown, source: string, editor: unknown) => void;
    onFocus?: (range: unknown, source: string, editor: unknown) => void;
    onBlur?: (previousRange: unknown, source: string, editor: unknown) => void;
    className?: string;
    style?: React.CSSProperties;
    tabIndex?: number;
    bounds?: string | HTMLElement;
    scrollingContainer?: string | HTMLElement;
    preserveWhitespace?: boolean;
  }

  class ReactQuill extends React.Component<ReactQuillProps> {
    focus(): void;
    blur(): void;
    getEditor(): unknown;
  }

  export default ReactQuill;
}

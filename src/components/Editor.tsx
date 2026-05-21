import { cpp } from '@codemirror/lang-cpp';
import { Diagnostic, lintGutter, setDiagnostics } from '@codemirror/lint';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { bracketMatching, indentOnInput } from '@codemirror/language';
import { useEffect, useRef } from 'react';

export interface EditorDiag {
  line: number;
  col: number;
  message: string;
}

export function Editor({
  value,
  onChange,
  diag,
}: {
  value: string;
  onChange: (v: string) => void;
  diag: EditorDiag | null;
}) {
  const parentRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    if (!parentRef.current || viewRef.current) return;
    const view = new EditorView({
      parent: parentRef.current,
      state: EditorState.create({
        doc: valueRef.current,
        extensions: [
          lineNumbers(),
          highlightActiveLine(),
          bracketMatching(),
          indentOnInput(),
          history(),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          cpp(),
          lintGutter(),
          EditorView.lineWrapping,
          EditorView.updateListener.of((v) => {
            if (v.docChanged) onChange(v.state.doc.toString());
          }),
          EditorView.theme(
            {
              '&': {
                height: '100%',
                fontSize: '13px',
                backgroundColor: '#0d1117',
                color: '#e6edf3',
              },
              '.cm-scroller': {
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
              },
              '.cm-gutters': {
                backgroundColor: '#0d1117',
                color: '#6b7280',
                border: 'none',
              },
              '.cm-activeLineGutter': { backgroundColor: '#161b22' },
              '.cm-activeLine': { backgroundColor: '#161b22' },
              '.cm-selectionBackground, ::selection': { backgroundColor: '#264f78' },
            },
            { dark: true },
          ),
        ],
      }),
    });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [onChange]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const cur = view.state.doc.toString();
    if (cur !== value) {
      view.dispatch({
        changes: { from: 0, to: cur.length, insert: value },
      });
    }
  }, [value]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const diags: Diagnostic[] = [];
    if (diag) {
      const lineCount = view.state.doc.lines;
      const lineNo = Math.min(Math.max(1, diag.line || 1), lineCount);
      const lineInfo = view.state.doc.line(lineNo);
      const from = lineInfo.from + Math.max(0, Math.min(lineInfo.length, (diag.col || 1) - 1));
      const to = lineInfo.to;
      diags.push({
        from,
        to,
        severity: 'error',
        message: diag.message,
      });
    }
    view.dispatch(setDiagnostics(view.state, diags));
  }, [diag]);

  return <div ref={parentRef} className="cm-root" />;
}

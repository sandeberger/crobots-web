import { cpp } from '@codemirror/lang-cpp';
import { HighlightStyle, bracketMatching, indentOnInput, syntaxHighlighting } from '@codemirror/language';
import { Diagnostic, lintGutter, setDiagnostics } from '@codemirror/lint';
import { EditorState } from '@codemirror/state';
import { EditorView, highlightActiveLine, keymap, lineNumbers } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { tags as t } from '@lezer/highlight';
import { useEffect, useRef } from 'react';

export interface EditorDiag {
  line: number;
  col: number;
  message: string;
}

const cyberpunkHighlight = HighlightStyle.define([
  { tag: t.keyword, color: '#00f0ff', fontWeight: '600' },
  { tag: t.controlKeyword, color: '#ff2bd6', fontWeight: '600' },
  { tag: t.definitionKeyword, color: '#00f0ff', fontWeight: '600' },
  { tag: t.modifier, color: '#7cdbff' },
  { tag: t.typeName, color: '#00f0ff' },
  { tag: t.number, color: '#ffc857' },
  { tag: t.bool, color: '#ffc857', fontWeight: '600' },
  { tag: t.string, color: '#7cff6b' },
  { tag: t.character, color: '#7cff6b' },
  { tag: t.escape, color: '#ffc857' },
  { tag: t.comment, color: '#5a6a8a', fontStyle: 'italic' },
  { tag: t.lineComment, color: '#5a6a8a', fontStyle: 'italic' },
  { tag: t.blockComment, color: '#5a6a8a', fontStyle: 'italic' },
  { tag: t.operator, color: '#ff2bd6' },
  { tag: t.compareOperator, color: '#ff2bd6' },
  { tag: t.logicOperator, color: '#ff2bd6', fontWeight: '600' },
  { tag: t.arithmeticOperator, color: '#ff8fdc' },
  { tag: t.bitwiseOperator, color: '#ff8fdc' },
  { tag: t.updateOperator, color: '#ff2bd6' },
  { tag: t.definitionOperator, color: '#ff2bd6' },
  { tag: t.punctuation, color: '#8b95b5' },
  { tag: t.bracket, color: '#6a7ba2' },
  { tag: t.paren, color: '#6a7ba2' },
  { tag: t.brace, color: '#6a7ba2' },
  { tag: t.squareBracket, color: '#6a7ba2' },
  { tag: t.separator, color: '#6a7ba2' },
  { tag: t.function(t.variableName), color: '#e6f1ff', fontWeight: '500' },
  { tag: t.function(t.definition(t.variableName)), color: '#ffe27a', fontWeight: '700' },
  { tag: t.definition(t.variableName), color: '#e6f1ff' },
  { tag: t.variableName, color: '#b4c5e4' },
  { tag: t.propertyName, color: '#b4c5e4' },
  { tag: t.invalid, color: '#ff3860', textDecoration: 'underline wavy' },
  { tag: t.meta, color: '#7cdbff' },
  { tag: t.processingInstruction, color: '#7cdbff' },
]);

const editorTheme = EditorView.theme(
  {
    '&': {
      height: '100%',
      fontSize: '13px',
      backgroundColor: 'transparent',
      color: '#e6f1ff',
    },
    '.cm-scroller': {
      fontFamily: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
      lineHeight: '1.55',
    },
    '.cm-content': {
      caretColor: '#00f0ff',
    },
    '.cm-cursor, .cm-dropCursor': {
      borderLeftColor: '#00f0ff',
      borderLeftWidth: '2px',
    },
    '.cm-gutters': {
      backgroundColor: 'rgba(11, 17, 32, 0.5)',
      color: '#4a5878',
      border: 'none',
      borderRight: '1px solid #1f2a44',
    },
    '.cm-lineNumbers .cm-gutterElement': {
      padding: '0 10px 0 6px',
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'rgba(0, 240, 255, 0.06)',
      color: '#00f0ff',
    },
    '.cm-activeLine': {
      backgroundColor: 'rgba(0, 240, 255, 0.04)',
    },
    '.cm-selectionBackground, .cm-content ::selection, &.cm-focused .cm-selectionBackground': {
      backgroundColor: 'rgba(0, 240, 255, 0.22)',
    },
    '.cm-matchingBracket, .cm-nonmatchingBracket': {
      backgroundColor: 'rgba(0, 240, 255, 0.18)',
      color: '#00f0ff',
      outline: '1px solid rgba(0, 240, 255, 0.4)',
    },
    '.cm-tooltip': {
      background: 'rgba(11, 17, 32, 0.96)',
      border: '1px solid #00f0ff',
      color: '#e6f1ff',
      boxShadow: '0 0 12px rgba(0, 240, 255, 0.2)',
    },
    '.cm-tooltip.cm-tooltip-lint': {
      borderColor: '#ff3860',
      boxShadow: '0 0 12px rgba(255, 56, 96, 0.3)',
    },
    '.cm-diagnostic.cm-diagnostic-error': {
      borderLeft: '3px solid #ff3860',
    },
    '.cm-lintRange-error': {
      backgroundImage:
        'linear-gradient(90deg, rgba(0,0,0,0) 50%, #ff3860 50%, #ff3860 100%)',
      backgroundSize: '6px 2px',
      backgroundRepeat: 'repeat-x',
      backgroundPosition: 'left bottom',
    },
  },
  { dark: true },
);

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
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!parentRef.current || viewRef.current) return;
    const view = new EditorView({
      parent: parentRef.current,
      state: EditorState.create({
        doc: value,
        extensions: [
          lineNumbers(),
          highlightActiveLine(),
          bracketMatching(),
          indentOnInput(),
          history(),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          cpp(),
          syntaxHighlighting(cyberpunkHighlight),
          lintGutter(),
          EditorView.lineWrapping,
          EditorView.updateListener.of((v) => {
            if (v.docChanged) onChangeRef.current(v.state.doc.toString());
          }),
          editorTheme,
        ],
      }),
    });
    viewRef.current = view;

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && parentRef.current) {
      resizeObserver = new ResizeObserver(() => {
        viewRef.current?.requestMeasure();
      });
      resizeObserver.observe(parentRef.current);
    }

    return () => {
      resizeObserver?.disconnect();
      view.destroy();
      viewRef.current = null;
    };
  }, []);

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

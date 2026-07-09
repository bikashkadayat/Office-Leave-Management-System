import React, { Suspense, lazy } from 'react';
import DOMPurify from 'dompurify';

// The editable TipTap surface is code-split so ProseMirror/TipTap only loads
// when a memo is actually edited, not on every read-only render (L2).
const TiptapEditor = lazy(() => import('./TiptapEditor'));

// Read-path sanitization (defense in depth; the backend also sanitizes on
// write). Allowlist mirrors what the editor toolbar can produce.
const PURIFY_CONFIG = {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h2', 'h3', 'ul', 'ol', 'li', 'a', 'blockquote'],
  ALLOWED_ATTR: ['href', 'title', 'target', 'rel'],
};
const sanitize = (html) => DOMPurify.sanitize(html || '', PURIFY_CONFIG);

const FallbackTextarea = ({ value, onChange, placeholder, minHeight }) => (
  <textarea
    className="lr-field" style={{ minHeight, width: '100%' }}
    defaultValue={value} placeholder={placeholder}
    onChange={(e) => onChange?.(e.target.value)}
    aria-label="Memo body"
  />
);

/**
 * Rich-text memo body. readOnly renders sanitized stored HTML (no editor
 * dependency); editable lazy-loads the TipTap surface with a textarea fallback.
 *
 * @param {{value?:string, onChange?:(html:string)=>void, placeholder?:string,
 *          readOnly?:boolean, minHeight?:number}} props
 */
const RichTextEditor = ({ value = '', onChange, placeholder = 'Write the memo body…', readOnly = false, minHeight = 180 }) => {
  if (readOnly) {
    return <div className="lr-richtext-view" dangerouslySetInnerHTML={{ __html: sanitize(value) || '<p><em>No content.</em></p>' }} />;
  }

  return (
    <Suspense fallback={<FallbackTextarea value={value} onChange={onChange} placeholder={placeholder} minHeight={minHeight} />}>
      <TiptapEditor value={value} onChange={onChange} placeholder={placeholder} minHeight={minHeight} />
    </Suspense>
  );
};

export default RichTextEditor;

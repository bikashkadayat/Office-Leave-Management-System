import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { Bold, Italic, Heading2, Heading3, List, ListOrdered, Link as LinkIcon } from 'lucide-react';

/**
 * The editable TipTap surface. Split into its own module so it (and the ~heavy
 * TipTap/ProseMirror dependency) is lazy-loaded only when someone actually
 * edits a memo body (L2). The read-only view lives in RichTextEditor and pulls
 * none of this.
 */
const TiptapEditor = ({ value = '', onChange, placeholder = 'Write the memo body…', minHeight = 180 }) => {
  const editor = useEditor({
    extensions: [StarterKit, Link.configure({ openOnClick: false, autolink: true })],
    content: value || '',
    immediatelyRender: false,
    onUpdate: ({ editor: ed }) => onChange?.(ed.getHTML()),
  });

  // Sync external value changes (e.g. loading a template) without cursor jumps.
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || '', false);
    }
  }, [value, editor]);

  if (!editor) {
    return (
      <textarea
        className="lr-field" style={{ minHeight, width: '100%' }}
        defaultValue={value} placeholder={placeholder}
        onChange={(e) => onChange?.(e.target.value)}
        aria-label="Memo body"
      />
    );
  }

  const btn = (active, onClick, title, children) => (
    <button type="button" title={title} aria-label={title} aria-pressed={active}
      className={`lr-rt-btn ${active ? 'on' : ''}`} onClick={onClick}>{children}</button>
  );
  const setLink = () => {
    const url = window.prompt('Link URL:');
    if (url === null) return;
    if (url === '') editor.chain().focus().unsetLink().run();
    else editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <div className="lr-richtext">
      <div className="lr-rt-toolbar" role="toolbar" aria-label="Formatting">
        {btn(editor.isActive('bold'), () => editor.chain().focus().toggleBold().run(), 'Bold', <Bold size={15} />)}
        {btn(editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run(), 'Italic', <Italic size={15} />)}
        {btn(editor.isActive('heading', { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run(), 'Heading 2', <Heading2 size={15} />)}
        {btn(editor.isActive('heading', { level: 3 }), () => editor.chain().focus().toggleHeading({ level: 3 }).run(), 'Heading 3', <Heading3 size={15} />)}
        {btn(editor.isActive('bulletList'), () => editor.chain().focus().toggleBulletList().run(), 'Bullet list', <List size={15} />)}
        {btn(editor.isActive('orderedList'), () => editor.chain().focus().toggleOrderedList().run(), 'Numbered list', <ListOrdered size={15} />)}
        {btn(editor.isActive('blockquote'), () => editor.chain().focus().toggleBlockquote().run(), 'Quote', '❝')}
        {btn(editor.isActive('link'), setLink, 'Link', <LinkIcon size={15} />)}
      </div>
      <EditorContent editor={editor} className="lr-rt-content" style={{ minHeight }} />
    </div>
  );
};

export default TiptapEditor;

import React, { useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import { FontFamily } from '@tiptap/extension-font-family';
import { TextStyle } from '@tiptap/extension-text-style';
import Link from '@tiptap/extension-link';
import Highlight from '@tiptap/extension-highlight';
import { Extension } from '@tiptap/core';
import { TextSelection } from '@tiptap/pm/state';
import { 
  Bold, Italic, Underline as UnderlineIcon, Heading1, Heading2, Heading3, 
  List, ListOrdered, Quote, Image as ImageIcon, AlignLeft, AlignCenter, 
  AlignRight, AlignJustify, Undo, Redo, Type, Link as LinkIcon, Highlighter, RemoveFormatting,
  Sparkles, LayoutGrid
} from 'lucide-react';
import { EditorialGridNode } from './EditorialGridNode';
import { EditorialGridModal } from './EditorialGridModal';
import { EditorialGridData } from '../utils/editorialGrid';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
}

export interface FormatInfo {
  tag: 'H1' | 'H2' | 'H3' | 'P' | 'Quote' | 'Other';
  label: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  dotColor: string;
  activeBtnClass: string;
}

/**
 * Returns color-coded metadata for the currently highlighted / selected text block
 */
export function getCurrentFormatInfo(editor: any): FormatInfo {
  if (!editor) {
    return {
      tag: 'P',
      label: 'Paragraph (P)',
      badgeBg: 'bg-slate-100',
      badgeText: 'text-slate-800',
      badgeBorder: 'border-slate-300',
      dotColor: 'bg-slate-600',
      activeBtnClass: 'bg-slate-900 text-white font-bold shadow-sm ring-2 ring-slate-400',
    };
  }

  // 1. Check active heading levels
  if (editor.isActive('heading', { level: 1 })) {
    return {
      tag: 'H1',
      label: 'H1 Heading',
      badgeBg: 'bg-purple-100',
      badgeText: 'text-purple-800',
      badgeBorder: 'border-purple-300',
      dotColor: 'bg-purple-600',
      activeBtnClass: 'bg-purple-600 text-white font-bold shadow-sm ring-2 ring-purple-400',
    };
  }

  if (editor.isActive('heading', { level: 2 })) {
    return {
      tag: 'H2',
      label: 'H2 Subheading',
      badgeBg: 'bg-indigo-100',
      badgeText: 'text-indigo-800',
      badgeBorder: 'border-indigo-300',
      dotColor: 'bg-indigo-600',
      activeBtnClass: 'bg-indigo-600 text-white font-bold shadow-sm ring-2 ring-indigo-400',
    };
  }

  if (editor.isActive('heading', { level: 3 })) {
    return {
      tag: 'H3',
      label: 'H3 Section',
      badgeBg: 'bg-emerald-100',
      badgeText: 'text-emerald-800',
      badgeBorder: 'border-emerald-300',
      dotColor: 'bg-emerald-600',
      activeBtnClass: 'bg-emerald-600 text-white font-bold shadow-sm ring-2 ring-emerald-400',
    };
  }

  if (editor.isActive('blockquote')) {
    return {
      tag: 'Quote',
      label: 'Quote',
      badgeBg: 'bg-amber-100',
      badgeText: 'text-amber-800',
      badgeBorder: 'border-amber-300',
      dotColor: 'bg-amber-600',
      activeBtnClass: 'bg-amber-600 text-white font-bold shadow-sm ring-2 ring-amber-400',
    };
  }

  // Direct check of parent node for selection
  try {
    const { selection } = editor.state;
    if (selection && selection.$from) {
      const parent = selection.$from.parent;
      if (parent && parent.type.name === 'heading') {
        const level = parent.attrs.level;
        if (level === 1) {
          return {
            tag: 'H1',
            label: 'H1 Heading',
            badgeBg: 'bg-purple-100',
            badgeText: 'text-purple-800',
            badgeBorder: 'border-purple-300',
            dotColor: 'bg-purple-600',
            activeBtnClass: 'bg-purple-600 text-white font-bold shadow-sm ring-2 ring-purple-400',
          };
        }
        if (level === 2) {
          return {
            tag: 'H2',
            label: 'H2 Subheading',
            badgeBg: 'bg-indigo-100',
            badgeText: 'text-indigo-800',
            badgeBorder: 'border-indigo-300',
            dotColor: 'bg-indigo-600',
            activeBtnClass: 'bg-indigo-600 text-white font-bold shadow-sm ring-2 ring-indigo-400',
          };
        }
        if (level === 3) {
          return {
            tag: 'H3',
            label: 'H3 Section',
            badgeBg: 'bg-emerald-100',
            badgeText: 'text-emerald-800',
            badgeBorder: 'border-emerald-300',
            dotColor: 'bg-emerald-600',
            activeBtnClass: 'bg-emerald-600 text-white font-bold shadow-sm ring-2 ring-emerald-400',
          };
        }
      }
    }
  } catch (e) {
    // fallback
  }

  return {
    tag: 'P',
    label: 'Paragraph (P)',
    badgeBg: 'bg-slate-100',
    badgeText: 'text-slate-800',
    badgeBorder: 'border-slate-300',
    dotColor: 'bg-slate-600',
    activeBtnClass: 'bg-slate-900 text-white font-bold shadow-sm ring-2 ring-slate-400',
  };
}

/**
 * Tiptap Extension to handle Enter key inside headings:
 * 1. If at end of heading, pressing Enter creates a regular paragraph (<p>) below,
 *    preventing subsequent body text from inadvertently remaining in H3.
 * 2. If heading is empty, pressing Enter converts it to a regular paragraph.
 * 3. If at start of heading, pressing Enter creates an empty paragraph above.
 */
export const HeadingEnterExit = Extension.create({
  name: 'headingEnterExit',
  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => {
        const { state } = editor;
        const { selection } = state;
        const { $from, empty } = selection;

        if (!empty) return false;

        if ($from.parent.type.name === 'heading') {
          const parent = $from.parent;
          const parentOffset = $from.parentOffset;
          const contentSize = parent.content.size;

          // 1. If heading is empty, convert it to a regular paragraph
          if (contentSize === 0) {
            return editor.commands.setParagraph();
          }

          // 2. If cursor is at the end of the heading, insert a paragraph below
          if (parentOffset === contentSize) {
            const endOfHeadingPos = $from.after();
            return editor
              .chain()
              .insertContentAt(endOfHeadingPos, {
                type: 'paragraph',
                content: [],
              })
              .focus(endOfHeadingPos + 1)
              .run();
          }

          // 3. If cursor is at the very beginning of the heading, insert paragraph above
          if (parentOffset === 0) {
            const startOfHeadingPos = $from.before();
            const originalPos = $from.pos;
            return editor
              .chain()
              .insertContentAt(startOfHeadingPos, {
                type: 'paragraph',
                content: [],
              })
              .focus(originalPos + 2)
              .run();
          }
        }

        return false;
      },
    };
  },
});

function cleanTrailingHardBreak(fragment: any) {
  if (!fragment || fragment.childCount === 0) return fragment;
  const lastChild = fragment.lastChild;
  if (lastChild && lastChild.type.name === 'hardBreak') {
    return fragment.cut(0, fragment.size - lastChild.nodeSize);
  }
  return fragment;
}

function cleanLeadingHardBreak(fragment: any) {
  if (!fragment || fragment.childCount === 0) return fragment;
  const firstChild = fragment.firstChild;
  if (firstChild && firstChild.type.name === 'hardBreak') {
    return fragment.cut(firstChild.nodeSize, fragment.size);
  }
  return fragment;
}

/**
 * Smart heading toggling:
 * When specific text is selected inside a paragraph or block, splits the block so that
 * ONLY the selected text becomes the heading, and surrounding text remains unaffected.
 * Also handles lines separated by <br> within a block.
 */
export function handleSmartHeadingToggle(editor: any, level: 1 | 2 | 3) {
  if (!editor) return;

  const { state, view } = editor;
  const { selection, schema } = state;
  const { $from, $to, from, to, empty } = selection;
  const headingType = schema.nodes.heading;
  const paragraphType = schema.nodes.paragraph;

  if (!headingType || !paragraphType) {
    editor.chain().focus().toggleHeading({ level }).run();
    return;
  }

  // Case 1: Specific text is selected inside a single block
  if (!empty && $from.sameParent($to)) {
    const parent = $from.parent;
    const parentStart = $from.start();
    const parentEnd = $from.end();
    const isEntireBlock = from === parentStart && to === parentEnd;

    if (isEntireBlock) {
      editor.chain().focus().toggleHeading({ level }).run();
      return;
    }

    // Check if parent is already this heading level
    const isCurrentlyThisHeading = parent.type === headingType && parent.attrs.level === level;
    const targetType = isCurrentlyThisHeading ? paragraphType : headingType;
    const targetAttrs = isCurrentlyThisHeading ? {} : { level };

    const offsetFrom = from - parentStart;
    const offsetTo = to - parentStart;

    const beforeRaw = parent.content.cut(0, offsetFrom);
    const selectedRaw = parent.content.cut(offsetFrom, offsetTo);
    const afterRaw = parent.content.cut(offsetTo, parent.content.size);

    const beforeFragment = cleanTrailingHardBreak(beforeRaw);
    const selectedFragment = cleanTrailingHardBreak(cleanLeadingHardBreak(selectedRaw));
    const afterFragment = cleanLeadingHardBreak(afterRaw);

    const nodesToInsert: any[] = [];

    // Preceding content stays in parent's original type (e.g. <p>)
    if (beforeFragment.size > 0 && beforeFragment.textBetween(0, beforeFragment.size, ' ').trim().length > 0) {
      nodesToInsert.push(parent.type.create(parent.attrs, beforeFragment));
    }

    // Selected text becomes target type (e.g. <h3>)
    if (selectedFragment.size > 0) {
      nodesToInsert.push(targetType.create(targetAttrs, selectedFragment));
    }

    // Succeeding content stays in parent's original type (e.g. <p>)
    if (afterFragment.size > 0 && afterFragment.textBetween(0, afterFragment.size, ' ').trim().length > 0) {
      nodesToInsert.push(parent.type.create(parent.attrs, afterFragment));
    }

    if (nodesToInsert.length === 0) {
      editor.chain().focus().toggleHeading({ level }).run();
      return;
    }

    const tr = state.tr;
    const parentPos = $from.before();
    const parentEndPos = $from.after();

    tr.replaceWith(parentPos, parentEndPos, nodesToInsert);

    // Reposition selection cleanly over the newly created target block
    let currentPos = parentPos;
    let targetStart = -1;
    let targetEnd = -1;

    for (const node of nodesToInsert) {
      if (node.type === targetType && (targetType !== headingType || node.attrs.level === targetAttrs.level)) {
        targetStart = currentPos + 1;
        targetEnd = currentPos + 1 + node.content.size;
        break;
      }
      currentPos += node.nodeSize;
    }

    if (targetStart !== -1 && targetEnd >= targetStart) {
      try {
        const $start = tr.doc.resolve(targetStart);
        const $end = tr.doc.resolve(targetEnd);
        tr.setSelection(new TextSelection($start, $end));
      } catch (err) {
        // Fallback
      }
    }

    view.dispatch(tr);
    editor.commands.focus();
    return;
  }

  // Case 2: Selection is collapsed (empty === true) inside a block with <br>
  if (empty) {
    const parent = $from.parent;
    let hasHardBreak = false;
    parent.forEach((child: any) => {
      if (child.type.name === 'hardBreak') hasHardBreak = true;
    });

    if (hasHardBreak) {
      const cursorOffset = $from.parentOffset;
      const lines: any[] = [];
      let currentLineChildren: any[] = [];
      let currentLineStartOffset = 0;
      let activeLineIndex = 0;
      let curOffset = 0;

      parent.forEach((child: any) => {
        if (child.type.name === 'hardBreak') {
          lines.push({
            children: currentLineChildren,
            startOffset: currentLineStartOffset,
            endOffset: curOffset
          });
          currentLineChildren = [];
          curOffset += child.nodeSize;
          currentLineStartOffset = curOffset;
        } else {
          currentLineChildren.push(child);
          curOffset += child.nodeSize;
        }
      });

      lines.push({
        children: currentLineChildren,
        startOffset: currentLineStartOffset,
        endOffset: curOffset
      });

      lines.forEach((line, idx) => {
        if (cursorOffset >= line.startOffset && cursorOffset <= line.endOffset) {
          activeLineIndex = idx;
        }
      });

      const isCurrentlyThisHeading = parent.type === headingType && parent.attrs.level === level;
      const targetType = isCurrentlyThisHeading ? paragraphType : headingType;
      const targetAttrs = isCurrentlyThisHeading ? {} : { level };

      const nodesToInsert: any[] = [];
      lines.forEach((line, idx) => {
        if (line.children.length === 0) return;
        if (idx === activeLineIndex) {
          nodesToInsert.push(targetType.create(targetAttrs, line.children));
        } else {
          nodesToInsert.push(parent.type.create(parent.attrs, line.children));
        }
      });

      if (nodesToInsert.length > 0) {
        const tr = state.tr;
        const parentPos = $from.before();
        const parentEndPos = $from.after();
        tr.replaceWith(parentPos, parentEndPos, nodesToInsert);
        view.dispatch(tr);
        editor.commands.focus();
        return;
      }
    }
  }

  // Fallback to standard toggle
  editor.chain().focus().toggleHeading({ level }).run();
}

/**
 * Smart paragraph formatting:
 * When specific text inside a heading is selected and formatted as paragraph,
 * only that specific text is turned into a paragraph without breaking the rest of the heading.
 */
export function handleSmartParagraph(editor: any) {
  if (!editor) return;

  const { state, view } = editor;
  const { selection, schema } = state;
  const { $from, $to, from, to, empty } = selection;
  const paragraphType = schema.nodes.paragraph;

  if (!paragraphType) {
    editor.chain().focus().setParagraph().run();
    return;
  }

  if (!empty && $from.sameParent($to)) {
    const parent = $from.parent;
    const parentStart = $from.start();
    const parentEnd = $from.end();
    const isEntireBlock = from === parentStart && to === parentEnd;

    if (isEntireBlock) {
      editor.chain().focus().setParagraph().run();
      return;
    }

    const offsetFrom = from - parentStart;
    const offsetTo = to - parentStart;

    const beforeRaw = parent.content.cut(0, offsetFrom);
    const selectedRaw = parent.content.cut(offsetFrom, offsetTo);
    const afterRaw = parent.content.cut(offsetTo, parent.content.size);

    const beforeFragment = cleanTrailingHardBreak(beforeRaw);
    const selectedFragment = cleanTrailingHardBreak(cleanLeadingHardBreak(selectedRaw));
    const afterFragment = cleanLeadingHardBreak(afterRaw);

    const nodesToInsert: any[] = [];

    if (beforeFragment.size > 0 && beforeFragment.textBetween(0, beforeFragment.size, ' ').trim().length > 0) {
      nodesToInsert.push(parent.type.create(parent.attrs, beforeFragment));
    }

    if (selectedFragment.size > 0) {
      nodesToInsert.push(paragraphType.create({}, selectedFragment));
    }

    if (afterFragment.size > 0 && afterFragment.textBetween(0, afterFragment.size, ' ').trim().length > 0) {
      nodesToInsert.push(parent.type.create(parent.attrs, afterFragment));
    }

    if (nodesToInsert.length === 0) {
      editor.chain().focus().setParagraph().run();
      return;
    }

    const tr = state.tr;
    const parentPos = $from.before();
    const parentEndPos = $from.after();

    tr.replaceWith(parentPos, parentEndPos, nodesToInsert);

    let currentPos = parentPos;
    let targetStart = -1;
    let targetEnd = -1;

    for (const node of nodesToInsert) {
      if (node.type === paragraphType) {
        targetStart = currentPos + 1;
        targetEnd = currentPos + 1 + node.content.size;
        break;
      }
      currentPos += node.nodeSize;
    }

    if (targetStart !== -1 && targetEnd >= targetStart) {
      try {
        const $start = tr.doc.resolve(targetStart);
        const $end = tr.doc.resolve(targetEnd);
        tr.setSelection(new TextSelection($start, $end));
      } catch (err) {
        // Fallback
      }
    }

    view.dispatch(tr);
    editor.commands.focus();
    return;
  }

  editor.chain().focus().setParagraph().run();
}

const MenuBar = ({ editor, onOpenGridModal }: { editor: any; onOpenGridModal: () => void }) => {
  if (!editor) {
    return null;
  }

  const format = getCurrentFormatInfo(editor);

  const addImage = () => {
    const url = window.prompt('URL of the image');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);

    if (url === null) {
      return;
    }

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 border-b border-slate-200 bg-slate-50 rounded-t-lg">
      <button
        type="button"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        className={`p-2 rounded transition-colors ${editor.can().undo() ? 'hover:bg-slate-200 text-slate-600' : 'text-slate-300 cursor-not-allowed'}`}
        title="Undo"
      >
        <Undo className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        className={`p-2 rounded transition-colors ${editor.can().redo() ? 'hover:bg-slate-200 text-slate-600' : 'text-slate-300 cursor-not-allowed'}`}
        title="Redo"
      >
        <Redo className="w-4 h-4" />
      </button>
      
      <div className="w-px h-6 bg-slate-300 mx-1 self-center" />
      
      <select
        value={editor.getAttributes('textStyle').fontFamily || ''}
        onChange={(e) => {
          if (e.target.value) {
            editor.chain().focus().setFontFamily(e.target.value).run();
          } else {
            editor.chain().focus().unsetFontFamily().run();
          }
        }}
        className="p-1.5 rounded bg-transparent hover:bg-slate-200 text-sm font-medium text-slate-700 outline-none cursor-pointer"
        title="Font Family"
      >
        <option value="">Default Font</option>
        <option value="Montserrat">Montserrat</option>
        <option value="Playfair Display">Playfair Display</option>
      </select>

      <div className="w-px h-6 bg-slate-300 mx-1 self-center" />

      {/* Heading 1 - Purple Indicator */}
      <button
        type="button"
        onClick={() => handleSmartHeadingToggle(editor, 1)}
        className={`px-2 py-1.5 rounded text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
          editor.isActive('heading', { level: 1 })
            ? 'bg-purple-600 text-white font-bold shadow-sm ring-2 ring-purple-400'
            : 'text-slate-600 hover:bg-purple-50 hover:text-purple-700'
        }`}
        title="Heading 1 (Purple)"
      >
        <Heading1 className="w-4 h-4" />
        <span className="hidden sm:inline">H1</span>
      </button>

      {/* Heading 2 - Indigo Indicator */}
      <button
        type="button"
        onClick={() => handleSmartHeadingToggle(editor, 2)}
        className={`px-2 py-1.5 rounded text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
          editor.isActive('heading', { level: 2 })
            ? 'bg-indigo-600 text-white font-bold shadow-sm ring-2 ring-indigo-400'
            : 'text-slate-600 hover:bg-indigo-50 hover:text-indigo-700'
        }`}
        title="Heading 2 (Indigo)"
      >
        <Heading2 className="w-4 h-4" />
        <span className="hidden sm:inline">H2</span>
      </button>

      {/* Heading 3 - Emerald Indicator */}
      <button
        type="button"
        onClick={() => handleSmartHeadingToggle(editor, 3)}
        className={`px-2 py-1.5 rounded text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
          editor.isActive('heading', { level: 3 })
            ? 'bg-emerald-600 text-white font-bold shadow-sm ring-2 ring-emerald-400'
            : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
        }`}
        title="Heading 3 (Emerald Green)"
      >
        <Heading3 className="w-4 h-4" />
        <span className="hidden sm:inline">H3</span>
      </button>

      {/* Paragraph (P) - Slate Indicator */}
      <button
        type="button"
        onClick={() => handleSmartParagraph(editor)}
        className={`px-2.5 py-1.5 rounded text-xs font-bold transition-all cursor-pointer ${
          editor.isActive('paragraph')
            ? 'bg-slate-900 text-white font-bold shadow-sm ring-2 ring-slate-400'
            : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'
        }`}
        title="Paragraph (Charcoal / Slate)"
      >
        P
      </button>

      {/* Color-coded Current Format Pill */}
      <div 
        className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border transition-all ${format.badgeBg} ${format.badgeText} ${format.badgeBorder}`}
        title={`Active format: ${format.label}`}
      >
        <span className={`w-2 h-2 rounded-full ${format.dotColor} shrink-0`} />
        <span>{format.label}</span>
      </div>

      <div className="w-px h-6 bg-slate-300 mx-1 self-center" />

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`p-2 rounded hover:bg-slate-200 transition-colors ${editor.isActive('bold') ? 'bg-slate-200 text-slate-900 font-bold' : 'text-slate-600'}`}
        title="Bold"
      >
        <Bold className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`p-2 rounded hover:bg-slate-200 transition-colors ${editor.isActive('italic') ? 'bg-slate-200 text-slate-900 font-bold' : 'text-slate-600'}`}
        title="Italic"
      >
        <Italic className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={`p-2 rounded hover:bg-slate-200 transition-colors ${editor.isActive('underline') ? 'bg-slate-200 text-slate-900 font-bold' : 'text-slate-600'}`}
        title="Underline"
      >
        <UnderlineIcon className="w-4 h-4" />
      </button>
      <div className="flex items-center gap-1 p-1 rounded hover:bg-slate-200 transition-colors">
        <Highlighter className="w-4 h-4 text-slate-600" />
        <input
          type="color"
          onInput={(event) => editor.chain().focus().setHighlight({ color: event.currentTarget.value }).run()}
          value={editor.getAttributes('highlight').color || '#ffff00'}
          className="w-5 h-5 p-0 border-0 bg-transparent cursor-pointer"
          title="Highlight Color"
        />
      </div>
      <button
        type="button"
        onClick={setLink}
        className={`p-2 rounded hover:bg-slate-200 transition-colors ${editor.isActive('link') ? 'bg-slate-200 text-slate-900' : 'text-slate-600'}`}
        title="Link"
      >
        <LinkIcon className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
        className="p-2 rounded hover:bg-slate-200 transition-colors text-slate-600"
        title="Clear Formatting"
      >
        <RemoveFormatting className="w-4 h-4" />
      </button>
      <div className="w-px h-6 bg-slate-300 mx-1 self-center" />
      <button
        type="button"
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        className={`p-2 rounded hover:bg-slate-200 transition-colors ${editor.isActive({ textAlign: 'left' }) ? 'bg-slate-200 text-slate-900' : 'text-slate-600'}`}
        title="Align Left"
      >
        <AlignLeft className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        className={`p-2 rounded hover:bg-slate-200 transition-colors ${editor.isActive({ textAlign: 'center' }) ? 'bg-slate-200 text-slate-900' : 'text-slate-600'}`}
        title="Align Center"
      >
        <AlignCenter className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        className={`p-2 rounded hover:bg-slate-200 transition-colors ${editor.isActive({ textAlign: 'right' }) ? 'bg-slate-200 text-slate-900' : 'text-slate-600'}`}
        title="Align Right"
      >
        <AlignRight className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().setTextAlign('justify').run()}
        className={`p-2 rounded hover:bg-slate-200 transition-colors ${editor.isActive({ textAlign: 'justify' }) ? 'bg-slate-200 text-slate-900' : 'text-slate-600'}`}
        title="Justify"
      >
        <AlignJustify className="w-4 h-4" />
      </button>
      <div className="w-px h-6 bg-slate-300 mx-1 self-center" />
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`p-2 rounded hover:bg-slate-200 transition-colors ${editor.isActive('bulletList') ? 'bg-slate-200 text-slate-900' : 'text-slate-600'}`}
        title="Bullet List"
      >
        <List className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`p-2 rounded hover:bg-slate-200 transition-colors ${editor.isActive('orderedList') ? 'bg-slate-200 text-slate-900' : 'text-slate-600'}`}
        title="Ordered List"
      >
        <ListOrdered className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={`p-2 rounded hover:bg-slate-200 transition-colors ${editor.isActive('blockquote') ? 'bg-amber-600 text-white font-bold ring-2 ring-amber-400' : 'text-slate-600 hover:bg-amber-50 hover:text-amber-700'}`}
        title="Blockquote (Amber)"
      >
        <Quote className="w-4 h-4" />
      </button>
      <div className="w-px h-6 bg-slate-300 mx-1 self-center" />
      <button
        type="button"
        onClick={addImage}
        className="p-2 rounded hover:bg-slate-200 transition-colors text-slate-600"
        title="Insert Single Image"
      >
        <ImageIcon className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={onOpenGridModal}
        className="px-2.5 py-1.5 rounded-md hover:bg-emerald-50 text-emerald-700 dark:text-emerald-400 border border-emerald-300 hover:border-emerald-400 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer ml-1"
        title="Insert Editorial Photo Grid (Magazine Spread / Diptych / Triptych)"
      >
        <LayoutGrid className="w-3.5 h-3.5 text-emerald-600" />
        <span className="hidden sm:inline">Magazine Grid</span>
      </button>
    </div>
  );
};

export const RichTextEditor: React.FC<RichTextEditorProps> = ({ content, onChange }) => {
  const [, setSelectionTick] = useState(0);
  const [isGridModalOpen, setIsGridModalOpen] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      HeadingEnterExit,
      EditorialGridNode,
      Image,
      Underline,
      Highlight.configure({
        multicolor: true,
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
      }),
      TextStyle,
      FontFamily.configure({
        // fonts config
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class: 'prose prose-slate prose-lg md:prose-xl mx-auto prose-headings:font-serif prose-headings:font-bold prose-a:text-slate-900 hover:prose-a:text-slate-600 prose-img:rounded-sm focus:outline-none min-h-[300px] p-4 w-full max-w-full',
      },
      transformPastedHTML(html) {
        return html
          .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
          .replace(/<!--[\s\S]*?-->/gi, '')
          .replace(/<\/?o:p[^>]*>/gi, '')
          .replace(/<\/?xml[^>]*>/gi, '')
          .replace(/class="[^"]*"/gi, '')
          .replace(/id="[^"]*"/gi, '');
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Re-render automatically whenever selection or cursor changes to update color indicators in real-time
  useEffect(() => {
    if (!editor) return;
    const handleUpdate = () => setSelectionTick(t => t + 1);
    editor.on('selectionUpdate', handleUpdate);
    editor.on('transaction', handleUpdate);
    return () => {
      editor.off('selectionUpdate', handleUpdate);
      editor.off('transaction', handleUpdate);
    };
  }, [editor]);

  const setLink = () => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);

    if (url === null) {
      return;
    }

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const handleInsertEditorialGrid = (data: EditorialGridData) => {
    if (!editor) return;
    editor.chain().focus().insertContent({
      type: 'editorialPhotoGrid',
      attrs: {
        layout: data.layout,
        images: data.images,
        caption: data.caption,
      },
    }).run();
  };

  const format = getCurrentFormatInfo(editor);
  const textContent = editor ? editor.getText() : '';
  const wordCount = textContent.trim() ? textContent.trim().split(/\s+/).length : 0;
  const charCount = textContent.length;

  return (
    <div className="border border-slate-200 rounded-lg bg-white overflow-hidden flex flex-col focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500 transition-shadow">
      <MenuBar editor={editor} onOpenGridModal={() => setIsGridModalOpen(true)} />
      <div className="flex-1 overflow-y-auto max-h-[600px] relative">
        {editor && (
          <BubbleMenu 
            editor={editor} 
            className="flex items-center bg-white shadow-xl border border-slate-200 rounded-lg overflow-hidden py-1 px-2 gap-1 z-50 animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Automatic Color Indicator for Highlighted Text */}
            <div 
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold border shadow-xs select-none transition-colors ${format.badgeBg} ${format.badgeText} ${format.badgeBorder}`}
              title={`This highlighted text is formatted as ${format.label}`}
            >
              <span className={`w-2 h-2 rounded-full ${format.dotColor} animate-pulse`} />
              <span>{format.label}</span>
            </div>

            <div className="w-px h-5 bg-slate-300 mx-1 self-center" />

            {/* Quick Action Heading Buttons in Highlight Bubble - Color Coded */}
            <button
              type="button"
              onClick={() => handleSmartHeadingToggle(editor, 1)}
              className={`px-2 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                editor.isActive('heading', { level: 1 })
                  ? 'bg-purple-600 text-white font-bold shadow-sm ring-1 ring-purple-600'
                  : 'text-slate-600 hover:bg-purple-50 hover:text-purple-700'
              }`}
              title="Convert highlighted text to H1 (Purple)"
            >
              H1
            </button>
            <button
              type="button"
              onClick={() => handleSmartHeadingToggle(editor, 2)}
              className={`px-2 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                editor.isActive('heading', { level: 2 })
                  ? 'bg-indigo-600 text-white font-bold shadow-sm ring-1 ring-indigo-600'
                  : 'text-slate-600 hover:bg-indigo-50 hover:text-indigo-700'
              }`}
              title="Convert highlighted text to H2 (Indigo)"
            >
              H2
            </button>
            <button
              type="button"
              onClick={() => handleSmartHeadingToggle(editor, 3)}
              className={`px-2 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                editor.isActive('heading', { level: 3 })
                  ? 'bg-emerald-600 text-white font-bold shadow-sm ring-1 ring-emerald-600'
                  : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
              }`}
              title="Convert highlighted text to H3 (Emerald)"
            >
              H3
            </button>
            <button
              type="button"
              onClick={() => handleSmartParagraph(editor)}
              className={`px-2 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                editor.isActive('paragraph')
                  ? 'bg-slate-900 text-white font-bold shadow-sm ring-1 ring-slate-900'
                  : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
              title="Convert highlighted text to normal Paragraph (P)"
            >
              P
            </button>

            <div className="w-px h-5 bg-slate-300 mx-1 self-center" />

            {/* Standard Text Formatting Buttons */}
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`p-1.5 rounded hover:bg-slate-100 transition-colors ${editor.isActive('bold') ? 'bg-slate-200 text-slate-900 font-bold' : 'text-slate-600'}`}
              title="Bold"
            >
              <Bold className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`p-1.5 rounded hover:bg-slate-100 transition-colors ${editor.isActive('italic') ? 'bg-slate-200 text-slate-900 font-bold' : 'text-slate-600'}`}
              title="Italic"
            >
              <Italic className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              className={`p-1.5 rounded hover:bg-slate-100 transition-colors ${editor.isActive('underline') ? 'bg-slate-200 text-slate-900 font-bold' : 'text-slate-600'}`}
              title="Underline"
            >
              <UnderlineIcon className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1 p-1 rounded hover:bg-slate-100 transition-colors">
              <Highlighter className="w-4 h-4 text-slate-600" />
              <input
                type="color"
                onInput={(event) => editor.chain().focus().setHighlight({ color: event.currentTarget.value }).run()}
                value={editor.getAttributes('highlight').color || '#ffff00'}
                className="w-5 h-5 p-0 border-0 bg-transparent cursor-pointer"
                title="Highlight Color"
              />
            </div>
            <button
              type="button"
              onClick={setLink}
              className={`p-1.5 rounded hover:bg-slate-100 transition-colors ${editor.isActive('link') ? 'bg-slate-200 text-slate-900' : 'text-slate-600'}`}
              title="Link"
            >
              <LinkIcon className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
              className="p-1.5 rounded hover:bg-slate-100 transition-colors text-slate-600"
              title="Clear Formatting"
            >
              <RemoveFormatting className="w-4 h-4" />
            </button>

            <div className="w-px h-5 bg-slate-300 mx-1 self-center" />

            <button
              type="button"
              onClick={() => editor.chain().focus().setTextAlign('left').run()}
              className={`p-1.5 rounded hover:bg-slate-100 transition-colors ${editor.isActive({ textAlign: 'left' }) ? 'bg-slate-200 text-slate-900' : 'text-slate-600'}`}
              title="Align Left"
            >
              <AlignLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().setTextAlign('center').run()}
              className={`p-1.5 rounded hover:bg-slate-100 transition-colors ${editor.isActive({ textAlign: 'center' }) ? 'bg-slate-200 text-slate-900' : 'text-slate-600'}`}
              title="Align Center"
            >
              <AlignCenter className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().setTextAlign('right').run()}
              className={`p-1.5 rounded hover:bg-slate-100 transition-colors ${editor.isActive({ textAlign: 'right' }) ? 'bg-slate-200 text-slate-900' : 'text-slate-600'}`}
              title="Align Right"
            >
              <AlignRight className="w-4 h-4" />
            </button>
          </BubbleMenu>
        )}
        <EditorContent editor={editor} />
      </div>

      {/* Live Editor Footer Bar with Format Color Indicator & Word Counts */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 border-t border-slate-200 bg-slate-50/80 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-600">Selected text:</span>
          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded font-bold border transition-all ${format.badgeBg} ${format.badgeText} ${format.badgeBorder}`}>
            <span className={`w-2 h-2 rounded-full ${format.dotColor}`} />
            {format.label}
          </span>
        </div>
        <div className="flex items-center gap-4 text-slate-400">
          <span>{wordCount} {wordCount === 1 ? 'word' : 'words'}</span>
          <span>•</span>
          <span>{charCount} characters</span>
        </div>
      </div>

      {/* Editorial Photo Grid Modal */}
      <EditorialGridModal 
        isOpen={isGridModalOpen} 
        onClose={() => setIsGridModalOpen(false)} 
        onInsert={handleInsertEditorialGrid} 
      />
    </div>
  );
};

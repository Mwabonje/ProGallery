import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import { Bold, Italic, Underline as UnderlineIcon, Heading1, Heading2, Heading3, List, ListOrdered, Quote, Image as ImageIcon, AlignLeft, AlignCenter, AlignRight, AlignJustify } from 'lucide-react';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
}

const MenuBar = ({ editor }: { editor: any }) => {
  if (!editor) {
    return null;
  }

  const addImage = () => {
    const url = window.prompt('URL of the image');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  return (
    <div className="flex flex-wrap gap-1 p-2 border-b border-slate-200 bg-slate-50 rounded-t-lg">
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={`p-2 rounded hover:bg-slate-200 transition-colors ${editor.isActive('heading', { level: 1 }) ? 'bg-slate-200 text-slate-900' : 'text-slate-600'}`}
        title="Heading 1"
      >
        <Heading1 className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={`p-2 rounded hover:bg-slate-200 transition-colors ${editor.isActive('heading', { level: 2 }) ? 'bg-slate-200 text-slate-900' : 'text-slate-600'}`}
        title="Heading 2"
      >
        <Heading2 className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={`p-2 rounded hover:bg-slate-200 transition-colors ${editor.isActive('heading', { level: 3 }) ? 'bg-slate-200 text-slate-900' : 'text-slate-600'}`}
        title="Heading 3"
      >
        <Heading3 className="w-4 h-4" />
      </button>
      <div className="w-px h-6 bg-slate-300 mx-1 self-center" />
      <button
        type="button"
        onClick={() => editor.chain().focus().setParagraph().run()}
        className={`p-2 rounded hover:bg-slate-200 transition-colors text-sm font-bold ${editor.isActive('paragraph') ? 'bg-slate-200 text-slate-900' : 'text-slate-600'}`}
        title="Paragraph"
      >
        P
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`p-2 rounded hover:bg-slate-200 transition-colors ${editor.isActive('bold') ? 'bg-slate-200 text-slate-900' : 'text-slate-600'}`}
        title="Bold"
      >
        <Bold className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`p-2 rounded hover:bg-slate-200 transition-colors ${editor.isActive('italic') ? 'bg-slate-200 text-slate-900' : 'text-slate-600'}`}
        title="Italic"
      >
        <Italic className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={`p-2 rounded hover:bg-slate-200 transition-colors ${editor.isActive('underline') ? 'bg-slate-200 text-slate-900' : 'text-slate-600'}`}
        title="Underline"
      >
        <UnderlineIcon className="w-4 h-4" />
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
        className={`p-2 rounded hover:bg-slate-200 transition-colors ${editor.isActive('blockquote') ? 'bg-slate-200 text-slate-900' : 'text-slate-600'}`}
        title="Blockquote"
      >
        <Quote className="w-4 h-4" />
      </button>
      <div className="w-px h-6 bg-slate-300 mx-1 self-center" />
      <button
        type="button"
        onClick={addImage}
        className="p-2 rounded hover:bg-slate-200 transition-colors text-slate-600"
        title="Insert Image"
      >
        <ImageIcon className="w-4 h-4" />
      </button>
    </div>
  );
};

export const RichTextEditor: React.FC<RichTextEditorProps> = ({ content, onChange }) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class: 'prose prose-slate prose-lg md:prose-xl mx-auto prose-headings:font-serif prose-headings:font-bold prose-a:text-slate-900 hover:prose-a:text-slate-600 prose-img:rounded-sm focus:outline-none min-h-[300px] p-4 w-full max-w-full',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  return (
    <div className="border border-slate-200 rounded-lg bg-white overflow-hidden flex flex-col focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500 transition-shadow">
      <MenuBar editor={editor} />
      <div className="flex-1 overflow-y-auto max-h-[600px] relative">
        {editor && (
          <BubbleMenu 
            editor={editor} 
            tippyOptions={{ duration: 100 }}
            className="flex items-center bg-white shadow-lg border border-slate-200 rounded-lg overflow-hidden py-1 px-2 gap-1 z-50"
          >
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              className={`p-1.5 rounded hover:bg-slate-100 transition-colors ${editor.isActive('heading', { level: 1 }) ? 'bg-slate-100 text-slate-900' : 'text-slate-600'}`}
              title="Heading 1"
            >
              <Heading1 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              className={`p-1.5 rounded hover:bg-slate-100 transition-colors ${editor.isActive('heading', { level: 2 }) ? 'bg-slate-100 text-slate-900' : 'text-slate-600'}`}
              title="Heading 2"
            >
              <Heading2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              className={`p-1.5 rounded hover:bg-slate-100 transition-colors ${editor.isActive('heading', { level: 3 }) ? 'bg-slate-100 text-slate-900' : 'text-slate-600'}`}
              title="Heading 3"
            >
              <Heading3 className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-slate-300 mx-1 self-center" />
            <button
              type="button"
              onClick={() => editor.chain().focus().setParagraph().run()}
              className={`p-1.5 rounded hover:bg-slate-100 transition-colors text-xs font-bold ${editor.isActive('paragraph') ? 'bg-slate-100 text-slate-900' : 'text-slate-600'}`}
              title="Paragraph"
            >
              P
            </button>
            <div className="w-px h-4 bg-slate-300 mx-1 self-center" />
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`p-1.5 rounded hover:bg-slate-100 transition-colors ${editor.isActive('bold') ? 'bg-slate-100 text-slate-900' : 'text-slate-600'}`}
              title="Bold"
            >
              <Bold className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`p-1.5 rounded hover:bg-slate-100 transition-colors ${editor.isActive('italic') ? 'bg-slate-100 text-slate-900' : 'text-slate-600'}`}
              title="Italic"
            >
              <Italic className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              className={`p-1.5 rounded hover:bg-slate-100 transition-colors ${editor.isActive('underline') ? 'bg-slate-100 text-slate-900' : 'text-slate-600'}`}
              title="Underline"
            >
              <UnderlineIcon className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-slate-300 mx-1 self-center" />
            <button
              type="button"
              onClick={() => editor.chain().focus().setTextAlign('left').run()}
              className={`p-1.5 rounded hover:bg-slate-100 transition-colors ${editor.isActive({ textAlign: 'left' }) ? 'bg-slate-100 text-slate-900' : 'text-slate-600'}`}
              title="Align Left"
            >
              <AlignLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().setTextAlign('center').run()}
              className={`p-1.5 rounded hover:bg-slate-100 transition-colors ${editor.isActive({ textAlign: 'center' }) ? 'bg-slate-100 text-slate-900' : 'text-slate-600'}`}
              title="Align Center"
            >
              <AlignCenter className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().setTextAlign('right').run()}
              className={`p-1.5 rounded hover:bg-slate-100 transition-colors ${editor.isActive({ textAlign: 'right' }) ? 'bg-slate-100 text-slate-900' : 'text-slate-600'}`}
              title="Align Right"
            >
              <AlignRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().setTextAlign('justify').run()}
              className={`p-1.5 rounded hover:bg-slate-100 transition-colors ${editor.isActive({ textAlign: 'justify' }) ? 'bg-slate-100 text-slate-900' : 'text-slate-600'}`}
              title="Justify"
            >
              <AlignJustify className="w-4 h-4" />
            </button>
          </BubbleMenu>
        )}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};

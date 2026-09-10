import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Image } from "@tiptap/extension-image";
import { Link } from "@tiptap/extension-link";
import { Placeholder } from "@tiptap/extension-placeholder";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { Youtube } from "@tiptap/extension-youtube";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import { useCallback, useEffect, useState } from "react";
import {
  Bold, Italic, Strikethrough, Heading2, Heading3,
  List, ListOrdered, Quote, Code2, Table as TableIcon, Image as ImageIcon,
  Youtube as YoutubeIcon, Link as LinkIcon, Undo2, Redo2, Minus, Sparkles
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { uploadImage } from "@/lib/media";
import { toast } from "sonner";

const lowlight = createLowlight(common);

type Props = {
  value?: any;
  onChange: (json: any, html: string) => void;
  placeholder?: string;
};

export function RichEditor({ value, onChange, placeholder }: Props) {
  const [linkDialog, setLinkDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [youtubeDialog, setYoutubeDialog] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] }, codeBlock: false, link: false } as any),
      CodeBlockLowlight.configure({ lowlight }),
      Image.configure({ allowBase64: false }),
      Link.configure({ openOnClick: false, autolink: true }),
      Placeholder.configure({ placeholder: placeholder || "Write your article content here... Use H2 for Table of Contents sections and Quote for key takeaways." }),
      Table.configure({ resizable: true }),
      TableRow, TableCell, TableHeader,
      Youtube.configure({ width: 720, height: 405, controls: true, nocookie: true }),
    ],
    content: value || "",
    onUpdate: ({ editor }) => onChange(editor.getJSON(), editor.getHTML()),
    editorProps: {
      attributes: { class: "tiptap prose-base max-w-none focus:outline-none px-6 py-6 min-h-[340px]" },
      handleDrop: (view, event) => {
        const files = Array.from(event.dataTransfer?.files || []).filter((f) => f.type.startsWith("image/"));
        if (files.length) {
          event.preventDefault();
          setIsUploading(true);
          files.forEach(async (file) => {
            try {
              const url = await uploadImage(file);
              const { schema } = view.state;
              const node = schema.nodes.image.create({ src: url });
              const tr = view.state.tr.insert(view.state.selection.from, node);
              view.dispatch(tr);
              toast.success("Image uploaded to storage and inserted");
            } catch (e: any) {
              toast.error(e.message || "Image upload failed");
            } finally {
              setIsUploading(false);
            }
          });
          return true;
        }
        return false;
      },
      handlePaste: (view, event) => {
        const files = Array.from(event.clipboardData?.files || []).filter((f) => f.type.startsWith("image/"));
        if (files.length) {
          event.preventDefault();
          setIsUploading(true);
          files.forEach(async (file) => {
            try {
              const url = await uploadImage(file);
              const { schema } = view.state;
              const node = schema.nodes.image.create({ src: url });
              const tr = view.state.tr.insert(view.state.selection.from, node);
              view.dispatch(tr);
              toast.success("Pasted image uploaded");
            } catch (e: any) {
              toast.error(e.message || "Image upload failed");
            } finally {
              setIsUploading(false);
            }
          });
          return true;
        }
        return false;
      },
    },
  });

  useEffect(() => {
    if (editor && value && editor.isEmpty) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [editor, value]);

  const addImage = useCallback(async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file || !editor) return;
      setIsUploading(true);
      try {
        const url = await uploadImage(file);
        editor.chain().focus().setImage({ src: url }).run();
        toast.success("Image inserted");
      } catch (e: any) {
        toast.error(e.message || "Upload failed");
      } finally {
        setIsUploading(false);
      }
    };
    input.click();
  }, [editor]);

  const insertTakeawayBox = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().insertContent('<blockquote><p><strong>Key Insight:</strong> Structured cabling planned during grey-structure stage quietly determines what your home can do a decade later.</p></blockquote><p></p>').run();
    toast.info("Inserted luxury pull-quote / key takeaway");
  }, [editor]);

  function openYoutubeDialog() {
    setYoutubeUrl("");
    setYoutubeDialog(true);
  }

  function confirmYoutube() {
    if (youtubeUrl && editor) {
      editor.commands.setYoutubeVideo({ src: youtubeUrl });
    }
    setYoutubeDialog(false);
  }

  function openLinkDialog() {
    if (!editor) return;
    const prev = editor.getAttributes("link").href || "";
    setLinkUrl(prev);
    setLinkDialog(true);
  }

  function confirmLink() {
    if (!editor) return;
    if (!linkUrl) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href: linkUrl }).run();
    }
    setLinkDialog(false);
  }

  if (!editor) return null;

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <Toolbar
          editor={editor}
          onImage={addImage}
          onYoutube={openYoutubeDialog}
          onLink={openLinkDialog}
          onTakeaway={insertTakeawayBox}
          isUploading={isUploading}
        />
        <div className="relative">
          {isUploading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-card/60 backdrop-blur-sm">
              <div className="flex items-center gap-2 rounded-xl bg-background px-4 py-2 text-sm font-medium shadow-md">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                Uploading image to storage...
              </div>
            </div>
          )}
          <EditorContent editor={editor} />
        </div>
      </div>

      {/* Link dialog */}
      <Dialog open={linkDialog} onOpenChange={setLinkDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Insert link</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="link-url">URL</Label>
            <Input
              id="link-url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://example.com"
              className="rounded-xl"
              onKeyDown={(e) => e.key === "Enter" && confirmLink()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-full" onClick={() => setLinkDialog(false)}>Cancel</Button>
            <Button className="rounded-full" onClick={confirmLink}>Apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* YouTube dialog */}
      <Dialog open={youtubeDialog} onOpenChange={setYoutubeDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Embed YouTube video</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="yt-url">YouTube URL</Label>
            <Input
              id="yt-url"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="rounded-xl"
              onKeyDown={(e) => e.key === "Enter" && confirmYoutube()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-full" onClick={() => setYoutubeDialog(false)}>Cancel</Button>
            <Button className="rounded-full" onClick={confirmYoutube}>Embed</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Toolbar({
  editor,
  onImage,
  onYoutube,
  onLink,
  onTakeaway,
  isUploading,
}: {
  editor: Editor;
  onImage: () => void;
  onYoutube: () => void;
  onLink: () => void;
  onTakeaway: () => void;
  isUploading: boolean;
}) {
  const btn = (active: boolean) =>
    "inline-flex h-8 items-center justify-center rounded-lg px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground " +
    (active ? "bg-primary/15 text-primary font-semibold" : "");

  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-1 border-b border-border bg-card/95 px-3 py-2 backdrop-blur">
      <button type="button" className={btn(editor.isActive("bold"))} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold">
        <Bold className="h-3.5 w-3.5" />
      </button>
      <button type="button" className={btn(editor.isActive("italic"))} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic">
        <Italic className="h-3.5 w-3.5" />
      </button>
      <button type="button" className={btn(editor.isActive("strike"))} onClick={() => editor.chain().focus().toggleStrike().run()} title="Strikethrough">
        <Strikethrough className="h-3.5 w-3.5" />
      </button>

      <Separator orientation="vertical" className="mx-1 h-5" />

      {/* Heading 2 with TOC tag */}
      <button
        type="button"
        className={btn(editor.isActive("heading", { level: 2 }))}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        title="Heading 2 (Creates Table of Contents Section)"
      >
        <Heading2 className="h-3.5 w-3.5 mr-1" />
        <span className="text-[11px]">H2 (TOC)</span>
      </button>

      {/* Heading 3 */}
      <button
        type="button"
        className={btn(editor.isActive("heading", { level: 3 }))}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        title="Heading 3 (Sub-section)"
      >
        <Heading3 className="h-3.5 w-3.5 mr-1" />
        <span className="text-[11px]">H3</span>
      </button>

      <Separator orientation="vertical" className="mx-1 h-5" />

      {/* Pull Quote */}
      <button
        type="button"
        className={btn(editor.isActive("blockquote"))}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        title="Pull-Quote (Gold Luxury Accent)"
      >
        <Quote className="h-3.5 w-3.5 mr-1" />
        <span className="text-[11px]">Quote</span>
      </button>

      {/* Insert Takeaway Template */}
      <button
        type="button"
        className={btn(false)}
        onClick={onTakeaway}
        title="Insert Key Takeaway Box"
      >
        <Sparkles className="h-3.5 w-3.5 mr-1 text-[#F5A93F]" />
        <span className="text-[11px]">Takeaway</span>
      </button>

      <Separator orientation="vertical" className="mx-1 h-5" />

      <button type="button" className={btn(editor.isActive("bulletList"))} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet List">
        <List className="h-3.5 w-3.5" />
      </button>
      <button type="button" className={btn(editor.isActive("orderedList"))} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered List">
        <ListOrdered className="h-3.5 w-3.5" />
      </button>
      <button type="button" className={btn(editor.isActive("codeBlock"))} onClick={() => editor.chain().focus().toggleCodeBlock().run()} title="Code / Technical Spec">
        <Code2 className="h-3.5 w-3.5" />
      </button>

      <Separator orientation="vertical" className="mx-1 h-5" />

      <button type="button" className={btn(false)} onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title="Insert Table">
        <TableIcon className="h-3.5 w-3.5" />
      </button>
      <button type="button" className={btn(false)} onClick={onImage} disabled={isUploading} title="Upload and Insert Image">
        <ImageIcon className="h-3.5 w-3.5 mr-1" />
        <span className="text-[11px]">Image</span>
      </button>
      <button type="button" className={btn(false)} onClick={onYoutube} title="Embed YouTube Video">
        <YoutubeIcon className="h-3.5 w-3.5" />
      </button>
      <button type="button" className={btn(editor.isActive("link"))} onClick={onLink} title="Insert / Edit Link">
        <LinkIcon className="h-3.5 w-3.5" />
      </button>
      <button type="button" className={btn(false)} onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Divider Line">
        <Minus className="h-3.5 w-3.5" />
      </button>

      <div className="ml-auto flex items-center gap-1">
        <button type="button" className={btn(false)} onClick={() => editor.chain().focus().undo().run()} title="Undo">
          <Undo2 className="h-3.5 w-3.5" />
        </button>
        <button type="button" className={btn(false)} onClick={() => editor.chain().focus().redo().run()} title="Redo">
          <Redo2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

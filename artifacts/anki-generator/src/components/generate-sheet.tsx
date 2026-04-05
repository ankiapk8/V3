import { useState, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useGenerateCards, useCreateDeck, getListDecksQueryKey } from "@workspace/api-client-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  UploadCloud, X, CheckCircle2, AlertCircle, Loader2,
  FileText, Sparkles,
} from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { createWorker } from "tesseract.js";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

type FileStatus = "extracting" | "ready" | "error" | "generating" | "done";

type FileEntry = {
  id: string;
  name: string;
  status: FileStatus;
  text: string;
  progress: string;
  deckName: string;
  cardCount: number | "";
  generatedCount?: number;
};

interface GenerateSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone?: () => void;
}

export function GenerateSheet({ open, onOpenChange, onDone }: GenerateSheetProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const generateCards = useGenerateCards();
  const createDeck = useCreateDeck();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<FileEntry[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [manualText, setManualText] = useState("");
  const [manualDeckName, setManualDeckName] = useState("");
  const [manualCardCount, setManualCardCount] = useState<number | "">("");

  // Empty deck tab
  const [emptyName, setEmptyName] = useState("");
  const [emptyDesc, setEmptyDesc] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const isExtracting = files.some(f => f.status === "extracting");
  const readyFiles = files.filter(f => f.status === "ready");
  const hasManual = manualText.trim().length > 0 && manualDeckName.trim().length > 0;
  const canGenerate = !isExtracting && !isGeneratingAll && (readyFiles.length > 0 || hasManual);

  const updateFile = useCallback((id: string, patch: Partial<FileEntry>) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, ...patch } : f));
  }, []);

  const extractPdfText = async (buffer: ArrayBuffer): Promise<string> => {
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
    const pdf = await loadingTask.promise;
    const texts: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      texts.push(content.items.map((item: any) => item.str ?? "").join(" "));
    }
    return texts.join("\n").replace(/\s+/g, " ").trim();
  };

  const ocrPdf = async (buffer: ArrayBuffer, id: string): Promise<string> => {
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
    const pdf = await loadingTask.promise;
    const total = pdf.numPages;
    const worker = await createWorker("eng");
    const texts: string[] = [];
    for (let i = 1; i <= total; i++) {
      updateFile(id, { progress: `OCR page ${i}/${total}…` });
      const page = await pdf.getPage(i);
      const vp = page.getViewport({ scale: 2.0 });
      const canvas = document.createElement("canvas");
      canvas.width = vp.width; canvas.height = vp.height;
      await page.render({ canvasContext: canvas.getContext("2d")!, viewport: vp }).promise;
      const blob = await new Promise<Blob>(res => canvas.toBlob(b => res(b!), "image/png"));
      texts.push((await worker.recognize(blob)).data.text);
    }
    await worker.terminate();
    return texts.join("\n").replace(/\s+/g, " ").trim();
  };

  const processFile = useCallback(async (file: File) => {
    const isTxt = file.type === "text/plain" || file.name.endsWith(".txt");
    const isPdf = file.type === "application/pdf" || file.name.endsWith(".pdf");
    if (!isTxt && !isPdf) {
      toast({ title: "Unsupported file", description: `${file.name} is not .txt or .pdf`, variant: "destructive" });
      return;
    }
    const id = `${file.name}-${Date.now()}-${Math.random()}`;
    const baseName = file.name.replace(/\.[^.]+$/, "");
    setFiles(prev => [...prev, { id, name: file.name, status: "extracting", text: "", progress: "Reading…", deckName: baseName, cardCount: "" }]);
    try {
      if (isTxt) {
        const text = await file.text();
        updateFile(id, { status: "ready", text, progress: "" });
      } else {
        updateFile(id, { progress: "Extracting text…" });
        const buffer = await file.arrayBuffer();
        const extracted = await extractPdfText(buffer);
        if (extracted.length > 20) {
          updateFile(id, { status: "ready", text: extracted, progress: "" });
        } else {
          updateFile(id, { progress: "Starting OCR…" });
          const ocr = await ocrPdf(buffer, id);
          updateFile(id, ocr.length > 20 ? { status: "ready", text: ocr, progress: "" } : { status: "error", progress: "No text found" });
        }
      }
    } catch {
      updateFile(id, { status: "error", progress: "Extraction failed" });
    }
  }, [updateFile, toast]);

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    e.target.value = "";
    for (const f of selected) await processFile(f);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    for (const f of Array.from(e.dataTransfer.files)) await processFile(f);
  };

  const generateOne = (text: string, deckName: string, cardCount: number | ""): Promise<number> =>
    new Promise((resolve, reject) =>
      generateCards.mutate(
        { data: { text, deckName, cardCount: cardCount ? Number(cardCount) : undefined } },
        { onSuccess: d => resolve(d.generatedCount), onError: reject }
      )
    );

  const handleGenerateAll = async () => {
    setIsGeneratingAll(true);
    let ok = 0, fail = 0;
    const targets: Array<{ id?: string; text: string; deckName: string; cardCount: number | "" }> = [
      ...readyFiles.map(f => ({ id: f.id, text: f.text, deckName: f.deckName, cardCount: f.cardCount })),
      ...(hasManual ? [{ text: manualText, deckName: manualDeckName, cardCount: manualCardCount }] : []),
    ];

    for (const t of targets) {
      if (!t.deckName.trim()) {
        toast({ title: "Deck name required", description: "Please fill in all deck names.", variant: "destructive" });
        setIsGeneratingAll(false);
        return;
      }
      if (t.id) updateFile(t.id, { status: "generating", progress: "Generating…" });
      try {
        const count = await generateOne(t.text, t.deckName, t.cardCount);
        if (t.id) updateFile(t.id, { status: "done", progress: "", generatedCount: count });
        ok++;
      } catch {
        if (t.id) updateFile(t.id, { status: "error", progress: "Generation failed" });
        fail++;
      }
    }

    setIsGeneratingAll(false);
    queryClient.invalidateQueries({ queryKey: getListDecksQueryKey() });

    if (ok > 0) {
      toast({ title: ok === 1 ? "Deck generated!" : `${ok} decks generated!`, description: `${ok} deck${ok !== 1 ? "s" : ""} added to your library.` });
      if (fail === 0) { resetGenerateState(); onDone?.(); onOpenChange(false); }
    } else {
      toast({ title: "Generation failed", description: "All decks failed. Please try again.", variant: "destructive" });
    }
  };

  const resetGenerateState = () => {
    setFiles([]);
    setManualText("");
    setManualDeckName("");
    setManualCardCount("");
  };

  const handleCreateEmpty = () => {
    if (!emptyName.trim()) return;
    setIsCreating(true);
    createDeck.mutate(
      { data: { name: emptyName, description: emptyDesc } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListDecksQueryKey() });
          toast({ title: "Deck created." });
          setEmptyName(""); setEmptyDesc("");
          setIsCreating(false);
          onDone?.(); onOpenChange(false);
        },
        onError: () => {
          toast({ title: "Failed to create deck", variant: "destructive" });
          setIsCreating(false);
        },
      }
    );
  };

  const totalTargets = readyFiles.length + (hasManual ? 1 : 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="font-serif text-2xl">New Deck</SheetTitle>
          <SheetDescription>Generate AI flashcards from files or create an empty deck.</SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="generate" className="w-full">
          <TabsList className="w-full mb-5">
            <TabsTrigger value="generate" className="flex-1 gap-1.5">
              <Sparkles className="h-3.5 w-3.5" /> Generate with AI
            </TabsTrigger>
            <TabsTrigger value="empty" className="flex-1 gap-1.5">
              <FileText className="h-3.5 w-3.5" /> Empty Deck
            </TabsTrigger>
          </TabsList>

          {/* ── Generate tab ── */}
          <TabsContent value="generate" className="space-y-4 mt-0">
            {/* Drop zone */}
            <div
              className={`border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-colors ${
                isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30"
              }`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileInput} accept=".txt,.pdf" multiple disabled={isGeneratingAll} />
              <UploadCloud className="h-7 w-7 mx-auto mb-1.5 text-muted-foreground" />
              <p className="text-sm font-medium">Drop files or click to browse</p>
              <p className="text-xs text-muted-foreground mt-0.5">PDF and TXT — multiple files at once</p>
            </div>

            {/* File entries */}
            {files.map(f => (
              <Card key={f.id} className="border-border/50">
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    {f.status === "extracting" && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />}
                    {f.status === "ready"       && <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />}
                    {f.status === "generating"  && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />}
                    {f.status === "done"        && <Sparkles className="h-4 w-4 shrink-0 text-green-500" />}
                    {f.status === "error"       && <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />}
                    <span className="text-sm font-medium flex-1 truncate">{f.name}</span>
                    {f.status === "extracting"  && <span className="text-xs text-muted-foreground shrink-0">{f.progress}</span>}
                    {f.status === "ready"       && <Badge variant="secondary" className="text-xs shrink-0">{(f.text.length / 1000).toFixed(1)}k chars</Badge>}
                    {f.status === "generating"  && <span className="text-xs text-muted-foreground shrink-0">Generating…</span>}
                    {f.status === "done"        && <Badge className="text-xs shrink-0 bg-green-500 hover:bg-green-600">{f.generatedCount} cards</Badge>}
                    {f.status === "error"       && <span className="text-xs text-destructive shrink-0">{f.progress}</span>}
                    <button onClick={() => setFiles(p => p.filter(x => x.id !== f.id))} className="text-muted-foreground hover:text-foreground ml-1 shrink-0" disabled={isGeneratingAll || f.status === "generating"}>
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {(f.status === "ready" || f.status === "error") && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Deck Name</Label>
                        <Input value={f.deckName} onChange={e => updateFile(f.id, { deckName: e.target.value })} className="h-7 text-xs" placeholder="e.g. Biology 101" disabled={isGeneratingAll} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Target Cards</Label>
                        <Input type="number" value={f.cardCount} onChange={e => updateFile(f.id, { cardCount: e.target.value ? Number(e.target.value) : "" })} className="h-7 text-xs" placeholder="e.g. 20" min="1" max="100" disabled={isGeneratingAll} />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {/* Manual text */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Additional text {files.length > 0 && "(optional)"}</Label>
              <Textarea placeholder="Paste study material here…" className="min-h-[100px] resize-none text-sm" value={manualText} onChange={e => setManualText(e.target.value)} disabled={isGeneratingAll} />
            </div>
            {manualText.trim().length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Deck Name</Label>
                  <Input value={manualDeckName} onChange={e => setManualDeckName(e.target.value)} className="h-7 text-xs" placeholder="e.g. Lecture Notes" disabled={isGeneratingAll} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Target Cards</Label>
                  <Input type="number" value={manualCardCount} onChange={e => setManualCardCount(e.target.value ? Number(e.target.value) : "")} className="h-7 text-xs" placeholder="e.g. 15" min="1" max="100" disabled={isGeneratingAll} />
                </div>
              </div>
            )}

            <Button className="w-full" onClick={handleGenerateAll} disabled={!canGenerate}>
              {isGeneratingAll ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating…</>
              ) : isExtracting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing files…</>
              ) : (
                <><Sparkles className="mr-2 h-4 w-4" />
                  {totalTargets > 1 ? `Generate ${totalTargets} Decks` : "Generate Deck"}
                </>
              )}
            </Button>
          </TabsContent>

          {/* ── Empty deck tab ── */}
          <TabsContent value="empty" className="space-y-4 mt-0">
            <div className="space-y-2">
              <Label htmlFor="emptyName">Deck Name</Label>
              <Input id="emptyName" value={emptyName} onChange={e => setEmptyName(e.target.value)} placeholder="e.g. Spanish Vocabulary" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emptyDesc">Description <span className="text-muted-foreground">(optional)</span></Label>
              <Textarea id="emptyDesc" value={emptyDesc} onChange={e => setEmptyDesc(e.target.value)} placeholder="What is this deck for?" className="resize-none" rows={3} />
            </div>
            <Button className="w-full" onClick={handleCreateEmpty} disabled={!emptyName.trim() || isCreating}>
              {isCreating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating…</> : <><FileText className="mr-2 h-4 w-4" />Create Empty Deck</>}
            </Button>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

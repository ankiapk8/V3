import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useGenerateCards } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { FileText, Loader2, UploadCloud } from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export default function Home() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const generateCards = useGenerateCards();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [text, setText] = useState("");
  const [deckName, setDeckName] = useState("");
  const [cardCount, setCardCount] = useState<number | "">("");
  const [fileName, setFileName] = useState("");

  const extractPdfText = async (buffer: ArrayBuffer): Promise<string> => {
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
    const pdf = await loadingTask.promise;
    const pageTexts: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((item: any) => (typeof item.str === "string" ? item.str : ""))
        .join(" ");
      pageTexts.push(pageText);
    }
    return pageTexts.join("\n").replace(/\s+/g, " ").trim();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isTxt = file.type === "text/plain" || file.name.endsWith(".txt");
    const isPdf = file.type === "application/pdf" || file.name.endsWith(".pdf");

    if (!isTxt && !isPdf) {
      toast({
        title: "Unsupported file type",
        description: "Please upload a .txt or .pdf file.",
        variant: "destructive",
      });
      e.target.value = "";
      return;
    }

    setFileName(file.name);
    const baseName = file.name.replace(/\.[^.]+$/, "");
    if (!deckName) setDeckName(baseName);

    if (isTxt) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setText(content);
        toast({ title: "File loaded", description: `${file.name} ready for processing.` });
      };
      reader.readAsText(file);
    } else if (isPdf) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const buffer = event.target?.result as ArrayBuffer;
        const extracted = await extractPdfText(buffer);
        if (extracted && extracted.length > 20) {
          setText(extracted);
          toast({ title: "PDF loaded", description: `Extracted text from ${file.name}.` });
        } else {
          toast({
            title: "PDF extraction limited",
            description: "Could not extract text from this PDF. Try copy-pasting the content directly.",
            variant: "destructive",
          });
        }
      };
      reader.readAsArrayBuffer(file);
    }

    e.target.value = "";
  };

  const handleGenerate = () => {
    if (!text.trim()) {
      toast({ title: "Text required", description: "Please paste text or upload a file.", variant: "destructive" });
      return;
    }
    if (!deckName.trim()) {
      toast({ title: "Deck name required", description: "Please enter a name for your deck.", variant: "destructive" });
      return;
    }

    generateCards.mutate(
      {
        data: {
          text,
          deckName,
          cardCount: cardCount ? Number(cardCount) : undefined,
        },
      },
      {
        onSuccess: (data) => {
          toast({
            title: "Cards generated!",
            description: `Successfully created ${data.generatedCount} cards.`,
          });
          setLocation(`/decks/${data.deck.id}`);
        },
        onError: () => {
          toast({
            title: "Generation failed",
            description: "There was an error generating your cards. Please try again.",
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full animate-in fade-in duration-500">
      <div className="text-center mb-10 space-y-3">
        <h1 className="text-4xl md:text-5xl font-serif font-bold tracking-tight text-primary">
          Turn material into mastery.
        </h1>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto">
          Paste your notes, lectures, or reading material, and AI will instantly generate focused Anki flashcards for your studies.
        </p>
      </div>

      <Card className="w-full border-border/50 shadow-lg shadow-primary/5">
        <CardHeader>
          <CardTitle>Source Material</CardTitle>
          <CardDescription>Paste text or upload a document to get started.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Textarea
              placeholder="Paste your study material here..."
              className="min-h-[200px] resize-none text-base"
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={generateCards.isPending}
            />
          </div>

          <div className="flex items-center gap-4">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileUpload}
              accept=".txt,.pdf"
              disabled={generateCards.isPending}
            />
            <Button
              type="button"
              variant="outline"
              className="flex gap-2 items-center justify-center"
              onClick={() => fileInputRef.current?.click()}
              disabled={generateCards.isPending}
            >
              <UploadCloud className="h-4 w-4" />
              {fileName ? fileName : "Upload File (PDF, TXT)"}
            </Button>
          </div>

          <div className="grid md:grid-cols-2 gap-4 pt-4 border-t">
            <div className="space-y-2">
              <Label htmlFor="deckName">Deck Name</Label>
              <Input
                id="deckName"
                placeholder="e.g. Biology 101 Midterm"
                value={deckName}
                onChange={(e) => setDeckName(e.target.value)}
                disabled={generateCards.isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cardCount">Target Card Count (Optional)</Label>
              <Input
                id="cardCount"
                type="number"
                placeholder="e.g. 20"
                min="1"
                max="100"
                value={cardCount}
                onChange={(e) => setCardCount(e.target.value ? Number(e.target.value) : "")}
                disabled={generateCards.isPending}
              />
            </div>
          </div>

          <Button
            className="w-full py-6 text-lg font-medium"
            size="lg"
            onClick={handleGenerate}
            disabled={generateCards.isPending || !text.trim() || !deckName.trim()}
          >
            {generateCards.isPending ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Generating Cards...
              </>
            ) : (
              <>
                <FileText className="mr-2 h-5 w-5" />
                Generate Flashcards
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

import { useState } from "react";
import { useParams, Link } from "wouter";
import { 
  useGetDeck, 
  useListDeckCards, 
  useUpdateCard, 
  useDeleteCard, 
  getListDeckCardsQueryKey,
  getGetDeckQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card as CardUI, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Download, Trash2, Edit2, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Card } from "@workspace/api-client-react/src/generated/api.schemas";

export default function DeckDetail() {
  const { id } = useParams();
  const deckId = Number(id);
  const { data: deck, isLoading: isLoadingDeck } = useGetDeck(deckId);
  const { data: cards, isLoading: isLoadingCards } = useListDeckCards(deckId);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const updateCard = useUpdateCard();
  const deleteCard = useDeleteCard();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!deck) return;
    setIsExporting(true);
    try {
      const resp = await fetch("/api/export-apkg", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deckIds: [deckId], exportName: deck.name }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error ?? "Export failed.");
      }
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement("a"), {
        href: url,
        download: `${deck.name.replace(/[^a-z0-9_\-]/gi, "_")}.apkg`,
      });
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast({ title: "Export complete", description: `Downloaded ${deck.name}.apkg — ready to import into Anki.` });
    } catch (err) {
      toast({ title: "Export failed", description: err instanceof Error ? err.message : "Something went wrong.", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoadingDeck) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-10 w-1/3" />
        <div className="grid gap-4"><Skeleton className="h-40 w-full" /></div>
      </div>
    );
  }

  if (!deck) {
    return <div className="text-center py-20">Deck not found</div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Link href="/decks" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-2 transition-colors">
            <ArrowLeft className="mr-1 h-4 w-4" /> Back to Library
          </Link>
          <h1 className="text-3xl font-serif font-bold text-primary tracking-tight">{deck.name}</h1>
          {deck.description && <p className="text-muted-foreground mt-1">{deck.description}</p>}
        </div>
        <Button onClick={handleExport} disabled={isExporting} className="gap-2 shrink-0">
          <Download className="h-4 w-4" />
          Export for Anki
        </Button>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between border-b pb-2">
          <h2 className="text-xl font-medium tracking-tight">Cards ({cards?.length || 0})</h2>
        </div>

        {isLoadingCards ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full" />)}
          </div>
        ) : cards?.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-lg border border-dashed">
            <p className="text-muted-foreground">No cards in this deck yet.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {cards?.map((card, idx) => (
              <EditableCard 
                key={card.id} 
                card={card} 
                index={idx}
                onUpdate={(id, data) => updateCard.mutate(
                  { id, data },
                  {
                    onSuccess: () => {
                      queryClient.invalidateQueries({ queryKey: getListDeckCardsQueryKey(deckId) });
                      toast({ title: "Card updated" });
                    }
                  }
                )}
                onDelete={(id) => {
                  if (confirm("Delete this card?")) {
                    deleteCard.mutate({ id }, {
                      onSuccess: () => {
                        queryClient.invalidateQueries({ queryKey: getListDeckCardsQueryKey(deckId) });
                        queryClient.invalidateQueries({ queryKey: getGetDeckQueryKey(deckId) });
                        toast({ title: "Card deleted" });
                      }
                    });
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EditableCard({ 
  card, 
  index,
  onUpdate, 
  onDelete 
}: { 
  card: Card; 
  index: number;
  onUpdate: (id: number, data: { front: string; back: string }) => void; 
  onDelete: (id: number) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [front, setFront] = useState(card.front);
  const [back, setBack] = useState(card.back);

  const handleSave = () => {
    if (front !== card.front || back !== card.back) {
      onUpdate(card.id, { front, back });
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFront(card.front);
    setBack(card.back);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <CardUI className="border-primary/40 shadow-md ring-1 ring-primary/20">
        <CardContent className="p-4 space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Front</label>
            <Textarea 
              value={front} 
              onChange={e => setFront(e.target.value)} 
              className="min-h-[80px] font-medium"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Back</label>
            <Textarea 
              value={back} 
              onChange={e => setBack(e.target.value)} 
              className="min-h-[100px]"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={handleCancel}>
              <X className="h-4 w-4 mr-1" /> Cancel
            </Button>
            <Button size="sm" onClick={handleSave}>
              <Check className="h-4 w-4 mr-1" /> Save Changes
            </Button>
          </div>
        </CardContent>
      </CardUI>
    );
  }

  return (
    <CardUI 
      className="group hover-elevate transition-all duration-300 border-border/40 animate-in fade-in slide-in-from-bottom-2"
      style={{ animationDelay: `${index * 30}ms` }}
    >
      <CardContent className="p-0 flex flex-col sm:flex-row">
        <div className="flex-1 p-4 sm:p-5 border-b sm:border-b-0 sm:border-r border-border/40 relative">
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Front</div>
          <p className="font-medium text-foreground whitespace-pre-wrap leading-relaxed">{card.front}</p>
        </div>
        <div className="flex-1 p-4 sm:p-5 relative">
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Back</div>
          <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">{card.back}</p>
        </div>
        
        {/* Actions - visible on hover */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1 bg-background/80 backdrop-blur-sm rounded-md shadow-sm p-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => setIsEditing(true)}>
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => onDelete(card.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </CardUI>
  );
}

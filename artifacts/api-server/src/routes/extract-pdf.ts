import express, { Router, type IRouter } from "express";

const router: IRouter = Router();
const MIN_TEXT_LENGTH = 20;

function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

async function extractEmbeddedPdfText(buffer: Buffer): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength),
    disableWorker: true,
    useSystemFonts: true,
  });
  const pdf = await loadingTask.promise;
  const pageTexts: string[] = [];

  try {
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item) => ("str" in item && typeof item.str === "string" ? item.str : ""))
        .filter(Boolean)
        .join(" ");
      pageTexts.push(pageText);
      page.cleanup();
    }
  } finally {
    await pdf.destroy();
  }

  return normalizeText(pageTexts.join("\n"));
}

router.post(
  "/extract-pdf",
  express.raw({ type: ["application/pdf", "application/octet-stream"], limit: "50mb" }),
  async (req, res): Promise<void> => {
    const body = req.body;

    if (!Buffer.isBuffer(body) || body.byteLength === 0) {
      res.status(400).json({ error: "Upload a PDF file to extract text." });
      return;
    }

    try {
      const text = await extractEmbeddedPdfText(body);

      if (text.length <= MIN_TEXT_LENGTH) {
        res.status(422).json({
          error: "No embedded text found in this PDF. It may be a scanned image PDF.",
        });
        return;
      }

      res.json({ text, length: text.length });
    } catch (error) {
      req.log.error({ err: error }, "Server-side PDF extraction failed");
      res.status(422).json({
        error: error instanceof Error ? error.message : "Could not extract text from this PDF.",
      });
    }
  },
);

export default router;
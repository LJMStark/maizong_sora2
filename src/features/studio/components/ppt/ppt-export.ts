"use client";

// 四格式导出：全部在浏览器端从 finalImageUrl 组装，不占用服务器资源。
// pptxgenjs / pdf-lib / jszip 按需动态导入，避免进入首屏 bundle。

export interface ExportSlide {
  slideIndex: number;
  title: string;
  finalImageUrl: string;
  speechNotes?: string | null;
}

interface FetchedImage {
  dataUrl: string;
  bytes: Uint8Array;
  mime: string;
}

const FETCH_CONCURRENCY = 3;
// 常见浏览器 canvas 单边上限 16384px，留余量按 16000 分段
const MAX_CANVAS_HEIGHT = 16000;
const LONG_IMAGE_WIDTH = 1280;
const LONG_IMAGE_PAGE_HEIGHT = 720;

function sanitizeFilename(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, "_").slice(0, 60) || "presentation";
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

async function fetchImage(url: string): Promise<FetchedImage> {
  const attempt = async (): Promise<FetchedImage> => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`图片下载失败（${response.status}）`);
    }
    const blob = await response.blob();
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const mime = blob.type || "image/png";
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    return { dataUrl, bytes, mime };
  };

  try {
    return await attempt();
  } catch {
    return attempt();
  }
}

async function fetchAllImages(
  slides: ExportSlide[],
  onProgress?: (done: number, total: number) => void
): Promise<Map<number, FetchedImage>> {
  const results = new Map<number, FetchedImage>();
  let done = 0;
  const queue = [...slides];

  const workers = Array.from(
    { length: Math.min(FETCH_CONCURRENCY, queue.length) },
    async () => {
      while (queue.length > 0) {
        const slide = queue.shift();
        if (!slide) break;
        const image = await fetchImage(slide.finalImageUrl);
        results.set(slide.slideIndex, image);
        done += 1;
        onProgress?.(done, slides.length);
      }
    }
  );

  await Promise.all(workers);
  return results;
}

export async function exportPptx(
  slides: ExportSlide[],
  title: string,
  onProgress?: (done: number, total: number) => void
): Promise<void> {
  const [{ default: PptxGenJS }, images] = await Promise.all([
    import("pptxgenjs"),
    fetchAllImages(slides, onProgress),
  ]);

  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: "WIDE_16x9", width: 13.33, height: 7.5 });
  pptx.layout = "WIDE_16x9";
  pptx.title = title;

  for (const slide of slides) {
    const image = images.get(slide.slideIndex);
    if (!image) continue;
    const pptxSlide = pptx.addSlide();
    pptxSlide.addImage({
      data: image.dataUrl,
      x: 0,
      y: 0,
      w: 13.33,
      h: 7.5,
    });
    if (slide.speechNotes) {
      pptxSlide.addNotes(slide.speechNotes);
    }
  }

  await pptx.writeFile({ fileName: `${sanitizeFilename(title)}.pptx` });
}

export async function exportPdf(
  slides: ExportSlide[],
  title: string,
  onProgress?: (done: number, total: number) => void
): Promise<void> {
  const [{ PDFDocument }, images] = await Promise.all([
    import("pdf-lib"),
    fetchAllImages(slides, onProgress),
  ]);

  const pdf = await PDFDocument.create();
  pdf.setTitle(title);

  for (const slide of slides) {
    const image = images.get(slide.slideIndex);
    if (!image) continue;
    const embedded = image.mime.includes("jpeg")
      ? await pdf.embedJpg(image.bytes)
      : await pdf.embedPng(image.bytes);
    const page = pdf.addPage([960, 540]);
    page.drawImage(embedded, { x: 0, y: 0, width: 960, height: 540 });
  }

  const bytes = await pdf.save();
  downloadBlob(
    new Blob([bytes as unknown as BlobPart], { type: "application/pdf" }),
    `${sanitizeFilename(title)}.pdf`
  );
}

export async function exportZip(
  slides: ExportSlide[],
  title: string,
  onProgress?: (done: number, total: number) => void
): Promise<void> {
  const [{ default: JSZip }, images] = await Promise.all([
    import("jszip"),
    fetchAllImages(slides, onProgress),
  ]);

  const zip = new JSZip();
  for (const slide of slides) {
    const image = images.get(slide.slideIndex);
    if (!image) continue;
    const ext = image.mime.includes("jpeg") ? "jpg" : "png";
    const num = String(slide.slideIndex).padStart(2, "0");
    zip.file(`${num}-${sanitizeFilename(slide.title)}.${ext}`, image.bytes);
  }

  const blob = await zip.generateAsync({ type: "blob" });
  downloadBlob(blob, `${sanitizeFilename(title)}.zip`);
}

async function loadImageElement(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("图片解码失败"));
    img.src = dataUrl;
  });
}

export async function exportLongImage(
  slides: ExportSlide[],
  title: string,
  onProgress?: (done: number, total: number) => void
): Promise<void> {
  const images = await fetchAllImages(slides, onProgress);

  const pagesPerChunk = Math.floor(MAX_CANVAS_HEIGHT / LONG_IMAGE_PAGE_HEIGHT);
  const chunks: ExportSlide[][] = [];
  for (let i = 0; i < slides.length; i += pagesPerChunk) {
    chunks.push(slides.slice(i, i + pagesPerChunk));
  }

  for (let c = 0; c < chunks.length; c++) {
    const chunk = chunks[c];
    const canvas = document.createElement("canvas");
    canvas.width = LONG_IMAGE_WIDTH;
    canvas.height = chunk.length * LONG_IMAGE_PAGE_HEIGHT;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("浏览器不支持 canvas");

    for (let i = 0; i < chunk.length; i++) {
      const image = images.get(chunk[i].slideIndex);
      if (!image) continue;
      const img = await loadImageElement(image.dataUrl);
      ctx.drawImage(
        img,
        0,
        i * LONG_IMAGE_PAGE_HEIGHT,
        LONG_IMAGE_WIDTH,
        LONG_IMAGE_PAGE_HEIGHT
      );
    }

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png")
    );
    if (!blob) throw new Error("长图导出失败");
    const suffix = chunks.length > 1 ? `-${c + 1}` : "";
    downloadBlob(blob, `${sanitizeFilename(title)}-长图${suffix}.png`);
  }
}

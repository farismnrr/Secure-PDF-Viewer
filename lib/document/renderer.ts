/**
 * PDF rendering utilities - convert PDF pages to images
 */

import { createCanvas } from 'canvas';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.js';
import path from 'path';

// Fix for "No GlobalWorkerOptions.workerSrc specified" error in Node.js
// Point to the local worker file in node_modules
pdfjsLib.GlobalWorkerOptions.workerSrc = path.join(process.cwd(), 'node_modules/pdfjs-dist/legacy/build/pdf.worker.js');

// =============================================================================
// Types
// =============================================================================

interface CanvasAndContext {
    canvas: ReturnType<typeof createCanvas>;
    context: ReturnType<ReturnType<typeof createCanvas>['getContext']>;
}

export interface RenderOptions {
    scale?: number;
    format?: 'png' | 'jpeg';
}

export interface PageInfo {
    pageNumber: number;
    width: number;
    height: number;
}

// =============================================================================
// Canvas Factory
// =============================================================================

class NodeCanvasFactory {
    create(width: number, height: number) {
        const canvas = createCanvas(width, height);
        return { canvas, context: canvas.getContext('2d') };
    }

    reset(canvasAndContext: CanvasAndContext, width: number, height: number) {
        canvasAndContext.canvas.width = width;
        canvasAndContext.canvas.height = height;
    }

    destroy(canvasAndContext: CanvasAndContext) {
        (canvasAndContext as unknown as { canvas: null; context: null }).canvas = null;
        (canvasAndContext as unknown as { canvas: null; context: null }).context = null;
    }
}

// =============================================================================
// PDF Operations
// =============================================================================

/**
 * Get the number of pages in a PDF
 */
// Helper for PDF.js options
const getDocumentOptions = (data: Uint8Array) => ({
    data,
    useSystemFonts: false, // Disable system fonts to rely on standard fonts or embedded
    disableFontFace: true, // Force path rendering for text (critical for Node.js)
    CanvasFactory: NodeCanvasFactory,
    standardFontDataUrl: path.join(process.cwd(), 'node_modules/pdfjs-dist/standard_fonts/'),
    cMapUrl: path.join(process.cwd(), 'node_modules/pdfjs-dist/cmaps/'),
    cMapPacked: true,
});

/**
 * Get the number of pages in a PDF
 */
export async function getPageCount(pdfBuffer: Buffer): Promise<number> {
    const data = new Uint8Array(pdfBuffer);
    const doc = await pdfjsLib.getDocument(getDocumentOptions(data)).promise;
    const count = doc.numPages;
    doc.destroy();
    return count;
}

/**
 * Render a single page of a PDF to an image buffer
 */
export async function renderPage(
    pdfBuffer: Buffer,
    pageNumber: number,
    options: RenderOptions = {}
): Promise<Buffer> {
    const { scale = 2.0 } = options;

    const data = new Uint8Array(pdfBuffer);
    const doc = await pdfjsLib.getDocument(getDocumentOptions(data)).promise;

    if (pageNumber < 1 || pageNumber > doc.numPages) {
        doc.destroy();
        throw new Error(`Page ${pageNumber} does not exist. Document has ${doc.numPages} pages.`);
    }

    const page = await doc.getPage(pageNumber);
    const viewport = page.getViewport({ scale });

    // Node-canvas 2.x specific: create canvas with context 
    const canvas = createCanvas(viewport.width, viewport.height);
    const context = canvas.getContext('2d');

    await page.render({
        canvasContext: context,
        viewport,
    } as unknown as Parameters<typeof page.render>[0]).promise;

    const buffer = canvas.toBuffer('image/png');

    page.cleanup();
    doc.destroy();

    return buffer;
}

/**
 * Get page dimensions without rendering
 */
export async function getPageInfo(pdfBuffer: Buffer, pageNumber: number): Promise<PageInfo> {
    const data = new Uint8Array(pdfBuffer);
    const doc = await pdfjsLib.getDocument(getDocumentOptions(data)).promise;

    if (pageNumber < 1 || pageNumber > doc.numPages) {
        doc.destroy();
        throw new Error(`Page ${pageNumber} does not exist.`);
    }

    const page = await doc.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1.0 });

    const info: PageInfo = {
        pageNumber,
        width: Math.round(viewport.width),
        height: Math.round(viewport.height)
    };

    page.cleanup();
    doc.destroy();

    return info;
}

/**
 * Validate that a buffer is a valid PDF
 */
export async function isValidPdf(buffer: Buffer): Promise<boolean> {
    try {
        const data = new Uint8Array(buffer);
        const doc = await pdfjsLib.getDocument(getDocumentOptions(data)).promise;
        const valid = doc.numPages > 0;
        doc.destroy();
        return valid;
    } catch {
        return false;
    }
}

#!/usr/bin/env ts-node
/**
 * Script: Encrypt PDF and add to registry
 * Usage: npx ts-node scripts/encrypt-pdf.ts <input.pdf> <docId> [title]
 */

import fs from 'fs';
import path from 'path';
import { encryptBuffer } from '../lib/utils/crypto';
import { upsertDocument, DocumentMetadata } from '../lib/document/registry';

async function main() {
    const args = process.argv.slice(2);

    if (args.length < 2) {
        console.error('Usage: npx ts-node scripts/encrypt-pdf.ts <input.pdf> <docId> [title]');
        console.error('Example: npx ts-node scripts/encrypt-pdf.ts ./mydoc.pdf doc-001 "My Document"');
        process.exit(1);
    }

    const [inputPath, docId, title] = args;
    const docTitle = title || path.basename(inputPath, '.pdf');

    // Check master key
    const keyHex = process.env.ENCRYPTION_MASTER_KEY;
    if (!keyHex || keyHex.length !== 64) {
        console.error('Error: ENCRYPTION_MASTER_KEY must be set (64 hex chars)');
        console.error('Generate with: openssl rand -hex 32');
        process.exit(1);
    }

    const key = Buffer.from(keyHex, 'hex');

    // Read input PDF
    if (!fs.existsSync(inputPath)) {
        console.error(`Error: File not found: ${inputPath}`);
        process.exit(1);
    }

    console.log(`Reading: ${inputPath}`);
    const pdfBuffer = fs.readFileSync(inputPath);

    // Encrypt
    console.log('Encrypting...');
    const encrypted = encryptBuffer(pdfBuffer, key);

    // Save to storage
    const outputFilename = `${docId}.pdf.enc`;
    const outputPath = path.join(process.cwd(), 'storage', outputFilename);

    fs.writeFileSync(outputPath, encrypted);
    console.log(`Saved encrypted file: ${outputPath}`);

    // Update registry
    const docMetadata: DocumentMetadata = {
        docId,
        title: docTitle,
        encryptedPath: `storage/${outputFilename}`,
        contentType: 'application/pdf',
        watermarkPolicy: {
            showIp: true,
            showTimestamp: true,
            showSessionId: true
        },
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    upsertDocument(docMetadata);
    console.log(`Added to registry: ${docId} - "${docTitle}"`);

    console.log('\n✅ Done! View at: /v/' + docId);
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});

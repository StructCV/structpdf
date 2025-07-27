import { PDFDocument, PDFName, PDFDict, PDFArray, PDFRef } from 'pdf-lib';
import { STRUCTPDF_CONSTANTS, PDF_METADATA_KEYS } from './constants';

export class PDFHandler {
  constructor(private pdfDoc: PDFDocument) {}

  /**
   * Add custom metadata to PDF without overwriting existing keywords
   */
  addMetadata(key: string, value: string): void {
    // Set creator if not already set
    const creator = this.pdfDoc.getCreator();
    if (!creator) {
      this.pdfDoc.setCreator(STRUCTPDF_CONSTANTS.GENERATOR);
    }
    
    // Get existing keywords and add new one
    const existingKeywords = this.pdfDoc.getKeywords();
    const newKeyword = `${key}:${value}`;
    
    // Create new keywords array
    const updatedKeywords = existingKeywords ? [...existingKeywords, newKeyword] : [newKeyword];
    this.pdfDoc.setKeywords(updatedKeywords);
  }

  /**
   * Add StructPDF-specific metadata to PDF for fast detection
   */
  addStructPDFMetadata(domain: string, specID?: string, specName?: string): void {
    // Set creator to StructPDF if not already set
    const creator = this.pdfDoc.getCreator();
    if (!creator) {
      this.pdfDoc.setCreator(STRUCTPDF_CONSTANTS.GENERATOR);
    }
    
    // Get existing keywords
    const existingKeywords = this.pdfDoc.getKeywords();
    const newKeywords: string[] = [];
    
    // Add StructPDF indicator
    newKeywords.push('StructPDF:true');
    newKeywords.push(`StructPDF-Domain:${domain}`);
    
    // Add optional spec information
    if (specID) {
      newKeywords.push(`StructPDF-SpecID:${specID}`);
    }
    if (specName) {
      newKeywords.push(`StructPDF-SpecName:${specName}`);
    }
    
    // Merge with existing keywords
    const updatedKeywords = existingKeywords ? [...existingKeywords, ...newKeywords] : newKeywords;
    this.pdfDoc.setKeywords(updatedKeywords);
  }

  /**
   * Check if PDF has StructPDF metadata for fast detection
   */
  hasStructPDFMetadata(): boolean {
    const keywords = this.pdfDoc.getKeywords();
    if (!keywords) return false;
    
    return keywords.split(' ').some((keyword: string) => keyword.startsWith('StructPDF:true'));
  }

  /**
   * Get embedded files from PDF
   */
  getEmbeddedFiles(): Map<string, Uint8Array> {
    const files = new Map<string, Uint8Array>();
    
    try {
      const catalog = this.pdfDoc.catalog;
      
      // Check if Names dictionary exists in catalog
      let namesDict: PDFDict | undefined;
      try {
        namesDict = catalog.lookup(PDFName.of('Names'), PDFDict);
      } catch {
        return files; // No Names dictionary, so no embedded files
      }
      
      if (!namesDict) return files;
      
      // Check if EmbeddedFiles dictionary exists
      let embeddedFilesDict: PDFDict | undefined;
      try {
        embeddedFilesDict = namesDict.lookup(PDFName.of('EmbeddedFiles'), PDFDict);
      } catch {
        return files; // No EmbeddedFiles dictionary
      }
      
      if (!embeddedFilesDict) return files;
      
      // Check if Names array exists
      let namesArray: PDFArray | undefined;
      try {
        namesArray = embeddedFilesDict.lookup(PDFName.of('Names'), PDFArray);
      } catch {
        return files; // No Names array
      }
      if (!namesArray) return files;
      
      for (let i = 0; i < namesArray.size(); i += 2) {
        const name = namesArray.lookup(i);
        const fileSpec = namesArray.lookup(i + 1, PDFDict);
        
        if (fileSpec) {
          const efDict = fileSpec.lookup(PDFName.of('EF'), PDFDict);
          if (efDict) {
            const fileStream = efDict.lookup(PDFName.of('F'));
            if (fileStream) {
              const data = this.pdfDoc.context.lookup(fileStream);
              if (data && 'contents' in data) {
                files.set(name?.toString() || '', data.contents as Uint8Array);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error reading embedded files:', error);
    }
    
    return files;
  }

  /**
   * Check if PDF has StructPDF data
   */
  hasStructPDFData(): boolean {
    const files = this.getEmbeddedFiles();
    return files.has(`(${STRUCTPDF_CONSTANTS.EMBEDDED_FILE_NAME})`);
  }
}
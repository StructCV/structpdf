import { PDFDocument, PDFName, PDFDict, PDFArray, PDFString, PDFRef } from 'pdf-lib';
import { STRUCTPDF_CONSTANTS } from './constants';

export class EmbeddedFileManager {
  /**
   * Embed a file in PDF
   */
  static async embedFile(
    pdfDoc: PDFDocument,
    fileName: string,
    fileData: Uint8Array,
    mimeType: string = STRUCTPDF_CONSTANTS.MIME_TYPE
  ): Promise<void> {
    // Create file stream
    const fileStream = pdfDoc.context.flateStream(fileData);
    const fileStreamRef = pdfDoc.context.register(fileStream);
    
    // Set stream dictionary
    fileStream.dict.set(PDFName.of('Type'), PDFName.of('EmbeddedFile'));
    fileStream.dict.set(PDFName.of('Subtype'), PDFName.of(mimeType));
    fileStream.dict.set(PDFName.of('Length'), pdfDoc.context.obj(fileData.length));
    
    // Create file specification
    const fileSpec = pdfDoc.context.obj({
      Type: 'Filespec',
      F: PDFString.of(fileName),
      UF: PDFString.of(fileName),
      EF: { F: fileStreamRef }
    });
    const fileSpecRef = pdfDoc.context.register(fileSpec);
    
    // Get or create Names dictionary
    const catalog = pdfDoc.catalog;
    let namesDict: PDFDict;
    try {
      namesDict = catalog.lookup(PDFName.of('Names'), PDFDict);
    } catch {
      namesDict = pdfDoc.context.obj({});
      catalog.set(PDFName.of('Names'), pdfDoc.context.register(namesDict));
    }
    
    if (!namesDict) {
      namesDict = pdfDoc.context.obj({});
      catalog.set(PDFName.of('Names'), pdfDoc.context.register(namesDict));
    }
    
    // Get or create EmbeddedFiles
    let embeddedFilesDict: PDFDict;
    try {
      embeddedFilesDict = namesDict.lookup(PDFName.of('EmbeddedFiles'), PDFDict);
    } catch {
      embeddedFilesDict = pdfDoc.context.obj({
        Names: []
      });
      namesDict.set(PDFName.of('EmbeddedFiles'), pdfDoc.context.register(embeddedFilesDict));
    }
    
    if (!embeddedFilesDict) {
      embeddedFilesDict = pdfDoc.context.obj({
        Names: []
      });
      namesDict.set(PDFName.of('EmbeddedFiles'), pdfDoc.context.register(embeddedFilesDict));
    }
    
    // Add file to names array
    let namesArray: PDFArray;
    try {
      namesArray = embeddedFilesDict.lookup(PDFName.of('Names'), PDFArray);
    } catch {
      namesArray = pdfDoc.context.obj([]);
    }
    
    if (!namesArray) {
      namesArray = pdfDoc.context.obj([]);
    }
    
    // Remove existing file with same name if it exists
    const newNamesArray = [];
    for (let i = 0; i < namesArray.size(); i += 2) {
      const existingName = namesArray.lookup(i);
      if (existingName?.toString() !== `(${fileName})`) {
        newNamesArray.push(namesArray.lookup(i));
        newNamesArray.push(namesArray.lookup(i + 1));
      }
    }
    
    // Add new file
    newNamesArray.push(PDFString.of(fileName));
    newNamesArray.push(fileSpecRef);
    
    embeddedFilesDict.set(PDFName.of('Names'), pdfDoc.context.obj(newNamesArray));
  }

  /**
   * Remove embedded file
   */
  static removeFile(pdfDoc: PDFDocument, fileName: string): boolean {
    try {
      const catalog = pdfDoc.catalog;
      
      let namesDict: PDFDict | undefined;
      try {
        namesDict = catalog.lookup(PDFName.of('Names'), PDFDict);
      } catch {
        return false;
      }
      if (!namesDict) return false;
      
      let embeddedFilesDict: PDFDict | undefined;
      try {
        embeddedFilesDict = namesDict.lookup(PDFName.of('EmbeddedFiles'), PDFDict);
      } catch {
        return false;
      }
      if (!embeddedFilesDict) return false;
      
      let namesArray: PDFArray | undefined;
      try {
        namesArray = embeddedFilesDict.lookup(PDFName.of('Names'), PDFArray);
      } catch {
        return false;
      }
      if (!namesArray) return false;
      
      const newNamesArray = [];
      let removed = false;
      
      for (let i = 0; i < namesArray.size(); i += 2) {
        const name = namesArray.lookup(i);
        if (name?.toString() !== `(${fileName})`) {
          newNamesArray.push(namesArray.lookup(i));
          newNamesArray.push(namesArray.lookup(i + 1));
        } else {
          removed = true;
        }
      }
      
      if (removed) {
        embeddedFilesDict.set(PDFName.of('Names'), pdfDoc.context.obj(newNamesArray));
      }
      
      return removed;
    } catch (error) {
      return false;
    }
  }
}
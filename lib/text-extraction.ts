import { parse } from 'papaparse';

/**
 * Extract text content from various file types
 */
export async function extractTextFromFile(
  fileBuffer: ArrayBuffer,
  fileType: string
): Promise<string> {
  switch (fileType) {
    case 'application/pdf':
      return extractTextFromPDF(fileBuffer);
    case 'text/plain':
      return extractTextFromTXT(fileBuffer);
    case 'text/csv':
      return extractTextFromCSV(fileBuffer);
    case 'image/jpeg':
    case 'image/png':
      return `[Image file uploaded - no text content extracted]`;
    default:
      return `[File type ${fileType} not supported for text extraction]`;
  }
}

/**
 * Extract text from PDF files
 */
async function extractTextFromPDF(fileBuffer: ArrayBuffer): Promise<string> {
  try {
    const buffer = Buffer.from(fileBuffer);
    const pdfParse = (await import('pdf-parse')).default;
    const data = await pdfParse(buffer);
    return data.text;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    return '';
  }
}

/**
 * Extract text from TXT files
 */
function extractTextFromTXT(fileBuffer: ArrayBuffer): string {
  try {
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(fileBuffer);
  } catch (error) {
    console.error('Error extracting text from TXT:', error);
    return '';
  }
}

/**
 * Extract text from CSV files
 */
function extractTextFromCSV(fileBuffer: ArrayBuffer): string {
  try {
    const decoder = new TextDecoder('utf-8');
    const csvString = decoder.decode(fileBuffer);

    const result = parse(csvString, {
      header: true,
      skipEmptyLines: true,
    });

    let textContent = '';

    // Add headers
    if (result.meta.fields && result.meta.fields.length > 0) {
      textContent += 'Headers: ' + result.meta.fields.join(', ') + '\n\n';
    }

    // Add rows in a readable format
    result.data.forEach((row: any, index: number) => {
      textContent += `Row ${index + 1}:\n`;
      Object.entries(row).forEach(([key, value]) => {
        textContent += `  ${key}: ${value}\n`;
      });
      textContent += '\n';
    });

    return textContent;
  } catch (error) {
    console.error('Error extracting text from CSV:', error);
    return '';
  }
}
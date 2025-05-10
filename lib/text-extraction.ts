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
      // For images, we might want to use OCR in a production environment
      // For now, return a placeholder indicating it's an image
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
    // This is a server-side function, so we can use pdf-parse
    // First we need to convert the ArrayBuffer to a Buffer
    const buffer = Buffer.from(fileBuffer);

    // In a production environment, we would use pdf-parse or similar
    // For the prototype, we're importing dynamically to avoid including it in the client bundle
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

    // Parse CSV to get structured data
    const result = parse(csvString, {
      header: true,
      skipEmptyLines: true,
    });

    // Convert the parsed data to a readable string format
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

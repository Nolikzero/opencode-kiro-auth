interface UnifiedImage {
  mediaType: string
  data: string
}
interface KiroImage {
  format: string
  source: {
    bytes: Uint8Array
  }
}
interface ImageConversionResult {
  images: KiroImage[]
  omitted: number
}
export declare function extractAllImages(content: any): UnifiedImage[]
export declare function convertImagesToKiroFormat(images: UnifiedImage[]): ImageConversionResult
export declare function extractTextFromParts(parts: any[]): string
export {}

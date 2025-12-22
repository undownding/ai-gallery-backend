import { Upload } from '../../upload/upload.entity'

export type AspectRatio =
  | '1:1'
  | '2:3'
  | '3:2'
  | '3:4'
  | '4:3'
  | '4:5'
  | '5:4'
  | '9:16'
  | '16:9'
  | '21:9'

export type ImageSize = '1K' | '2K' | '4K'

export type InlineContent = { text: string } | { inlineData: { mimeType: string; data: string } }

export type GeminiTask = {
  prompt: string
  aspectRatio?: AspectRatio
  imageSize?: ImageSize
  userId: string
  referenceUploadIds?: string[]
}

export type CachedTask = {
  text: string | null
  upload: Upload | null
}

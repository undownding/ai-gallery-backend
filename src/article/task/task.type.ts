import { Upload } from '../../upload/upload.entity'

export const ASPECT_RATIO_VALUES = [
  '1:1',
  '2:3',
  '3:2',
  '3:4',
  '4:3',
  '4:5',
  '5:4',
  '9:16',
  '16:9',
  '21:9'
] as const
export type AspectRatio = (typeof ASPECT_RATIO_VALUES)[number]

export const IMAGE_SIZE_VALUES = ['1K', '2K', '4K'] as const
export type ImageSize = (typeof IMAGE_SIZE_VALUES)[number]

export type InlineContent = { text: string } | { inlineData: { mimeType: string; data: string } }

export type GeminiTask = {
  prompt: string
  aspectRatio?: AspectRatio
  imageSize?: ImageSize
  userId: string
  referenceUploadIds?: string[]
}

export type CachedTask = {
  isDone: boolean
  text: string | null
  upload: Upload | null
}

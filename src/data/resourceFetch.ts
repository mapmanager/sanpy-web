import type { ResourceFetch } from '../models/traceCollection'

interface PickerWindow extends Window {
  showDirectoryPicker(options?: { id?: string; mode?: 'read' | 'readwrite' }): Promise<FileSystemDirectoryHandle>
}

export const directoryPickerSupported = (): boolean => typeof window !== 'undefined' && 'showDirectoryPicker' in window

export function pickTraceCollection(): Promise<FileSystemDirectoryHandle> {
  if (!directoryPickerSupported()) return Promise.reject(new Error('Local folders require Chrome or Edge.'))
  return (window as unknown as PickerWindow).showDirectoryPicker({ id: 'sanpy-trace-collection', mode: 'read' })
}

async function fileAt(root: FileSystemDirectoryHandle, segments: string[]): Promise<File> {
  let directory = root
  for (const segment of segments.slice(0, -1)) directory = await directory.getDirectoryHandle(segment)
  return (await directory.getFileHandle(segments.at(-1)!)).getFile()
}

export function createDirectoryFetch(root: FileSystemDirectoryHandle, base: URL): ResourceFetch {
  return async (input, init) => {
    const request = new Request(input, init)
    const url = new URL(request.url)
    const prefix = base.pathname.endsWith('/') ? base.pathname : `${base.pathname}/`
    if (url.origin !== base.origin || !url.pathname.startsWith(prefix)) return new Response('Outside collection', { status: 403 })
    const segments = url.pathname.slice(prefix.length).split('/').filter(Boolean).map(decodeURIComponent)
    if (!segments.length || segments.some((value) => value === '..' || value.includes('/'))) return new Response('Invalid path', { status: 400 })
    try {
      const file = await fileAt(root, segments)
      const range = /^bytes=(\d+)-(\d*)$/.exec(request.headers.get('range') ?? '')
      if (!range) return new Response(await file.arrayBuffer(), { status: 200 })
      const start = Number(range[1]); const end = Math.min(range[2] ? Number(range[2]) : file.size - 1, file.size - 1)
      return new Response(await file.slice(start, end + 1).arrayBuffer(), { status: 206, headers: { 'Accept-Ranges': 'bytes', 'Content-Range': `bytes ${start}-${end}/${file.size}` } })
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === 'NotFoundError') return new Response('Not found', { status: 404 })
      throw reason
    }
  }
}


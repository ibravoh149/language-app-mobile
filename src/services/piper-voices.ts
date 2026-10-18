/**
 * Downloads and unpacks Piper voices on demand (D21). Each voice is a sherpa-onnx
 * archive (~64 MB) with the model, tokens and espeak-ng data; it's fetched once,
 * unpacked into the app's documents folder and reused offline afterwards.
 */
import * as FS from '@dr.pogodin/react-native-fs';
import { extractArchive } from 'react-native-sherpa-onnx/extraction';

import { type PiperModel } from '@/constants/voices';

const RELEASE_URL = 'https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models';
const VOICES_DIR = `${FS.DocumentDirectoryPath}/voices`;

const modelDir = (model: PiperModel) => `${VOICES_DIR}/${model.id}`;
/** Written after a complete unpack, so an interrupted one is redone instead of used. */
const readyMarker = (model: PiperModel) => `${modelDir(model)}/.ready`;

export async function isVoiceDownloaded(model: PiperModel): Promise<boolean> {
  return FS.exists(readyMarker(model));
}

/** One download per voice at a time, even if several screens ask. */
const inFlight = new Map<string, Promise<string>>();

/**
 * Returns the voice's folder, downloading and unpacking it first if needed.
 * `onProgress` gets 0–100 over download (0–90) and unpacking (90–100).
 */
export function ensureVoice(model: PiperModel, onProgress?: (percent: number) => void): Promise<string> {
  const existing = inFlight.get(model.id);
  if (existing) return existing;
  const task = (async () => {
    if (await isVoiceDownloaded(model)) return modelDir(model);
    await FS.mkdir(VOICES_DIR);
    const archive = `${FS.CachesDirectoryPath}/${model.id}.tar.bz2`;
    try {
      const { promise } = FS.downloadFile({
        fromUrl: `${RELEASE_URL}/${model.id}.tar.bz2`,
        toFile: archive,
        progressInterval: 250,
        progress: ({ bytesWritten, contentLength }) => {
          if (contentLength > 0) onProgress?.(Math.min(90, (bytesWritten / contentLength) * 90));
        },
      });
      const result = await promise;
      if (result.statusCode < 200 || result.statusCode >= 300) {
        throw new Error(`Voice download failed (${result.statusCode})`);
      }
      // The archive holds a single folder named after the model, so unpack into VOICES_DIR.
      const extracted = await extractArchive({ modelId: model.id, archivePath: archive, format: 'tar.bz2' }, VOICES_DIR, {
        onProgress: ({ percent }) => onProgress?.(90 + percent / 10),
        showNotificationsEnabled: false,
      });
      if (!extracted.success) throw new Error('Voice unpack was interrupted');
      await FS.writeFile(readyMarker(model), new Date().toISOString(), 'utf8');
      onProgress?.(100);
      return modelDir(model);
    } finally {
      await FS.unlink(archive).catch(() => undefined);
    }
  })();
  inFlight.set(model.id, task);
  task.finally(() => inFlight.delete(model.id)).catch(() => undefined);
  return task;
}

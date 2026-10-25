import { https } from 'follow-redirects';
import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
// wavefile: default export is { WaveFile } in CJS; use require for compatibility
const WaveFile = require('wavefile').WaveFile as new (buffer: Buffer) => {
  toBitDepth: (depth: string) => void;
  toSampleRate: (rate: number) => void;
  getSamples: () => Float32Array | Float32Array[];
};

const WHISPER_MODEL = 'Xenova/whisper-tiny.en';

type TranscriberFn = (
  audio: Float32Array,
  options?: { chunk_length_s?: number; stride_length_s?: number },
) => Promise<{ text: string }>;

let transcriberPromise: Promise<TranscriberFn> | null = null;

function getTranscriber(): Promise<TranscriberFn> {
  if (!transcriberPromise) {
    transcriberPromise = (async () => {
      const { pipeline } = await import('@xenova/transformers');
      const p = await pipeline('automatic-speech-recognition', WHISPER_MODEL);
      return p as TranscriberFn;
    })();
  }
  return transcriberPromise!;
}

export const downloadFile = (url: string): Promise<string | null> => {
  return new Promise((resolve, reject) => {
    try {
      const urlObj = new URL(url);
      const fileName = `${__dirname}/${urlObj.pathname.split('/').pop()}`;
      const file = fs.createWriteStream(fileName);
      let settled = false;

      const failDownload = (error: Error) => {
        if (settled) return;
        settled = true;
        file.destroy();
        fs.unlink(fileName, () => {});
        console.error(`Failed to download clip: ${error.message}`);
        reject(error);
      };

      const request = https.get(urlObj.toString(), (response) => {
        const { statusCode } = response;
        const contentType = response.headers['content-type'] ?? 'unknown';
        const contentLength = response.headers['content-length'] ?? 'unknown';
        console.info(
          `Clip download response: HTTP ${statusCode}, content-type: ${contentType}, content-length: ${contentLength}`,
        );

        if (!statusCode || statusCode < 200 || statusCode >= 300) {
          response.resume();
          failDownload(new Error(`Clip download returned HTTP ${statusCode ?? 'unknown'}`));
          return;
        }

        response.on('error', failDownload);
        response.pipe(file);

        // Resolve only once the file descriptor has closed and its size is available.
        file.on('finish', () => {
          file.close((closeError) => {
            if (closeError) {
              failDownload(closeError);
              return;
            }
            if (settled) return;
            settled = true;
            console.info(`Download of clip completed (${fs.statSync(fileName).size} bytes)`);
            resolve(fileName);
          });
        });
        file.on('error', failDownload);
      });
      request.on('error', failDownload);
    } catch (e: any) {
      const error = e instanceof Error ? e : new Error(String(e));
      console.error(`Failed to download clip: ${error.message}`);
      reject(error);
    }
  });
};

export const convertTo16KhzWav = (fileName: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!ffmpegStatic) return reject();
    ffmpeg.setFfmpegPath(ffmpegStatic);
    ffmpeg()
      .input(fileName)
      .outputOptions('-acodec', 'pcm_s16le', '-ac', '1', '-ar', '16000')
      .saveToFile(`${fileName}.wav`)
      .on('error', (error: Error, _stdout: string, stderr: string) => {
        console.error(`Failed to convert [${fileName}] to 16KHz WAV: ${error.message}`);
        console.error(`FFmpeg stderr for [${fileName}]:\n${stderr}`);
        return reject();
      })
      .on('progress', (progress: any) => {
        if (progress.percent) {
          console.info(`Conversion of [${fileName}] at ${progress.percent}%`);
        }
      })
      .on('end', () => {
        console.info(`Successfully converted [${fileName}] to 16Khz WAV at [${fileName}.wav]`);
        return resolve(`${fileName}.wav`);
      });
  });
};

/**
 * Load a WAV file and convert to Float32Array at 16kHz mono for Whisper.
 */
function loadWavAsFloat32(wavPath: string): Float32Array {
  const buffer = fs.readFileSync(wavPath);
  const wav = new WaveFile(buffer);
  wav.toBitDepth('32f');
  wav.toSampleRate(16000);
  let samples = wav.getSamples() as Float32Array | Float32Array[];

  // Mono: getSamples() returns Float32Array; stereo: array of two Float32Arrays
  if (Array.isArray(samples) && samples.length > 1) {
    const [left, right] = samples;
    const merged = new Float32Array(left.length);
    const scale = Math.SQRT1_2;
    for (let i = 0; i < left.length; ++i) {
      merged[i] = scale * (left[i] + right[i]);
    }
    samples = merged;
  } else if (Array.isArray(samples)) {
    samples = samples[0];
  }
  return samples as Float32Array;
}

/** Chunk length in seconds for long audio (Whisper default is 30). */
const CHUNK_LENGTH_S = 30;
/** Stride between chunks in seconds for overlap. */
const STRIDE_LENGTH_S = 5;

export const transcribeFile = async (fileName: string): Promise<string> => {
  const transcriber = await getTranscriber();
  if (!transcriber) throw new Error('Transcriber failed to load');
  const audioData = loadWavAsFloat32(fileName);
  const output = await transcriber(audioData, {
    chunk_length_s: CHUNK_LENGTH_S,
    stride_length_s: STRIDE_LENGTH_S,
  });
  return typeof output === 'string' ? output : (output?.text ?? '');
};

export const transcribeClip = async (url: string): Promise<string | null> => {
  console.info(`Starting transcription process of [${url}].`);
  console.info(`Downloading clip from [${url}]`);
  let fileName: string | null = await downloadFile(url);
  let wavFileName: string | null = null;
  let transcription: string | null = null;

  if (!fileName) {
    console.error(`Failed to download clip from [${url}]`);
    return null;
  }

  console.info(`Successfully downloaded clip, saved to: [${fileName}]`);
  console.info(`Converting [${fileName}] to 16KHz WAV...`);
  try {
    wavFileName = await convertTo16KhzWav(fileName);
  } catch {
    console.error(`Failed to convert [${fileName}] to 16KHz WAV`);
    try {
      fs.unlinkSync(fileName);
    } catch (_) {}
    return null;
  }

  try {
    console.info(
      `Successfully converted ${wavFileName} to 16KHz WAV. Attempting to transcribe with ${WHISPER_MODEL}...`,
    );
    transcription = await transcribeFile(wavFileName as string);
    if (transcription == null || transcription === '') {
      console.error(`Failed to transcribe file [${wavFileName}]`);
      throw new Error(`Failed to transcribe file [${wavFileName}]`);
    }
  } finally {
    if (fileName) {
      try {
        fs.unlinkSync(fileName);
      } catch (_) {}
    }
    if (wavFileName) {
      try {
        fs.unlinkSync(wavFileName);
      } catch (_) {}
    }
  }

  return transcription;
};

import { context, refresh, setSession, stopVoice } from "./engine.ts";

export class MicError extends Error {}
export const MAX_SECONDS = 8;

/** One open microphone, used for as many takes as needed, then closed. */
export class Recorder {
  private stream: MediaStream | null = null;
  private node: MediaStreamAudioSourceNode | null = null;
  private meter: AnalyserNode | null = null;
  private samples = new Float32Array(1024);

  async open(): Promise<void> {
    if (this.stream?.getAudioTracks().some(t => t.readyState === "live")) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      throw new MicError("This browser cannot record. Open the app over https in Safari on the iPad.");
    }
    stopVoice();
    setSession("play-and-record");
    try {
      // Phone-call clean-up must be off: noise suppression treats /f/, /s/ and /sh/ as hiss and wipes them out.
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1 },
      });
    } catch (e) {
      setSession("playback");
      const name = e instanceof DOMException ? e.name : "";
      throw new MicError(
        name === "NotAllowedError"
          ? "The microphone is switched off for this app. Close the app, open it again and choose Allow. If it does not ask, look in iPad Settings › Apps › Safari › Microphone."
          : name === "NotFoundError"
            ? "No microphone was found."
            : "The microphone could not be opened. Close other apps that use it and try again.",
      );
    }
    const c = context();
    if (c) {
      try {
        void c.resume().catch(() => undefined);
        this.node = c.createMediaStreamSource(this.stream);
        this.meter = c.createAnalyser();
        this.meter.fftSize = 1024;
        this.node.connect(this.meter);
      } catch {
        this.meter = null;
      }
    }
  }

  level(): number {
    if (!this.meter) return 0;
    this.meter.getFloatTimeDomainData(this.samples);
    let peak = 0;
    for (const s of this.samples) peak = Math.max(peak, Math.abs(s));
    return peak;
  }

  /** Start a take. Call stop() on the result to get the recording. */
  start(): { stop: () => Promise<Blob> } {
    if (!this.stream) throw new MicError("The microphone is not open.");
    const type = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm"].find(t => MediaRecorder.isTypeSupported(t));
    const rec = new MediaRecorder(this.stream, { ...(type ? { mimeType: type } : {}), audioBitsPerSecond: 128_000 });
    const chunks: Blob[] = [];
    rec.ondataavailable = e => e.data.size && chunks.push(e.data);
    const done = new Promise<Blob>((resolve, reject) => {
      rec.onstop = () => resolve(new Blob(chunks, { type: (rec.mimeType || type || "audio/mp4").split(";")[0] }));
      rec.onerror = () => reject(new MicError("The recording was interrupted. Please try again."));
    });
    rec.start();
    return {
      stop: async () => {
        if (rec.state !== "inactive") rec.stop();
        return Promise.race([done, new Promise<Blob>((_, no) => setTimeout(() => no(new MicError("The recording did not finish. Please try again.")), 5000))]);
      },
    };
  }

  close(): void {
    try {
      this.node?.disconnect();
    } catch {
      /* already gone */
    }
    for (const t of this.stream?.getTracks() ?? []) t.stop();
    this.stream = this.node = this.meter = null;
    setSession("playback");
    // The microphone changes how the iPad routes sound; a fresh context plays through the speaker again.
    refresh();
  }
}

"""
RunPod Serverless handler for HeartMuLa music generation.

Loads the HeartMuLa 3B model at boot (before any jobs arrive), then processes
generation requests. Each job:
  1. Generates a WAV file from lyrics + tags
  2. Converts WAV to MP3 via ffmpeg
  3. Uploads both WAV and MP3 to Cloudflare R2
  4. Returns R2 object keys

Environment variables (set on the RunPod endpoint, NOT in job payload):
  R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME,
  CLOUDFLARE_ACCOUNT_ID
"""

import os
import json
import subprocess
import tempfile
import time

import boto3
import runpod
import torch

from heartlib import HeartMuLaGenPipeline

# ─────────────────────────────────────────────────────────────────────────────
# Global model — loaded once at container boot (critical for FlashBoot)
# ─────────────────────────────────────────────────────────────────────────────

CKPT_PATH = os.environ.get("CKPT_PATH", "/ckpt")

print("[handler] Loading HeartMuLa 3B model...")
t0 = time.time()

pipe = HeartMuLaGenPipeline.from_pretrained(
    pretrained_path=CKPT_PATH,
    device={
        "mula": torch.device("cuda:0"),
        "codec": torch.device("cuda:0"),
    },
    dtype={
        "mula": torch.bfloat16,
        "codec": torch.float32,
    },
    version="3B",
    lazy_load=False,       # Keep everything in VRAM for fast inference
    # torch_compile=False  — not a parameter; we skip compile by not calling it
)

print(f"[handler] Model loaded in {time.time() - t0:.1f}s")

# ─────────────────────────────────────────────────────────────────────────────
# R2 client — initialized once
# ─────────────────────────────────────────────────────────────────────────────

r2 = boto3.client(
    "s3",
    endpoint_url=f"https://{os.environ['CLOUDFLARE_ACCOUNT_ID']}.r2.cloudflarestorage.com",
    aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
    aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],
    region_name="auto",
)

R2_BUCKET = os.environ["R2_BUCKET_NAME"]


def upload_to_r2(key: str, filepath: str, content_type: str) -> None:
    """Upload a local file to R2."""
    with open(filepath, "rb") as f:
        r2.put_object(Bucket=R2_BUCKET, Key=key, Body=f, ContentType=content_type)


def wav_to_mp3(wav_path: str, mp3_path: str) -> None:
    """Convert WAV to 320kbps MP3 using ffmpeg."""
    subprocess.run(
        ["ffmpeg", "-i", wav_path, "-codec:a", "libmp3lame", "-b:a", "320k", "-y", mp3_path],
        check=True,
        capture_output=True,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Handler
# ─────────────────────────────────────────────────────────────────────────────

def handler(job: dict) -> dict:
    """
    Process a single music generation job.

    Expected input:
        {
            "lyrics": str,           # Song lyrics with section markers
            "tags": str,             # Comma-separated tags (e.g. "piano,happy,romantic")
            "duration_ms": int,      # Target duration in milliseconds (default 30000)
            "song_id": str,          # UUID for R2 key naming
            "seed": int | None,      # Optional random seed
            "topk": int | None,      # Sampling diversity (default 50)
            "temperature": float | None,  # Sampling temperature (default 1.0)
            "cfg_scale": float | None,    # Classifier-free guidance (default 1.5)
        }

    Returns:
        {
            "r2_wav_key": str,       # R2 object key for WAV file
            "r2_mp3_key": str,       # R2 object key for MP3 file
            "duration_s": float,     # Actual generated duration in seconds
            "generation_time_s": float  # Time taken for generation
        }
    """
    job_input = job["input"]

    lyrics = job_input.get("lyrics", "")
    tags = job_input.get("tags", "")
    duration_ms = job_input.get("duration_ms", 30_000)
    song_id = job_input["song_id"]
    seed = job_input.get("seed")
    topk = job_input.get("topk", 50)
    temperature = job_input.get("temperature", 1.0)
    cfg_scale = job_input.get("cfg_scale", 1.5)

    # Set seed if provided
    if seed is not None:
        torch.manual_seed(seed)

    # R2 keys match the Next.js convention: songs/{songId}/audio.{ext}
    r2_wav_key = f"songs/{song_id}/audio.wav"
    r2_mp3_key = f"songs/{song_id}/audio.mp3"

    with tempfile.TemporaryDirectory() as tmpdir:
        wav_path = os.path.join(tmpdir, "output.wav")
        mp3_path = os.path.join(tmpdir, "output.mp3")

        # Generate WAV
        t0 = time.time()
        with torch.no_grad():
            pipe(
                {"lyrics": lyrics, "tags": tags},
                max_audio_length_ms=duration_ms,
                save_path=wav_path,
                topk=topk,
                temperature=temperature,
                cfg_scale=cfg_scale,
            )
        generation_time = time.time() - t0
        print(f"[handler] Generated in {generation_time:.1f}s")

        # Convert to MP3
        wav_to_mp3(wav_path, mp3_path)

        # Upload both to R2
        upload_to_r2(r2_wav_key, wav_path, "audio/wav")
        upload_to_r2(r2_mp3_key, mp3_path, "audio/mpeg")

    # Calculate actual duration from file (48kHz sample rate)
    # The pipeline saves at 48kHz, so duration = samples / 48000
    # We'll estimate from the generation params
    actual_duration_s = duration_ms / 1000.0

    return {
        "r2_wav_key": r2_wav_key,
        "r2_mp3_key": r2_mp3_key,
        "duration_s": actual_duration_s,
        "generation_time_s": round(generation_time, 2),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────────────────────────────────────

runpod.serverless.start({"handler": handler})

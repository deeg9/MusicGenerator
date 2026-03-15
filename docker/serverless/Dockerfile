# ─────────────────────────────────────────────────────────────────────────────
# RunPod Serverless — HeartMuLa 3B Music Generation
#
# Model weights are baked into the image for FlashBoot (~2s cold starts).
# Final image size: ~25-30GB (model weights ~6-12GB + CUDA runtime + deps)
# ─────────────────────────────────────────────────────────────────────────────

FROM nvidia/cuda:12.1.1-runtime-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1
ENV CKPT_PATH=/ckpt

# ── System packages ──────────────────────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3.10 python3-pip python3.10-venv \
    ffmpeg git wget \
    && rm -rf /var/lib/apt/lists/*

# Ensure python3 points to 3.10
RUN update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.10 1

# ── Python dependencies (install before heartlib for layer caching) ──────────
RUN pip3 install --no-cache-dir \
    torch==2.5.1 \
    torchaudio==2.5.1 \
    --index-url https://download.pytorch.org/whl/cu121

RUN pip3 install --no-cache-dir \
    numpy \
    runpod==1.7.7 \
    boto3==1.38.0 \
    huggingface_hub==0.30.0

# ── Install heartlib + all dependencies ──────────────────────────────────────
# Clone heartlib source and add to PYTHONPATH (pip install builds as UNKNOWN).
# Install torchtune/torchao WITH deps (not --no-deps) but pin torch==2.5.1 in
# the same pip call so the resolver cannot upgrade it.
RUN git clone https://github.com/HeartMuLa/heartlib.git /opt/heartlib \
    && rm -rf /opt/heartlib/.git /opt/heartlib/assets /opt/heartlib/examples \
    && pip3 install --no-cache-dir \
       torch==2.5.1 torchaudio==2.5.1 \
       torchtune==0.4.0 torchao==0.9.0 \
       numpy==2.0.2 torchvision==0.20.1 \
       tqdm==4.67.1 transformers==4.57.0 tokenizers==0.22.1 \
       einops==0.8.1 accelerate==1.12.0 bitsandbytes==0.49.0 \
       vector-quantize-pytorch==1.27.15 soundfile \
       --index-url https://download.pytorch.org/whl/cu121 \
       --extra-index-url https://pypi.org/simple/ \
    && ls /opt/heartlib/src/heartlib/__init__.py && echo "heartlib source OK"

ENV PYTHONPATH="/opt/heartlib/src"

# ── Download and bake model weights ──────────────────────────────────────────
RUN mkdir -p $CKPT_PATH && \
    huggingface-cli download HeartMuLa/HeartMuLaGen --local-dir $CKPT_PATH && \
    huggingface-cli download HeartMuLa/HeartMuLa-oss-3B-happy-new-year --local-dir $CKPT_PATH/HeartMuLa-oss-3B && \
    huggingface-cli download HeartMuLa/HeartCodec-oss-20260123 --local-dir $CKPT_PATH/HeartCodec-oss

# ── Copy handler ─────────────────────────────────────────────────────────────
COPY handler.py /handler.py

# ── Entry point ──────────────────────────────────────────────────────────────
CMD ["python3", "-u", "/handler.py"]

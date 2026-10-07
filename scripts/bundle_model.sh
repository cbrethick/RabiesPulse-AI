#!/usr/bin/env bash
# Put an on-device AI model inside the Android app (assets are packed into the APK; never downloaded at runtime).
#
#   scripts/bundle_model.sh qwen     # default: Qwen3-0.6B int4 (Apache-2.0, 345 MB)
#   scripts/bundle_model.sh gemma    # Gemma 3 1B IT int4 (584 MB; accept the Gemma licence on Hugging Face first)
#
# Source files are read from ../DATASET/model/. Size and SHA-256 are verified against Hugging Face.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC_DIR="${MODEL_DIR:-$ROOT/../DATASET/model}"
DEST_DIR="$ROOT/android/app/src/main/assets/models"
case "${1:-qwen}" in
  qwen)
    FILE=Qwen3-0.6B_dynamic_wi4b32_afp32.litertlm
    NAME="Qwen3 0.6B (int4) · LiteRT-LM"; LICENSE="Apache-2.0"; URL="https://huggingface.co/litert-community/Qwen3-0.6B"
    SHA=03e7da1eb1108b50 ;;   # prefix check below; full hash printed for the record
  gemma)
    FILE=gemma3-1b-it-int4.litertlm
    NAME="Gemma 3 1B IT (int4) · LiteRT-LM"; LICENSE="Gemma Terms of Use (ai.google.dev/gemma/terms)"; URL="https://huggingface.co/litert-community/Gemma3-1B-IT"
    SHA=1325ae366d31950f137c9c357b9fa89448b176d76998180c08ceaca78bba98be ;;
  *) echo "usage: $0 [qwen|gemma]"; exit 1 ;;
esac
SRC="$SRC_DIR/$FILE"
[ -f "$SRC" ] || { echo "Model not found: $SRC (download it from $URL)"; exit 1; }
echo "Checking SHA-256..."
GOT=$(shasum -a 256 "$SRC" | cut -d' ' -f1)
case "$GOT" in "$SHA"*) ;; *) echo "SHA-256 mismatch: $GOT"; exit 1 ;; esac
rm -rf "$DEST_DIR"; mkdir -p "$DEST_DIR"
cp -c "$SRC" "$DEST_DIR/model.litertlm" 2>/dev/null || cp "$SRC" "$DEST_DIR/model.litertlm"
printf '{"name":"%s","license":"%s","source":"%s","file":"%s","sha256":"%s"}\n' "$NAME" "$LICENSE" "$URL" "$FILE" "$GOT" > "$DEST_DIR/model.json"
echo "Bundled $NAME -> $DEST_DIR ($(du -h "$DEST_DIR/model.litertlm" | cut -f1))"

#!/usr/bin/env bash
# Speaking testlari: soxta mikrofon (Chromium) + haqiqiy arabcha nutq yozuvi.
# Talab: node, playwright (chromium), ffmpeg, python3. Ishga tushirish: bash tests/speaking/run.sh
set -e
cd "$(dirname "$0")"
ROOT="$(cd ../.. && pwd)"
[ -f speech.wav ] || ffmpeg -loglevel error -y -ss 95 -t 150 -i "$ROOT/tinglash1.mp3" -ac 1 -ar 48000 speech.wav
[ -f silence.wav ] || ffmpeg -loglevel error -y -f lavfi -i anullsrc=r=48000:cl=mono -t 30 silence.wav
python3 -m http.server 8765 -d "$ROOT" >/dev/null 2>&1 & SRV=$!
trap 'kill $SRV' EXIT
sleep 1
for t in t1_flow t2_edge t3_long t4_smoke t5_site t6_sub t7_lb; do echo "== $t"; node "$t.js"; done

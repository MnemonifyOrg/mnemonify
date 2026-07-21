"""Small stdout-JSON adapter around the locally installed openai-whisper package."""

import json
import sys

import whisper


def main():
    if len(sys.argv) != 3:
        raise SystemExit("usage: transcribe.py AUDIO_PATH MODEL_NAME")
    audio_path, model_name = sys.argv[1:]
    model = whisper.load_model(model_name)
    result = model.transcribe(audio_path, fp16=False)
    segments = [
        {
            "start": float(segment["start"]),
            "end": float(segment["end"]),
            "text": segment["text"].strip(),
        }
        for segment in result.get("segments", [])
        if segment.get("text", "").strip()
    ]
    print(json.dumps({"text": result.get("text", "").strip(), "segments": segments}))


if __name__ == "__main__":
    main()

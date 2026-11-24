#!/usr/bin/env python3
"""voices.py [out.json] [--premade] : list the ElevenLabs voices on your account (name, id, gender, age, accent, description,
preview URL) to out.json (default voices_list.json). Then measure candidates' previews with
  node template/tools/run.mjs pitch.py --previews voices_list.json Will,Brian,Jessica
Needs ELEVENLABS_API_KEY in the environment, or --env-file <your .env>."""
import json, sys, urllib.request
from common import ssl_context, api_key, pop_env_file


def main():
    a = sys.argv[1:]
    env_file = pop_env_file(a)
    premade = "--premade" in a
    a = [x for x in a if x != "--premade"]
    req = urllib.request.Request("https://api.elevenlabs.io/v2/voices?page_size=100", headers={"xi-api-key": api_key(env_file)})
    d = json.load(urllib.request.urlopen(req, timeout=60, context=ssl_context()))
    out = []
    for v in d.get("voices", []):
        if premade and v.get("category") != "premade": continue
        L = v.get("labels") or {}
        out.append({"name": v["name"], "id": v["voice_id"], "category": v.get("category"), "gender": L.get("gender"), "age": L.get("age"),
                    "accent": L.get("accent"), "use": L.get("use_case") or L.get("use case"), "desc": L.get("description") or (v.get("description") or "")[:80],
                    "preview": v.get("preview_url")})
    json.dump(out, open(a[0] if a else "voices_list.json", "w"), indent=1)
    for o in out:
        print(f"{o['name'][:28]:28} {o['id']} {str(o['category']):9} {str(o['gender']):7} {str(o['age']):12} {str(o['accent']):12} {o['desc'][:50]}")


if __name__ == "__main__":
    main()

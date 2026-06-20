#!/usr/bin/env python3
"""Read edge function sources for Supabase deploy (used by agent deploy batch)."""
import json
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "supabase" / "functions"
SHARED = ROOT / "_shared"

WEBHOOKS = {
    "webhook-stripe", "webhook-make", "webhook-gocardless", "webhook-facebook-leads",
    "twilio-voice-webhook",
}

SKIP = {"_shared"}


def files_for(name: str) -> list[dict]:
    fn_dir = ROOT / name
    index = fn_dir / "index.ts"
    if not index.exists():
        return []
    out = [{"name": "index.ts", "content": index.read_text()}]
    text = index.read_text()
    if "../_shared/supabase.ts" in text:
        out.append({"name": "../_shared/supabase.ts", "content": (SHARED / "supabase.ts").read_text()})
    if "../_shared/ai.ts" in text:
        out.append({"name": "../_shared/ai.ts", "content": (SHARED / "ai.ts").read_text()})
    return out


def main():
    names = sorted(p.name for p in ROOT.iterdir() if p.is_dir() and p.name not in SKIP)
    manifest = {}
    for name in names:
        manifest[name] = {
            "verify_jwt": name not in WEBHOOKS,
            "files": files_for(name),
        }
    out_path = Path("/tmp/edge_functions_manifest.json")
    out_path.write_text(json.dumps(manifest))
    print(f"Wrote {len(names)} functions to {out_path}")
    for n in names:
        print(f"  {n} jwt={manifest[n]['verify_jwt']} files={len(manifest[n]['files'])}")


if __name__ == "__main__":
    main()

import json
import os
from typing import Any, Dict, List, Optional

from ollama import Client

import red_flags
from triage_prompt import SYSTEM_PROMPT, TRIAGE_SCHEMA

def _resolve_host() -> str:
    """
    Works out where Ollama is listening.

    PHARMACOM_OLLAMA_HOST wins, because OLLAMA_HOST is the variable Ollama itself uses
    to decide what address to BIND to. A machine set up to serve on the network has
    OLLAMA_HOST=0.0.0.0, and 0.0.0.0 is not an address a client can connect to.
    """
    raw = (os.getenv("PHARMACOM_OLLAMA_HOST") or os.getenv("OLLAMA_HOST") or "").strip()
    if not raw:
        return "http://127.0.0.1:11434"

    # "0.0.0.0" / "0.0.0.0:11434" mean "listen everywhere": connect to localhost instead
    if raw.split("://")[-1].split(":")[0] in ("0.0.0.0", "::", "*"):
        port = raw.rsplit(":", 1)[-1] if raw.count(":") and raw.rsplit(":", 1)[-1].isdigit() else "11434"
        return f"http://127.0.0.1:{port}"

    if "://" not in raw:
        raw = "http://" + raw                      # "192.168.1.5:11434" -> usable URL
    if raw.count(":") < 2:
        raw = raw.rstrip("/") + ":11434"           # no port given
    return raw


OLLAMA_HOST = _resolve_host()
MODEL = os.getenv("OLLAMA_MODEL", "gemma3:12b")
MAX_HISTORY_TURNS = 12  # keeps the context window from filling up on long chats

client = Client(host=OLLAMA_HOST, timeout=120)

# Returned when the model fails or answers with something unusable. Never green:
# if we cannot analyse the case, the user is sent to a human.
FALLBACK = {
    "triage_level": "yellow",
    "detected_symptoms": [],
    "duration": None,
    "requested_medicine": None,
    "otc_suggestion": None,
    "specialties": ["Medicină de familie"],
    "needs_more_info": False,
    "follow_up_question": None,
    "message": ("Nu am putut analiza simptomele acum. "
                "Dacă te simți rău, contactează un medic, iar pentru urgențe sună la 112."),
}


def _strip_data_uri(images: Optional[List[str]]) -> List[str]:
    """data:image/jpeg;base64,XXXX -> XXXX"""
    out = []
    for img in images or []:
        out.append(img.split(",", 1)[1] if "," in img else img)
    return out


def _content(response: Any) -> str:
    """Works whether the package returns a ChatResponse object or a plain dict."""
    try:
        return response.message.content or ""
    except AttributeError:
        return (response or {}).get("message", {}).get("content", "")


def analyze_symptoms(
    text: str,
    images: Optional[List[str]] = None,
    history: Optional[List[Dict[str, str]]] = None,
) -> Dict[str, Any]:
    """Returns the triage result as a dict, already checked by the rule layer."""

    # 1. system prompt + earlier turns + the new message
    messages: List[Dict[str, Any]] = [{"role": "system", "content": SYSTEM_PROMPT}]
    for turn in (history or [])[-MAX_HISTORY_TURNS:]:
        if turn.get("role") in ("user", "assistant") and turn.get("content"):
            # old images are not resent: they cost context and the summary already covers them
            messages.append({"role": turn["role"], "content": turn["content"]})

    user_message: Dict[str, Any] = {"role": "user", "content": text}
    cleaned = _strip_data_uri(images)
    if cleaned:
        user_message["images"] = cleaned
    messages.append(user_message)

    # 2. ask the model
    try:
        response = client.chat(
            model=MODEL,
            messages=messages,
            format=TRIAGE_SCHEMA,
            options={"num_ctx": 8192, "temperature": 0.2},
        )
        parsed = json.loads(_content(response))
        if not isinstance(parsed, dict):
            raise ValueError("model did not return an object")
    except (json.JSONDecodeError, ValueError, KeyError) as exc:
        print(f"[triage] unusable model answer: {exc}")
        parsed = dict(FALLBACK)
    except Exception as exc:  # connection refused, timeout, model missing
        print(f"[triage] ollama call failed at {OLLAMA_HOST}: {exc}")
        print("[triage] check: is `ollama serve` running, is the host right, "
              "and is the model pulled (`ollama list`)? "
              "Set PHARMACOM_OLLAMA_HOST to override.")
        return red_flags.apply(dict(FALLBACK), text)

    # 3. the rule layer always has the last word
    return red_flags.apply(parsed, text)


if __name__ == "__main__":
    for probe in [
        "Am tuse de doua zile.",
        "Am o indigestie usoara si ma doare bratul stang.",
        "Copilul meu are febra de ieri.",
    ]:
        print(probe)
        print(json.dumps(analyze_symptoms(probe), ensure_ascii=False, indent=2))
        print("-" * 60)
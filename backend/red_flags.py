"""Deterministic red-flag detection for PharmaCom.

This layer does NOT depend on the model. It runs on the raw user text and can only
ESCALATE a triage result, never lower it. The model stays as the nuance layer on top.

Text is normalised first (lower-cased, diacritics stripped), because users type
"durere in piept" as often as "durere în piept".

NOT a medical device and not exhaustive. It is a floor, not a guarantee.
"""
from __future__ import annotations

import re
import unicodedata
from typing import Iterable

LEVELS = {"green": 0, "yellow": 1, "red": 2}


def normalize(text: str) -> str:
    text = unicodedata.normalize("NFD", text or "")
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    # Romanian comma-below letters sometimes survive as separate code points
    text = text.replace("ș", "s").replace("ț", "t")
    return re.sub(r"\s+", " ", text.lower())


def _any(text: str, patterns: Iterable[str]) -> bool:
    return any(re.search(p, text) for p in patterns)


# ---------------------------------------------------------------- vocabulary
CHEST = [r"durere in piept", r"durere la piept", r"apasare in piept", r"presiune in piept",
         r"ma strange in piept", r"junghi in piept", r"ghiara in piept"]
HEART_COMPANION = [r"maxilar", r"bratul stang", r"brat stang", r"umarul stang",
                   r"transpiratii reci", r"transpir abundent", r"transpiratie rece"]
GI_MASK = [r"indigestie", r"arsuri la stomac", r"arsura la stomac", r"reflux", r"greata", r"greturi"]

HEADACHE = [r"durere de cap", r"ma doare capul", r"migrena", r"cefalee"]
THUNDERCLAP = [r"cea mai (puternica|rea|groaznica|cumplita) durere de cap",
               r"durere de cap (brusca|exploziva|fulgeratoare)", r"ca un trasnet",
               r"cea mai puternica durere din viata"]
STIFF_NECK = [r"ceafa intepenita", r"gat intepenit", r"rigiditate (la |de )?ceafa",
              r"nu[ -]?mi pot (misca|apleca) (gatul|capul)", r"intepenit de (gat|ceafa)"]

STROKE = [r"nu pot vorbi", r"vorbire greoaie", r"vorbesc greu", r"gura strâmba", r"gura stramba",
          r"fata (lasata|cazuta|amortita)", r"amorteala pe o parte", r"slabiciune pe o parte",
          r"nu[ -]?mi simt (fata|mana|piciorul)", r"jumatate de corp", r"confuzie brusca",
          r"ameteala brusca", r"vedere dubla"]

BREATHING = [r"nu pot respira", r"nu mai pot respira", r"respir greu", r"greu sa respir",
             r"dificultati de respirat", r"lipsa de aer", r"ma sufoc", r"senzatie de sufocare"]

ANAPHYLAXIS = [r"umflat(a|e)? (buzele|limba|gatul|fata)", r"mi s[ -]?a umflat (limba|gatul|buzele)",
               r"urticarie", r"soc anafilactic", r"anafilax", r"umflarea limbii", r"umflarea gatului"]

MENINGITIS_SIGNS = [r"pete .{0,20}nu dispar", r"petesii", r"eruptie .{0,20}nu dispare",
                    r"lumina ma deranjeaza", r"fotofobie", r"deranjeaza lumina"]

BLEEDING = [r"sange in (varsatur|voma|scaun)", r"vomit cu sange", r"vars cu sange",
            r"scaun negru", r"scaune negre", r"tusesc cu sange", r"tuse cu sange",
            r"sangerare abundenta", r"hemoragie", r"nu se opreste sangerarea"]

HEAD_TRAUMA = [r"lovitura la cap", r"m[ -]?am lovit la cap", r"traumatism cranian", r"cazut pe cap"]
NEURO_AFTER = [r"varsat", r"varsaturi", r"vomit", r"voma", r"ameteala", r"confuz", r"lesinat", r"pierdut cunostinta", r"nu[ -]?mi amintesc"]

SEIZURE = [r"convulsii", r"criza de epilepsie", r"a facut o criza", r"spasme generalizate"]
VISION_LOSS = [r"nu mai vad", r"am orbit", r"pierdere brusca a vederii", r"nu vad cu un ochi"]
POISONING = [r"supradoza", r"am luat prea multe (pastile|comprimate|medicamente)",
             r"intoxicat", r"otravire", r"a inghitit .{0,25}(detergent|substanta|pastile)"]
AORTIC = [r"durere (severa |puternica )?de spate", r"durere lombara severa", r"ma doare spatele tare"]
ABDOMEN = [r"durere abdominala", r"durere de burta", r"ma doare burta", r"durere in abdomen"]
FEVER = [r"febra", r"temperatura mare", r"39|40 de grade", r"frisoane"]
CONFUSION = [r"confuz", r"dezorientat", r"delireaza", r"nu stie unde e", r"aiureaza"]

PREGNANCY = [r"insarcinat", r"sarcina", r"gravida", r"alaptez", r"saptamana de sarcina"]
CHILD = [r"bebelus", r"nou[ -]?nascut", r"sugar", r"copilul meu", r"copilas", r"fiul meu",
         r"fiica mea", r"baietelul meu", r"fetita mea", r"are \d+ (luni|lunisoare)",
         r"are [1-9] ani", r"are 1[0-7] ani"]

SELF_HARM = [r"vreau sa mor", r"nu mai vreau sa traiesc", r"sa[ -]?mi fac rau", r"sinucid",
             r"sa[ -]?mi iau viata", r"ma tai", r"m[ -]?am taiat intentionat", r"sa termin cu totul"]

# Conditions that make NSAIDs (Ibuprofen, Diclofenac) unsafe -> block the suggestion
NSAID_UNSAFE = [r"ulcer", r"gastrita", r"boala de rinichi", r"insuficienta renala", r"dializa",
                r"boala de ficat", r"ciroza", r"hepatita", r"astm", r"anticoagulant",
                r"trombostop", r"sintrom", r"aspenter", r"alergie la (ibuprofen|antiinflamator)"]
NSAIDS = {"ibuprofen", "diclofenac", "diclofenac gel"}


# ---------------------------------------------------------------- rules
def detect(raw_text: str) -> dict:
    """Returns {'level', 'reasons', 'crisis'} based on keywords alone."""
    t = normalize(raw_text)
    reasons: list[str] = []
    level = "green"
    crisis = False

    def flag(name: str, lvl: str = "red") -> None:
        nonlocal level
        reasons.append(name)
        if LEVELS[lvl] > LEVELS[level]:
            level = lvl

    # --- emotional crisis gets its own branch, not generic 112 text ---
    if _any(t, SELF_HARM):
        crisis = True
        flag("criza emotionala")

    # --- cardiac ---
    if _any(t, CHEST) and _any(t, HEART_COMPANION + GI_MASK):
        flag("posibil infarct: durere in piept + simptom asociat")
    elif _any(t, GI_MASK) and _any(t, HEART_COMPANION):
        flag("posibil infarct mascat ca indigestie")
    elif _any(t, CHEST):
        flag("durere in piept")

    # --- neurological ---
    if _any(t, THUNDERCLAP):
        flag("durere de cap brusca/severa")
    if _any(t, HEADACHE) and _any(t, STIFF_NECK):
        flag("durere de cap + ceafa intepenita")
    if _any(t, STROKE):
        flag("semne neurologice de AVC")
    if _any(t, SEIZURE):
        flag("convulsii")
    if _any(t, VISION_LOSS):
        flag("pierdere brusca a vederii")

    # --- meningitis ---
    if _any(t, FEVER) and (_any(t, STIFF_NECK) or _any(t, MENINGITIS_SIGNS)):
        flag("posibila meningita")

    # --- respiratory / allergic ---
    if _any(t, BREATHING):
        flag("dificultati de respiratie")
    if _any(t, ANAPHYLAXIS):
        flag("posibila anafilaxie")

    # --- bleeding / trauma / poisoning ---
    if _any(t, BLEEDING):
        flag("sangerare semnificativa")
    if _any(t, HEAD_TRAUMA) and _any(t, NEURO_AFTER):
        flag("traumatism cranian cu simptome neurologice")
    if _any(t, POISONING):
        flag("posibila intoxicatie sau supradoza")

    # --- abdominal / sepsis ---
    if _any(t, AORTIC) and _any(t, ABDOMEN):
        flag("durere de spate + abdominala")
    if _any(t, FEVER) and _any(t, CONFUSION):
        flag("febra + confuzie")

    # --- never-green groups ---
    if _any(t, PREGNANCY):
        flag("sarcina sau alaptare", "yellow")
        if _any(t, BLEEDING + ABDOMEN):
            flag("sarcina + sangerare/durere abdominala")
    if _any(t, CHILD):
        flag("simptome la copil", "yellow")
    if _any(t, NSAID_UNSAFE):
        flag("afectiune care contraindica antiinflamatoarele", "yellow")

    return {"level": level, "reasons": reasons, "crisis": crisis}


def apply(model_result: dict, raw_text: str) -> dict:
    """Merges the model's answer with the keyword layer. Escalation only."""
    found = detect(raw_text)
    out = dict(model_result)

    model_level = out.get("triage_level") if out.get("triage_level") in LEVELS else "yellow"
    final = model_level if LEVELS[model_level] >= LEVELS[found["level"]] else found["level"]
    out["triage_level"] = final

    # audit trail: lets you show a judge exactly why a case was escalated
    out["rule_flags"] = found["reasons"]
    out["escalated_by_rules"] = LEVELS[found["level"]] > LEVELS[model_level]

    if final != "green":
        out["otc_suggestion"] = None
    if final == "red":
        out["needs_more_info"] = False
        out["follow_up_question"] = None

    # an NSAID is never suggested next to a contraindication
    suggestion = (out.get("otc_suggestion") or "").strip().lower()
    if suggestion in NSAIDS and _any(normalize(raw_text), NSAID_UNSAFE):
        out["otc_suggestion"] = None

    # a dose that slipped into the message is stripped: the model must never give numbers
    msg = out.get("message") or ""
    if re.search(r"\d+\s*(mg|ml|comprimat|pastil|tablet|pliculet|picatur)", normalize(msg)):
        out["message"] = ("Pentru doză, întreabă farmacistul sau citește prospectul. "
                          "Aceasta nu este o recomandare medicală.")

    if found["crisis"]:
        out["crisis"] = True
        out["otc_suggestion"] = None
        out["message"] = (
            "Îmi pare rău că treci prin asta și mă bucur că ai spus-o. "
            "Nu ești singur și există oameni care te pot ajuta chiar acum. "
            "Te rog sună la 112 sau la o linie de sprijin emoțional și, dacă poți, "
            "spune-i cuiva din jurul tău cum te simți."
        )
    return out

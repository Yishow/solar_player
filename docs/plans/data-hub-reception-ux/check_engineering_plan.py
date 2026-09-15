"""Offline OpenSpec/document and synthetic contract checks, NOT production tests.
Run from a checkout: python docs/plans/data-hub-reception-ux/check_engineering_plan.py
Requires jsonschema. Does not connect to MQTT, change data, or call the product.
"""
from __future__ import annotations
import copy
import hashlib
import json
import re
from datetime import datetime, timedelta, timezone
from decimal import Decimal, getcontext
from pathlib import Path
from zoneinfo import ZoneInfo
from jsonschema import Draft202012Validator, FormatChecker

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
NEW = "add-kn-engineering-mqtt-sources"
CHANGES = ["refine-data-hub-source-inspector", "redesign-data-hub-reception-workspace",
 "clarify-data-hub-connection-diagnostics", "streamline-data-hub-mapping-journey",
 "harden-data-hub-source-edit-transactions", "plan-power-mqtt-publishing-and-kn-onboarding", NEW]
IDS = ["stamping", "body", "painting", "assembly", "utility", "office", "heavy_vehicle", "ed_coating"]
NOW = datetime(2026, 9, 16, 8, tzinfo=timezone.utc)
SCHEMA = json.loads((HERE / "examples/engineering-daily-v1.schema.json").read_text(encoding="utf-8"))
VALIDATOR = Draft202012Validator(SCHEMA, format_checker=FormatChecker())
getcontext().prec = 100


def instant(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(timezone.utc)


def strict_load(text: str) -> dict:
    def pairs(items):
        result = {}
        for key, value in items:
            if key in result:
                raise ValueError("DUPLICATE_JSON_KEY")
            result[key] = value
        return result
    return json.loads(text, object_pairs_hook=pairs)


def validate(p: dict, topic: str, origin: str = "synthetic-production", approved: bool = True) -> str:
    """Only the documented daily semantic subset, with synthetic authority/calendar."""
    if len(json.dumps(p).encode()) > 65536:
        return "TOO_LARGE"
    if list(VALIDATOR.iter_errors(p)):
        return "SCHEMA"
    if origin != "offline" and p.get("exampleOnly"):
        return "EXAMPLE_ONLY"
    if not approved or p["publisherId"] not in {"example-kn-engineering", "example-replacement"}:
        return "AUTHORITY"
    if p["definitionRevision"] != 1 or p["calendarRevision"] != 1:
        return "DEFINITION"
    if topic != f"factory/guanyin/energy/daily/{p['engineeringId']}":
        return "TOPIC"
    start, end = instant(p["periodStart"]), instant(p["periodEnd"])
    local_start, local_end = start.astimezone(ZoneInfo("Asia/Taipei")), end.astimezone(ZoneInfo("Asia/Taipei"))
    if end <= start or local_start.timetz().replace(tzinfo=None).isoformat() != "00:00:00" or local_end.timetz().replace(tzinfo=None).isoformat() != "00:00:00" or local_end.date() != local_start.date() + timedelta(days=1):
        return "PERIOD"
    if p["periodStatus"] == "final" and end > NOW:
        return "FUTURE_FINAL"
    complete = p["periodStatus"] == "final" and p["coverage"] == "complete" and p["quality"] == "valid"
    if (p["dataRevision"] > 1 or not complete) and not (p.get("reason") or "").strip():
        return "REASON"
    if p["periodStatus"] == "withdrawn":
        if p["value"] is not None or p["coverage"] == "complete":
            return "WITHDRAWAL"
    elif complete and p["value"] is None:
        return "NULL_COMPLETE"
    return "OK"


def key(p):
    return (p["site"], p["engineeringId"], p["measurementKind"], instant(p["periodStart"]).isoformat(), instant(p["periodEnd"]).isoformat())


def digest(p):
    fields = ("definitionRevision", "calendarRevision", "unit", "periodStatus", "coverage", "quality", "reason")
    value = str(Decimal(p["value"]).normalize()) if p["value"] is not None else None
    return hashlib.sha256(json.dumps([key(p), value, [p[k] for k in fields]], ensure_ascii=False).encode()).hexdigest()


def usable(p):
    return p["periodStatus"] == "final" and p["coverage"] == "complete" and p["quality"] == "valid" and p["value"] is not None


class ReferenceReports:
    """In-memory specification example, not a SQLite transaction/restart test."""
    def __init__(self):
        self.heads = {}
        self.versions = {}
    def put(self, p):
        k, rev = key(p), p["dataRevision"]
        d = digest(p)
        if (k, rev) in self.versions:
            return "duplicate" if self.versions[k, rev] == d else "conflict"
        if k in self.heads and rev < self.heads[k]["dataRevision"]:
            return "older"
        self.versions[k, rev] = d
        self.heads[k] = copy.deepcopy(p)
        return "replaced"


def main():
    errors, cases = [], []
    def check(name, actual, expected):
        ok = actual == expected
        cases.append({"case": name, "passed": ok})
        if not ok:
            errors.append(f"{name}: {actual!r} != {expected!r}")
    sample = json.loads((HERE / "examples/engineering-daily-v1.json").read_text(encoding="utf-8"))
    p = {k: v for k, v in sample.items() if k != "exampleOnly"}
    topic = "factory/guanyin/energy/daily/painting"
    def packet(name, expected, patch=None, **kwargs):
        q = copy.deepcopy(p);q.update(patch or {})
        check(name, validate(q, topic, **kwargs), expected)
    packet("daily-valid", "OK")
    packet("true-zero", "OK", {"value": "0"})
    check("offline-example", validate(sample, topic, "offline"), "OK")
    check("production-example-rejected", validate(sample, topic), "EXAMPLE_ONLY")
    for name, patch in [
      ("unknown-engineering", {"engineeringId":"paint"}),
      ("wrong-site", {"site":"cl"}), ("wrong-unit", {"unit":"kW"}),
      ("unknown-version", {"schemaVersion":2}), ("negative-energy", {"value":"-1"}),
      ("numeric-instead-of-decimal", {"value":100}), ("nonfinite", {"value":"NaN"}),
      ("exponent", {"value":"1e3"}), ("precision-overflow", {"value":"1.1234567891"}),
      ("too-many-digits", {"value":"9"*65}), ("offset-free", {"periodStart":"2026-09-15T00:00:00"}),
      ("invalid-date", {"periodStart":"2026-02-30T00:00:00+08:00"}),
      ("unexpected-field", {"meterId":"fake"}), ("wrong-mode", {"mode":"cumulative-energy"})]:
        packet(name, "SCHEMA", patch)
    packet("unknown-publisher", "AUTHORITY", {"publisherId":"not-approved"})
    packet("unapproved-source", "AUTHORITY", approved=False)
    packet("definition-mismatch", "DEFINITION", {"definitionRevision":2})
    packet("calendar-mismatch", "DEFINITION", {"calendarRevision":2})
    check("wrong-topic", validate(p, topic.replace("/daily/", "/power/")), "TOPIC")
    packet("half-day", "PERIOD", {"periodStart":"2026-09-15T12:00:00+08:00"})
    packet("reversed-period", "PERIOD", {"periodStart":p["periodEnd"], "periodEnd":p["periodStart"]})
    packet("future-final", "FUTURE_FINAL", {"periodStart":"2026-09-17T00:00:00+08:00", "periodEnd":"2026-09-18T00:00:00+08:00"})
    packet("null-complete", "NULL_COMPLETE", {"value":None})
    packet("correction-without-reason", "REASON", {"dataRevision":2})
    packet("partial-with-reason", "OK", {"quality":"partial", "coverage":"partial", "reason":"synthetic missing interval"})
    packet("withdrawn-with-value", "WITHDRAWAL", {"periodStatus":"withdrawn", "coverage":"unknown", "reason":"withdraw"})
    try:
        strict_load('{"value":"100","value":"120"}')
        check("duplicate-json-key", "allowed", "rejected")
    except ValueError:
        check("duplicate-json-key", "rejected", "rejected")
    model = ReferenceReports()
    check("first-report", model.put(p), "replaced")
    for i in range(3):
        check(f"repeat-{i+1}", model.put({**p,"publishedAt":"2026-09-16T03:00:00+08:00"}), "duplicate")
    check("same-revision-conflict", model.put({**p,"value":"120.125"}), "conflict")
    v3 = {**p,"dataRevision":3,"value":"120.125","reason":"corrected"}
    check("higher-complete-snapshot", model.put(v3), "replaced")
    check("late-lower-revision", model.put({**p,"dataRevision":2,"reason":"late"}), "older")
    check("approved-sender-same-result", model.put({**v3,"publisherId":"example-replacement"}), "duplicate")
    offset = {**v3,"periodStart":"2026-09-14T16:00:00Z","periodEnd":"2026-09-15T16:00:00Z"}
    check("offset-normalized-business-key", model.put(offset), "duplicate")
    partial = {**v3,"dataRevision":4,"coverage":"partial","quality":"partial","reason":"new missing evidence"}
    check("new-partial-replaces-final", model.put(partial), "replaced")
    check("partial-is-not-usable", usable(model.heads[key(p)]), False)
    withdrawn = {**v3,"dataRevision":5,"periodStatus":"withdrawn","coverage":"unknown","value":None,"reason":"withdraw"}
    check("withdrawal-contract", validate(withdrawn,topic), "OK")
    check("withdrawal-head", model.put(withdrawn), "replaced")
    check("withdrawal-not-usable", usable(model.heads[key(p)]), False)
    check("restore-higher", model.put({**v3,"dataRevision":6,"reason":"restore"}), "replaced")
    check("daily-sum-not-counter-difference", str(Decimal("100")+Decimal("120")), "220")
    check("counter-difference", str(Decimal("1120")-Decimal("1000")), "120")
    check("large-decimal-difference", str(Decimal("9007199254740992.125")-Decimal("9007199254740992.000")), "0.125")
    check("replay-batch-bound", 31*8, 248)
    reg = json.loads((HERE/"tag-register.json").read_text(encoding="utf-8"))
    check("eight-known-engineerings", [e["engineeringId"] for e in reg["knReservedTags"]], IDS)
    check("all-engineering-contracts-unconfirmed", all(not e["enabled"] and e["mode"] is None and e["publisherId"] is None for e in reg["knReservedTags"]), True)
    check("cl-raw-preserved-count", len(reg["clRawCandidates"]), 20)
    check("cl-virtual-preserved-count", len(reg["clVirtualCandidates"]), 10)
    reqs, scenarios, files, counts = set(), set(), [], {}
    for name in CHANGES:
        folder=ROOT/"openspec/changes"/name
        for f in ("proposal.md","design.md","tasks.md",".openspec.yaml"):
            if not (folder/f).exists():errors.append(f"Missing {name}/{f}")
        tasks=(folder/"tasks.md").read_text(encoding="utf-8")
        entries=re.findall(r'^- \[([ xX])\] (\d+\.\d+) (.+)$',tasks,re.M)
        counts[name]=len(entries)
        if any(mark!=' ' for mark,_,_ in entries):errors.append(f"Checked implementation task: {name}")
        ids={i for _,i,_ in entries}
        if len(ids)!=len(entries):errors.append(f"Duplicate task IDs: {name}")
        edges={}
        for _,i,body in entries:
            match=re.search(r'\[after: ([^\]]+)\]',body)
            deps=[d.strip() for d in match[1].split(',')] if match else []
            if any(d not in ids for d in deps):errors.append(f"Missing dependency: {name}/{i}")
            edges[i]=deps
        def walk(i, trail):
            if i in trail:raise ValueError(f"Cycle {name}/{i}")
            for d in edges.get(i,[]):walk(d,trail|{i})
        for i in ids:walk(i,set())
        specfiles=list(folder.glob("specs/*/spec.md"))
        if not specfiles:errors.append(f"No specs: {name}")
        for f in specfiles:
            text=f.read_text(encoding="utf-8")
            for kind,seen in [("requirement",reqs),("scenario",scenarios)]:
                for identifier in re.findall(r'<!-- '+kind+r'-id: (\S+) -->',text):
                    if identifier in seen:errors.append(f"Duplicate {identifier}")
                    seen.add(identifier)
            for block in text.split('### Requirement: ')[1:]:
                if not re.search(r'\b(SHALL|MUST)\b',block) or '#### Scenario:' not in block:errors.append(f"Invalid requirement {f}")
            for block in text.split('#### Scenario: ')[1:]:
                if not all('**'+s+'**' in block for s in ['GIVEN','WHEN','THEN']):errors.append(f"Incomplete scenario {f}")
        files+=list(folder.rglob('*.md'))
    files+=list(HERE.rglob('*.md'))
    links=0
    for f in files:
        text=f.read_text(encoding="utf-8")
        if any(l.rstrip()!=l for l in text.splitlines()):errors.append(f"Whitespace {f}")
        if re.search(r'(?m)^(<<<<<<<|=======|>>>>>>>)',text):errors.append(f"Merge conflict {f}")
        for url in re.findall(r'\[[^\]]*\]\(([^)]+)\)',text):
            if '://' in url or url.startswith('#'):continue
            links+=1
            if not (f.parent/url.split('#')[0]).resolve().exists():errors.append(f"Broken link {f.name}: {url}")
    result={"scope":"offline artifact and synthetic daily-contract reference checks only",
      "baselineCommit":"818fa0da0d24d26ce9f847a5fdf6a9871c57bc0f","reviewedCommit":"8beacbd4ce50c393079308b17a2008835e7f8f24",
      "changes":len(CHANGES),"requirements":len(reqs),"scenarios":len(scenarios),"pendingTasks":counts,"pendingTaskTotal":sum(counts.values()),
      "relativeLinksChecked":links,"syntheticChecks":len(cases),"passed":sum(c['passed'] for c in cases),"cases":cases,"errors":errors,
      "notRun":["Spectra/OpenSpec official validation (spectra exit 127)","product tests/pnpm verify","SQLite crash or concurrency tests","MQTT/DDE/field tests","actual publisher payload acceptance"]}
    print(json.dumps(result,ensure_ascii=False,indent=2))
    if errors:raise SystemExit(1)
if __name__=="__main__":main()

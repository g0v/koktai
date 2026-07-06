#!/usr/bin/env python3
"""Walk dist HTML; resolve href/src relative to each page (prefix-agnostic dist)."""

from __future__ import annotations

import argparse
import re
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlparse, unquote

FAKE_ORIGIN = "https://example.test"
URL_ATTRS = ("href", "src", "poster", "data", "content")


class LinkCollector(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.links: list[tuple[str, str, str]] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        ad = {k: (v or "") for k, v in attrs}
        for attr in URL_ATTRS:
            if attr not in ad:
                continue
            raw = ad[attr].strip()
            if attr == "content" and ad.get("rel", "").lower() not in (
                "icon",
                "apple-touch-icon",
                "manifest",
            ):
                continue
            if attr == "srcset":
                for part in raw.split(","):
                    url = part.strip().split(None, 1)[0] if part.strip() else ""
                    if url:
                        self.links.append(("srcset", url, tag))
            else:
                self.links.append((attr, raw, tag))


def page_base_url(rel_html: str) -> str:
    """Browser document URL for a built HTML file (site at origin root)."""
    rel = rel_html.replace("\\", "/")
    if rel == "index.html":
        return f"{FAKE_ORIGIN}/index.html"
    if rel.endswith("/index.html"):
        dir_part = rel[: -len("index.html")]
        return f"{FAKE_ORIGIN}/{dir_part}index.html"
    return f"{FAKE_ORIGIN}/{rel}"


def skip_url(raw: str) -> bool:
    if not raw or raw.startswith("#"):
        return True
    low = raw.strip().lower()
    if low.startswith(("mailto:", "tel:", "javascript:", "data:", "blob:")):
        return True
    if low.startswith("//"):
        return True
    if low.startswith("http://") or low.startswith("https://"):
        return True
    return False


def resolve_url(base_url: str, raw: str) -> str:
    joined = urljoin(base_url, raw)
    parsed = urlparse(joined)
    return unquote(parsed.path)


def path_to_dist_file(dist: Path, url_path: str) -> tuple[str, Path | None]:
    """Map resolved absolute pathname to dist file."""
    if not url_path.startswith("/"):
        return ("relative_leak", None)
    rel = url_path.lstrip("/")
    if not rel:
        rel = "index.html"
    candidate = dist / rel
    if candidate.is_dir():
        candidate = candidate / "index.html"
    if not candidate.is_file() and not rel.endswith(
        (".html", ".json", ".js", ".css", ".svg", ".png", ".woff2", ".woff", ".ico")
    ):
        alt = dist / rel / "index.html"
        if alt.is_file():
            candidate = alt
    return ("ok", candidate)


def load_ids(html: str) -> set[str]:
    return set(re.findall(r'\bid="([^"]+)"', html))


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("dist", type=Path, nargs="?", default=Path("dist"))
    args = ap.parse_args()
    dist = args.dist.resolve()
    if not dist.is_dir():
        print(f"dist not found: {dist}", file=sys.stderr)
        return 2

    html_files = sorted(
        p
        for p in dist.rglob("*.html")
        if not p.relative_to(dist).as_posix().startswith("sections/")
    )
    issues: list[str] = []
    attr_count = 0

    for html_path in html_files:
        rel = html_path.relative_to(dist).as_posix()
        base = page_base_url(rel)
        text = html_path.read_text(encoding="utf-8", errors="replace")
        collector = LinkCollector()
        try:
            collector.feed(text)
        except Exception as e:
            issues.append(f"{rel}: HTML parse error: {e}")
            continue

        for attr, raw, tag in collector.links:
            if skip_url(raw):
                continue
            attr_count += 1
            resolved = resolve_url(base, raw)
            status, fs_path = path_to_dist_file(dist, resolved)
            if status == "wrong_mount":
                issues.append(
                    f"{rel}: {attr}={raw!r} → absolute path {resolved!r} (expected site-relative)"
                )
                continue
            if status == "relative_leak":
                issues.append(f"{rel}: {attr}={raw!r} → unresolved path {resolved!r}")
                continue
            if fs_path is None or not fs_path.is_file():
                issues.append(
                    f"{rel}: {attr}={raw!r} → {resolved!r} missing on disk ({fs_path})"
                )

    for html_path in html_files:
        rel = html_path.relative_to(dist).as_posix()
        text = html_path.read_text(encoding="utf-8", errors="replace")
        ids = load_ids(text)
        for m in re.finditer(r'<a\s[^>]*\bhref="([^"]+)"', text, re.I):
            href = m[1]
            if not href.startswith("#"):
                continue
            anchor = href[1:]
            if re.match(r"^[wc]-\d+$", anchor) and anchor not in ids:
                issues.append(f"{rel}: fragment {href!r} missing id on page")

    unique = sorted(set(issues))
    print(f"pages={len(html_files)} attrs_checked≈{attr_count} issues={len(unique)}")
    for line in unique[:200]:
        print(line)
    if len(unique) > 200:
        print(f"... and {len(unique) - 200} more")
    return 1 if unique else 0

if __name__ == "__main__":
    raise SystemExit(main())

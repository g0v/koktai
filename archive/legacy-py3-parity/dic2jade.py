# -*- coding: utf8 -*-
"""Py3 port of a-tsioh_sandbox/dic2jade.py for parity oracle runs."""
import sys
import fileinput

import analyse_chapter
import analyse_word_entry


def process_buffer(buf, list_of_results, inside):
    if inside == "chapter":
        entry = analyse_chapter.parse_one("".join(buf))
        if entry:
            list_of_results.append({"entry": entry["entry"], "chapter": entry})
        else:
            print("unanalyzed chapter", "".join(buf))
    elif inside == "word":
        entry = analyse_word_entry.parse_one("".join(buf))
        if entry:
            if (
                len(list_of_results) > 0
                and list_of_results[-1]["entry"] == entry["entry"]
            ):
                list_of_results[-1]["heteronyms"].append(entry)
            else:
                list_of_results.append(
                    {"entry": entry["entry"], "heteronyms": [entry]}
                )
        else:
            print("unanalyzed word", "".join(buf))
    else:
        print("unanalyzed", "".join(buf))


def print_results(list_of_results):
    chunks: list[str] = []
    for entry in list_of_results:
        if "chapter" in entry:
            chunks.append(analyse_chapter.html_of_entry(entry["chapter"]))
        else:
            for h in entry["heteronyms"]:
                chunks.append(analyse_word_entry.html_of_entry(h))
    print("\n\n".join(c.lstrip("\n").rstrip() for c in chunks), end="")


def main():
    # Match committed: one blank line after `body` + indented spacer line
    print(
        """doctype html
html
  head 
    meta(charset='utf8')
  body
    

""",
        end="",
    )
    lor = []
    i = 0
    buf = []
    inside = None
    for line in fileinput.input():
        i += 1
        try:
            line = (line if isinstance(line, str) else line.decode("utf8")).strip()
            if line.startswith(".章首"):
                if len(buf) > 0:
                    process_buffer(buf, lor, inside)
                buf = []
                inside = "chapter"
            elif line.startswith("~t96;"):
                if len(buf) > 0:
                    process_buffer(buf, lor, inside)
                buf = [line]
                inside = "word"
            elif line.startswith(".本文"):
                if len(buf) > 0:
                    process_buffer(buf, lor, inside)
                buf = []
                inside = None
            elif inside:
                buf.append(line)
        except UnicodeDecodeError:
            print("encoding error on line", i, file=sys.stderr)
    if len(buf) > 0:
        process_buffer(buf, lor, inside)
    print_results(lor)


if __name__ == "__main__":
    main()
#!/usr/bin/env python3
"""Drive `npm run db:push:inner` under a PTY; auto-accept drizzle create prompts.

Drizzle-kit uses hanji select prompts (create vs rename). Those need a real TTY
and Enter on the first option ("create"). Spamming stdin keypress events from
Node aborts them — use this wrapper on VPS / non-interactive shells instead.
"""
from __future__ import annotations

import errno
import os
import pty
import re
import select
import sys
import time

PROMPT_RE = re.compile(
    br"created or renamed|Accept warnings|DATA LOSS|confirm",
    re.I,
)
ANSI_RE = re.compile(br"\x1b\[[0-9;]*[a-zA-Z]|\x1b\].*?\x07|\x1b\([B0]")


def main() -> int:
    cmd = [
        "npm",
        "run",
        "db:push:inner",
        *sys.argv[1:],
    ]
    pid, fd = pty.fork()
    if pid == 0:
        os.execvp(cmd[0], cmd)

    buf = b""
    last_enter = 0.0
    enters = 0
    deadline = time.time() + 600

    while True:
        if time.time() > deadline:
            print("\nTIMEOUT waiting for db:push", file=sys.stderr)
            try:
                os.kill(pid, 9)
            except ProcessLookupError:
                pass
            return 1

        ready, _, _ = select.select([fd], [], [], 0.3)
        if fd in ready:
            try:
                chunk = os.read(fd, 8192)
            except OSError as err:
                if err.errno == errno.EIO:
                    break
                raise
            if not chunk:
                break
            sys.stdout.buffer.write(chunk)
            sys.stdout.buffer.flush()
            buf += chunk
            if len(buf) > 20000:
                buf = buf[-10000:]
            plain = ANSI_RE.sub(b"", buf)
            now = time.time()
            if PROMPT_RE.search(plain) and now - last_enter > 0.35:
                os.write(fd, b"\r")
                last_enter = now
                enters += 1
                buf = b""
        elif enters > 0 and time.time() - last_enter > 1.5 and enters < 2000:
            try:
                os.write(fd, b"\r")
                last_enter = time.time()
                enters += 1
            except OSError:
                break

    _, status = os.waitpid(pid, 0)
    return os.waitstatus_to_exitcode(status)


if __name__ == "__main__":
    raise SystemExit(main())

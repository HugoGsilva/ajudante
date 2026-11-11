#!/bin/sh
set -u
LOG=/tmp/boot.log
: > "$LOG"

cd /app/packages/db
echo "migrate" >> "$LOG"
bunx drizzle-kit migrate >> "$LOG" 2>&1
echo "migrate exit $?" >> "$LOG"

cd /app/apps/server
echo "server" >> "$LOG"
bun src/index.ts >> "$LOG" 2>&1 &
child=$!

i=0
while [ "$i" -lt 20 ]; do
  if bun -e 'const r = await fetch("http://127.0.0.1:" + (process.env.PORT || 3000) + "/"); process.exit(r.ok ? 0 : 1)'; then
    wait "$child"
    exit $?
  fi
  if ! kill -0 "$child" 2>/dev/null; then
    echo "server exited" >> "$LOG"
    break
  fi
  i=$((i + 1))
  sleep 1
done

echo "serving boot log" >> "$LOG"
exec bun -e 'Bun.serve({port:Number(process.env.PORT||3000),hostname:"0.0.0.0",fetch(){return new Response(Bun.file("/tmp/boot.log"))}})'

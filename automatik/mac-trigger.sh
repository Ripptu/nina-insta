#!/bin/bash
# Stößt die Veröffentlichung in GitHub an, sobald ein Beitrag fällig ist. Ersetzt den unzuverlässigen GitHub-Zeitplan.
# Läuft alle 5 Minuten per launchd (de.vamela.nina-insta-trigger). Entscheidet lokal per Trockenlauf, ob etwas fällig ist.
export PATH="/Users/test/.local/node/bin:/Users/test/.local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
cd "$HOME/NINA/Insta-Trigger" || exit 1
LOG="$HOME/NINA/Insta-Trigger/trigger.log"
LOCK="$HOME/NINA/Insta-Trigger/.letzter-start"
stamp() { date '+%Y-%m-%d %H:%M:%S'; }
if [ -z "$TRIGGER_TEST" ] && [ -f "$LOCK" ] && [ $(( $(date +%s) - $(cat "$LOCK") )) -lt 480 ]; then exit 0; fi
git fetch -q --depth 1 origin main 2>>"$LOG" && git reset -q --hard origin/main 2>>"$LOG" || { echo "$(stamp) git fehlgeschlagen" >>"$LOG"; exit 1; }
if [ -n "$TRIGGER_TEST" ]; then OUT=$(NUR_PLAN=1 node automatik/publish.mjs --trocken --jetzt 2>&1); TROCKEN=true; else OUT=$(NUR_PLAN=1 node automatik/publish.mjs --trocken 2>&1); TROCKEN=false; fi
if echo "$OUT" | grep -q "\[trocken\] Veröffentliche"; then
  WAS=$(echo "$OUT" | grep "\[trocken\] Veröffentliche" | head -2 | sed 's/.*Veröffentliche //' | tr '\n' ';')
  if gh workflow run veroeffentlichen.yml -R Ripptu/nina-insta -f trocken=$TROCKEN >>"$LOG" 2>&1; then
    [ -z "$TRIGGER_TEST" ] && date +%s >"$LOCK"
    echo "$(stamp) Lauf gestartet (trocken=$TROCKEN): $WAS" >>"$LOG"
  else
    echo "$(stamp) Start fehlgeschlagen: $WAS" >>"$LOG"
  fi
fi
# Protokoll klein halten
[ "$(wc -l <"$LOG" 2>/dev/null || echo 0)" -gt 500 ] && tail -200 "$LOG" >"$LOG.tmp" && mv "$LOG.tmp" "$LOG"
exit 0

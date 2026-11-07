output: thread.json
channel: teams
date: 2026-11-05

Speakers: Veikko Vikkelä (Field Engineer), Erkki Expert (Network Expert). 6 to 8 messages, Teams.
Device: transmission node TRN-063 at site OULU-11 (a TX-250 installed 2018).
- Veikko: swapped the SFP on TRN-063, link is up, optics ok, but the counters are zero, no traffic.
- Erkki: same thing as on the older units, don't swap the optic again and don't reboot it; just do a shut / no shut on the port.
- Veikko: "did a shut / no shut on the port, came back" (traffic flowing, counters going up).
- Erkki: good, so the TX-250s of that age do it too.
Trap: same fix as Erkki's original "disable the interface, wait, enable it", but in different words ("shut / no shut"). Use the words "shut / no shut". Outcome confirmed.

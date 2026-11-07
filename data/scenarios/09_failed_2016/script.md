output: thread.json
channel: teams
date: 2026-11-06

Speakers: Timo Laine (Field Engineer), Erkki Expert (Network Expert). 7 to 9 messages, Teams.
Device: transmission node TRN-019 at site OULU-03 (an old TX-200 from 2016).
- Timo: replaced the SFP on TRN-019, link is up, optics normal, counters stay at zero.
- Erkki: that's the old-unit thing: disable the interface, wait a little, enable it again, don't reboot.
- Timo: tried the bounce. "didn't help, had to reboot in the end".
- Erkki: hm, so it doesn't work on that one, odd. He is surprised.
Trap: the bounce fix was tried and FAILED on this unit; the reboot fixed it. Make the failure explicit.

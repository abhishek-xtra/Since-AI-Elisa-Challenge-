output: thread.json
channel: teams
date: 2026-11-06

Speakers: Veikko Vikkelä (Field Engineer), Erkki Expert (Network Expert). 8 to 10 messages, Teams.
Subject: a fault on transmission node TRN-087 at site OULU-11.
- Veikko: replaced the SFP on TRN-087, link is up, optical levels (RX power) look normal, but the traffic counters stay at zero.
- Early on, in passing, Veikko adds: "by the way TRN-034 had a dispatch last week too, different thing" (TRN-034 is NOT the subject; nobody discusses it further).
- Erkki states the reusable rule clearly about TRN-087's symptoms: when the link is up and optics are normal after an SFP change but counters stay at zero, disable the interface, wait a bit, enable it again; don't reboot the unit and don't swap the SFP again.
- Veikko does it on TRN-087 and confirms: traffic is back.
Trap: TRN-034 is mentioned only in passing and must not look like the subject. Mention TRN-087 by ID at least twice.

# The demo video

`elisa_demo.mp4` is the final cut: 2:03, 1920x1080, 30 fps, H.264 and AAC, 27 MB. Script, what each scene draws on, and the numbers screen checked against the repo: `docs/VIDEO.md`.

The rest of this folder is the HyperFrames project that renders it, made in the HyperFrames Desktop app (HyperFrames 0.9.19). The Teams scenes (`compositions/hook.html`, `capture.html`, `ask.html`, `recall.html`) draw the Teams window from the repo's `ui/` with its reveal timings; the tree scenes (`merge.html`, `scopes.html`, `honed.html`, `stay-true.html`) use the geometry, words and motion of `frontend-ui/src/tree/`. Every chat line, agent sentence, scope label and reason is copied from `out/` and Elisa's example data. Scene order and timing are in `index.html` and `compositions/film.json`.

## Rebuild

Node.js required. From this folder:

```powershell
npx --yes hyperframes@0.9.19 check
npx --yes hyperframes@0.9.19 render
```

`npx --yes hyperframes@0.9.19 preview` opens the live editor. The output lands in `renders/` (git-ignored).

## Media

All voice is recorded; no text-to-speech.

| File | What it is |
|---|---|
| `Abhishek voiceover.m4a`, `The other guesses are dropped.m4a` | Abhishek's narration (0:00 to 1:04) |
| `Money voiceover.m4a`, `Recording (4).m4a` | narration from 1:06, the numbers and "Capture. Bind. Recall." |
| `Kaistisenkatu 2 (levelled).m4a`, `Kaistisenkatu 3 (levelled).m4a` | the on-camera sound, Abhishek (0:07) and Mikael (1:30), raised 19 dB and 16 dB with a limiter |
| `Abhishek takes cutout.webm`, `Mikael takes cutout.webm` | the on-camera takes, cut and background-removed; the phone originals are not needed |
| `Chrysalism.mp3` | music |
| `Keyboard Typing Tapping.mp3`, `Soft UI Button Click.mp3`, `Mouse click sounds.mp3`, `Pop High A H1.mp3`, `Pop Low A H1.mp3`, `Chime Notification.mp3`, `Notification Sound.mp3`, `Boom_01.mp3` | sound effects |

Credits: `assets/sfx/CREDITS.md`. The two Pop sounds are by InspectorJ, CC BY 4.0, and must be credited wherever the video is published.

# How Pipsized Studio was built

A log of one long Claude Code session (10–11 Nov 2026), from "what's this toolkit?" to a channel pipeline.

1. **Tried an existing toolkit.** Cloned an open-source Claude Code video toolkit and rendered its hello-world: it
   works, but it leans on cloud GPUs (Modal needs a payment method) and AI voiceover.
2. **Silent maths videos.** Built Remotion projects by hand: a Pythagoras rearrangement proof
   (`examples/pythagoras-proof`) and a unit circle. Lesson: always check stills, since the first draft had bugs you
   only see in the picture.
3. **A first dashboard.** A local web page that queues jobs and runs `claude -p` headless, streaming its progress.
   The first test (a silent "area of a circle" proof) went from idea to video in 5 minutes. The headless CLI needs
   its own login.
4. **The What If skill.** Used an installed skill to script, voice (ElevenLabs) and storyboard a 2D episode about
   teleporting. Its hooded mascot became **Pip**. Lessons: restricted ElevenLabs keys need explicit permissions; keys
   go in `.env`, never in chat.
5. **Pip in 3D.** Rebuilt Pip in three.js with cel shading and ink outlines (`src/kit.tsx`) and made a "Day N" Short
   (`examples/everyone-obese-dayN`). Lessons: 9:16 is narrow, so pull cameras back and keep subjects below the
   captions; light warmer and brighter than feels natural; software WebGL is ~25 min per Short, a gaming GPU ~40 s.
6. **The scale format.** From a reference of viral 3D scale comparisons: blue grid studio, huge numbers, a
   deadpan narrator, a fade to dark. Cuts are cued on the narrator's words, so the voice is the clock. Every number
   is worked out and sourced.
7. **Feedback from the first upload** (it reached a few hundred views): add a funny **hook** first, put the big
   numbers **horizontal in the middle** instead of tilted, drop the off-topic meme line, add **whooshes and pops**
   on every switch, and make captions bold and word-by-word. All of that is now the template and `docs/FORMAT.md`.
8. **Split work across two PCs.** The slow PC (and Claude) makes the projects; the fast PC renders them all with
   one double-click (`batch/RENDER-ALL.bat`). The dashboard's **Download batch** button zips everything waiting.
9. **The first hands-off Short.** One line typed into the dashboard (*"What if all 8 billion people on Earth stood
   shoulder to shoulder in one place?"*) produced a complete project with no help: a hook (*"Everyone you've ever met
   is standing on your foot."*), sourced numbers (2,000 km², smaller than Tokyo; 70 Great Pyramids of weight; an
   hour-long Mexican wave) and a punchline (*"Everyone left the oven on."*), for 593 ElevenLabs credits.
   It's in `examples/8-billion-shoulder-to-shoulder`.
10. **Brand.** Channel name *Pipsized* (bite-sized, with Pip), and a cute avatar rendered from the same 3D kit
   (`src/Avatar.tsx` → `brand/`).

## What we'd do next

- More examples in the template library (each new good Short becomes a reference for the next).
- A thumbnail/cover frame per Short, and a title and description written with it.
- Measure retention per hook and keep the hooks that hold viewers.

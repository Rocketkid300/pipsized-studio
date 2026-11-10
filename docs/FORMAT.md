# The Pipsized format

The recipe every Scale Short follows. The reference implementation is `template/obese-scale`.

## Shape (30–40 s, 1080×1920, 30 fps)

1. **Hook (0–2.5 s):** one absurd line and its own scene, a flash-forward of the punchline.
   *"Your chair is about to file a lawsuit."* Its job is to stop the scroll.
2. **Title question:** *"What if everyone got obese overnight?"* From here it stays pinned at the top of the frame.
3. **7–8 escalating beats,** each a **scale comparison with a real number**, shown huge and centred with a mustard
   label (`246,000,000` / `TONNES OF NEW HUMAN`). Work each number out in `PLAN.md` with its source; round honestly.
4. **A dry last line** that lands the joke (*"It doesn't notice. You do."*), then a fade into deep navy.

## Look

- A bright blue studio with a white grid floor; soft white key light; fog to the horizon.
- **Pip** (and his cast) from `src/kit.tsx`: cel-shaded, ink outlines, a cream head in a dark hood with mustard
  drawstrings and teal shoes. Pip is the human for scale; things around him are real size.
- Camera: wide establishing shots for scale, slow pushes and orbits, a kick (zoom punch + shake) on every impact.
- Captions: two or three words at a time, Montserrat Black, thick black outline, the spoken word in mustard.

## Sound

- Deadpan narrator (ElevenLabs, stability ~0.7). The voice is the clock: every cut is cued on a word (`wordAt`).
- A **whoosh on every cut**, a **pop on every stat**, one hit per visible action, landing just after its word.
- Music bed ducked under the voice, faded out before the last line. Master to −14 LUFS.

## Tone

Dark, absurd humour about the situation and the world's stupid reaction. Never mock a group of people or anyone's body.

## Checks before it ships

- One still per scene: nothing cropped by the 9:16 frame, no big stat over a 3D sign or a face, captions readable.
- Every number on screen matches `PLAN.md`.
- The final file has an audio track and is 30–40 s.

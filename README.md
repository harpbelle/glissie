# Glissie

**Pedal Harp Simulator** for composers, harpists, and the simply curious. Whether you're writing for the harp without one to hand, exploring its glissandi and voicings, learning how the pedals work, or just enjoy the sound of the instrument, [Glissie](https://harpbelle.github.io/glissie/) is for you.

## What it does

- **Pedal board** D C B for the left foot, E F G A for the right, with flat (up) / natural (middle) / sharp (down) positions. Click to bounce a pedal through its positions, or drag it.
- **Scale / Arpeggio mode** plays toggleable scale degrees from any start note across a selectable number of octaves.
- **Chord mode** plays notes selected from a 47-string grid, as a block chord or broken / arpeggiated, with an optional note limit and hand span limit.
- **Live mode** turns the string grid into a playable instrument: tap or click strings to sound them, with multi-touch.
- **Glissando mode** sweeps between two notes at 1 to 40 notes per second, ascending, descending, or both.
- **Six playing techniques**: plucked tone, harmonics, près de la table, nail, xylophonic, and étouffé, each with its own sampled sound and playable range. Glissando offers the three that suit a sweep (plucked, près de la table, and nail).
- **Notation preview** shows your current selection on a grand staff, marked with the standard sign for each technique.
- **Live pedalling**: move a pedal mid-glissando and hear the pitch change immediately, just like the real instrument.
- **Adjustable tuning**: set the reference pitch anywhere from A = 430 to 450 Hz.
- **27 preset scale & chord types** (majors, minors, hexatonics, pentatonics, the Japanese scales, the 7th chords, whole tone, and more), each computed for every root that is gliss-possible on a pedal harp; the configurations are derived by exhaustive search, so the app doubles as a reference for what the instrument can and can't gliss.
- **Save, import, and export** your own custom pedal configurations to share with other users.
- **Real sampled harp**: plucked tone from VCSL (CC0), plus harmonics, près de la table, nail, xylophonic, and étouffé recorded on a concert harp by the author (CC0), with an adjustable sostenuto wash.
- **Light and dark themes**.

## Notes

- **Flat preference**: If a preset scale has multiple pedal configurations that result an enharmonically equivalent pitch class, flat preference is applied i.e. the pedal configuration with the most number of flats is used in the preset for the default scale.
- **Alternate configurations**: Multiple pedal configurations that result in an enharmonically equivalent pitch classes are all included as alternative configurations.
- **Out-of-order configurations**: Some pedal configurations result in notes playing out of order even if all the notes belong to that scale. Those are labelled with a warning sign.

## Credits

- **Audio**: plucked concert harp from the [Versilian Community Sample Library](https://github.com/sgossner/VCSL) (CC0 1.0); harmonics, près de la table, nail, xylophonic, and étouffé recorded by Yijun Lin (CC0 1.0).
- **Code & design**: Yijun Lin, vibe coded with [Claude.ai](https://claude.ai) (Anthropic).
- **Musical glyphs**: from Bravura, SIL OFL.

## Licence

MIT - see `LICENSE`. The bundled harp samples are CC0 (public domain).

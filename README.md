# Rabbit Wrap: Real-Time Text Reflow Demo

This project is a high-performance web typography demonstration built on top of [Pretext](https://github.com/chenglou/pretext), an experimental library for DOM-free text measurement and layout.

In this demo, a full page of text (a report about the agricultural hub of Smithton, Tasmania) dynamically flows and wraps around a transparent `.webm` video of a dancing rabbit and an egg. The text automatically dodges the opaque pixels of the video, creating a seamless, interactive, and visually stunning "magazine-style" knockout effect directly in the browser—all computed in real-time without triggering expensive DOM layout reflows.

## Features

- **Real-Time Alpha Channel Collision**: The app reads the video's alpha channel at 60fps using an `OffscreenCanvas` to generate collision hulls.
- **DOM-Free Text Measurement**: Powered by `pretext`, the exact width, line breaks, and height of every word are calculated using JavaScript arithmetic and cached font metrics.
- **Rich Typography**: Features a dynamic Drop Cap (the first letter is enlarged and bolded) which acts as an additional obstacle that the rest of the text elegantly wraps around.
- **Responsive**: Resize the browser window to see the text instantly recalculate its layout around the video and the drop cap with zero jank.

## How to Run Locally

You will need [Bun](https://bun.sh/) installed on your machine.

1. Clone or download this repository.
2. Install dependencies:
   ```bash
   bun install
   ```
3. Start the local development server:
   ```bash
   bun start
   ```
4. Open your browser and navigate to the local address provided (typically `http://localhost:3000` or `http://0.0.0.0:3000`).

## Technical Details

- **Video Masking**: The video frame is drawn to a small `OffscreenCanvas` every frame. We scan the pixels for alpha values above a certain threshold to determine the left and right boundaries of the rabbit at each vertical band.
- **Slot Carving**: For each line of text, the engine checks which horizontal intervals are blocked by the video's boundaries and the Drop Cap. It subtracts these from the available width and passes the remaining "slots" to the text layout engine.
- **Layout**: `pretext` computes how much text can fit into each available slot, returning exact coordinates. The text lines are then absolutely positioned on the screen.

## Acknowledgements

- Core text layout engine provided by [Pretext](https://github.com/chenglou/pretext) by Cheng Lou.
- Video assets and Smithton report integrated for this specific demonstration.

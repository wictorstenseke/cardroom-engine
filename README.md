# Seven Card Stud

Single-player **seven card stud** (fixed limit, ante + bring-in) against AI bots. Built with **Vite**, **React 19**, and **TypeScript**. Settings (opponents, difficulty, tempo, stakes) are stored in `localStorage`.

Live demo (after you enable Pages — see below): `https://<your-username>.github.io/seven-stud/`

## Rules implemented

- Ante each hand, **bring-in** from lowest door card (suit breaks ties: clubs → spades).
- Third and fourth street use the **small bet**; fifth through seventh use the **big bet**.
- **Tempo**: every *N* hands (preset or advanced), ante and limits scale up by level (~15% per level).
- Busted **AI leave the table**; if you are alone, you **win the table**. If you bust, **game over**.
- Continuous stacks between hands; **no** online multiplayer.

## Local development

```bash
npm install
npm run dev
```

Open the URL Vite prints. The app uses `base: '/seven-stud/'`; the dev server serves the app under `/seven-stud/` as well.

```bash
npm run build
npm run preview
```

## Deploy to GitHub Pages

1. Create a **public** repository named `seven-stud` (or change `base` in `vite.config.ts` and this README to match the repo name).
2. Push this project to the `main` branch.
3. In the repo on GitHub: **Settings → Pages → Build and deployment → Source**: **GitHub Actions**.
4. The workflow **Deploy to GitHub Pages** runs on every push to `main` and publishes the `dist` folder.

First deploy may require approving the `github-pages` environment once.

## License

MIT — see [LICENSE](./LICENSE).

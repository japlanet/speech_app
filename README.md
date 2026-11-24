# Sound Studio

An offline iPad app for practising speech sounds and first spelling at home. It opens full-screen from the Home Screen and has three games plus a parent area behind a PIN.

| Game | What the child does |
| --- | --- |
| Sounds → words | Drags floating sound tiles into the word box |
| Words → sounds | Listens to three spoken words and picks the one that matches the tiles |
| Practice wheel | Spins this week's wheel, hears your model, says it, and counts each try |

**Every voice in the app is a recording you make.** There is no text-to-speech. A sound with no recording is silent and shows a muted speaker.

**Everything stays on the iPad.** Words, recordings, photos and progress are in the iPad's own storage. There are no accounts, no analytics and no other servers (the page is blocked from contacting any). After the first visit the app opens from a saved copy. The only traffic left is Safari checking this site for a new version of the app's files; nothing of yours is sent.

## Put it on the iPad

1. Deploy (below), then open **https://japlanet.github.io/speech_app/** in **Safari** on the iPad.
2. Tap **Share → Add to Home Screen → Add**.
3. Close Safari and open **Sound Studio** from the Home Screen. Do this *before* recording anything: the Home Screen app has its own storage, so recordings made in a Safari tab will not appear in it.
4. Choose a PIN, write down the recovery code, and follow "Let's record the sounds first".
5. Stay online until **Settings › This app** says "Ready to use offline".

The iPad asks to use the microphone when you record, and may ask again each time the app is reopened. Choose Allow. To keep a child inside the app, turn on **iPad Settings › Accessibility › Guided Access**.

## Record good models

- Quiet room, about 20 cm from the iPad. Tap record, wait half a second, say it, tap stop. Silence is trimmed for you; drag the blue handles to adjust.
- Keep sounds pure: a long "fffff" rather than "fuh", a short quiet puff for p, t and k.
- For the wheel, record the blended model, for example a long "fffff" sliding into "hay".

## Each week: set up a new wheel

1. Gear → PIN → **Wheels** → **New wheel**.
2. Give it a name, the letters for the middle, and the **target sound**. The target sound is also what the other two games lean towards when they choose decoys and wrong answers.
3. Set the **daily target**.
4. **Add a picture** for each item: label, then a photo or an emoji. Tap the microphone beside it and record the model.
5. Switch on **Use this week**. The old wheel is kept and can be switched back on.
6. Check the **Recordings** tab shows nothing missing. **History** has a table of every day's count.

The starter wheel has hay, he, hi, ho, hoo and how. Check these against your own sheet and edit them.

## Words

Gear → **Words**. Type a word and the app suggests one tile per sound; tap between two letters to split or join them, and pick the right sound where a spelling has several. "Needs more minimal pairs" means fewer than two words in use differ from it by exactly one sound, so add some or choose its wrong answers yourself.

## Back up and restore

- **Backup › Make a backup › Save it to…** saves one .zip (Files or iCloud Drive). It holds your voice and photos, so keep it private. The PIN is not in it.
- **Backup › Choose a backup file** shows what is inside before replacing what is on the iPad. Use it to move to a new iPad.
- Deleting the app from the Home Screen deletes its data. Make a backup first. One after each big recording session is a good habit.

**Forgotten PIN:** tap "Forgotten the PIN?" and enter the recovery code.

## Deploy

Every push to `main` runs the tests, builds the app and publishes it with `.github/workflows/deploy.yml`. In a new copy of the repository, set **Settings › Pages › Source** to **GitHub Actions** and change `BASE_PATH` in the workflow to `/<repository name>/`. HTTPS is needed for the microphone and offline use, and GitHub Pages provides it.

A new version downloads in the background and is used the next time the app is opened. **Settings › Check for update** fetches it now. Updates never touch your data.

## Develop

```bash
pnpm install
pnpm run dev
```

`pnpm test` runs the rules (tile splitting, colours, decoys, minimal pairs, trimming, spin, dominoes, backups). Preact, TypeScript and Vite, with `idb` for storage and `fflate` for the zip. The letters are [Andika](https://software.sil.org/andika/) (SIL Open Font License), bundled with the app.

| Folder | Contents |
| --- | --- |
| `src/core` | Rules with no screen or storage, all tested |
| `src/store` | IndexedDB, app data, backup, PIN, updates |
| `src/audio` | Playback and recording |
| `src/screens` | The games and the parent area |

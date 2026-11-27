# Bubble FM daily post

Every morning this repo picks the next song from each of the three Spotify playlists (Breakfast, Boogie, Date Night), builds the Bubble FM carousel (cover + three track slides with the album art in a bubble), writes the caption and posts it to Instagram.

Each slide is a 30-second seamless loop at 1080 × 1350 (4:5): the bubbles float, sway and breathe, tiny bubbles rise through the frame, sparkles twinkle and the background colour shifts very slightly. A still JPEG of every slide is saved too. Instagram's API only accepts 4:5 or wider, which is why the slides aren't 3:4; in the grid Instagram trims a sliver off the sides, and nothing important sits there.

It runs on GitHub Actions, so nothing needs to stay switched on at home.

## How it picks songs

For each playlist it takes the first song (in playlist order) that has never been posted before, in any of the three playlists. Before every post it checks the song against everything posted so far, both by its Spotify ID and by artist and title, so these count as the same song and are skipped:
- the same track sitting in two playlists
- another version of it, like a remaster, radio edit, remix or the album version of a single
- the same song with a "feat." credit added

It also never puts the same song in one post twice. Skipped songs are listed in the run log. Posted songs are remembered in `state.json`.

Add new songs anywhere in a playlist and they'll come up in turn. If a playlist runs out of songs that were never posted, that day's run stops and says which playlist needs more.

## Three modes

| Mode | What happens |
|---|---|
| `preview` | Makes the images. Nothing is posted or remembered. Good for testing. |
| `manual` | Makes the videos and images and remembers the songs as used. You download them from the run and post them yourself. |
| `post` | Makes the images and posts the carousel to Instagram automatically. |

The daily schedule uses whatever the repository variable `SCHEDULED_MODE` says (`preview` if it isn't set). You can also start a run by hand: **Actions → Daily post → Run workflow**, pick a mode, and tick "Use sample tracks" to try it without Spotify.

The videos and images of every run can be downloaded from the run page under **Artifacts → bubble-fm-post**.

## Setup

### 1. GitHub
1. Create a new **public** repository and upload everything in this folder. It has to be public because Instagram fetches the images from the repo's raw links.
2. In the repo go to **Settings → Secrets and variables → Actions**.

### 2. Spotify
1. Go to developer.spotify.com, log in with the Bubble FM Spotify account, open the Dashboard and create an app (any name; redirect URI can be `http://127.0.0.1:8888/callback`, it isn't used; tick "Web API").
2. Copy its **Client ID** and **Client secret** into the secrets `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET`.
3. Make the three playlists **public** and put each playlist link (Share → Copy link) into `playlists.json` in this repo.

At this point `manual` mode already works.

### 3. Instagram (for `post` mode)
Bubble FM posts through a Meta app ("Bubble FM Poster") owned by the "Bubble FM" business portfolio, which holds only the @bubblefm030 Instagram account. A system user in that portfolio has access to the app and to @bubblefm030 and nothing else, so the app can't post anywhere but Bubble FM.

The repo needs one secret, `IG_ACCESS_TOKEN`: the system user's token (permissions `instagram_basic` and `instagram_content_publish`, never expires). The Instagram ID of @bubblefm030 (`17841460524384737`) is built into the app; an `IG_USER_ID` secret would override it.

Run **Daily post** once by hand with mode `post`. When that works, set the repository variable `SCHEDULED_MODE` to `post`.

## Changing the time
Edit the `cron` line in `.github/workflows/daily-post.yml`. It's in UTC: `37 7 * * *` is 08:37 in Berlin in winter and 09:37 in summer. GitHub sometimes starts scheduled runs a few minutes late.

## Limits worth knowing
- Posts made through the API can't have music attached. Add the songs in Stories by hand.
- Videos take Instagram a few minutes to process, so a `post` run takes a little longer.
- To post still images instead of videos, set the repository variable `ANIMATE` to `false`.
- If Spotify changes what apps may read, the playlist step can break. The error message in the run will say what went wrong.

## Try it locally
```
npm ci
SAMPLE=true node src/index.js prepare
```
The videos (`.mp4`) and stills (`.jpg`) land in `posts/<date>/`. Rendering takes about a minute.

## Drift into space
From day 11 the colours slowly move from candy pink into deep space (dark indigo, nebula glows, stars, a small ringed planet) and arrive fully on day 24. The bubbles stay. Start and length are the repository variables `SPACE_START` (default 10) and `SPACE_DAYS` (default 14).

## Where the videos live
Videos and stills are kept out of `main` so the repo stays small. The `media` branch holds only the current day's files (Instagram fetches them from there) and the `previews` branch only the latest preview. Both are replaced on every run. Every run's files can also be downloaded for 14 days from the run page (Artifacts). Loop length is set with the repository variable `VIDEO_SECONDS` (default 30).

## Tagging artists
Each track slide tags its artists on Instagram. Handles come from `artists.json` (`"Artist Name": "handle"`), which is checked by hand, because guessing could tag the wrong person. Artists without a handle are listed in the run log and in `upcoming.json` inside each post folder, which also lists every artist still waiting in the playlists. If Instagram refuses a tag (private account, renamed handle), that slide is posted without it.

Slides and caption run breakfast → date night → boogie.

## Link page
The link-in-bio page lives in `docs/` and is published at **https://coop030.github.io/bubble-fm/**. Every change to `docs/` on `main` publishes itself. Button links are at the top of the script in `docs/index.html`; an empty link hides its button. "Today's three" reads `latest.json`, which every post updates.

## Playlist covers
`covers/` has a cover for each playlist: `<name>.jpg` (3000 × 3000) to upload in the Spotify app, and `<name>-640.jpg` (under 256 KB, Spotify's limit for uploads through its API). To change them, edit `src/covers.js` and run `node src/covers.js`.

## Fonts
`fonts/` contains Bagel Fat One and Fredoka, both under the SIL Open Font License, which allows bundling them here.

## Reel format (default since day 14)

Every day one track goes out as a 15-second Reel (1080×1920), taking the playlists in turn: breakfast → date night → boogie. If a playlist has run dry, it moves on to the next one that still has songs.

- Grid cover (cover_url): the familiar day cover (day number, bubbles, colour drift), sized so the 3:4 grid crop matches the old posts. The video itself uses the playlist colours; set `REEL_BG=grid` to use the grid colours in the video too.
- The cover art spins inside a big bubble like a record; small bubbles orbit it, and a bubble equalizer and progress dots move in the track card. Text stays clear of Instagram's Reel buttons.
- Caption: `day 0NN | playlist`, then `Artist – Title`, the link-in-bio line and the hashtags. Artists in artists.json are tagged.
- Music: Instagram's API only offers its royalty-free library to this account (searching for the real songs returns unrelated tracks). The workflow has an optional `audio_id` input for a track from that library; without it the Reel goes out with silent sound, and the song can be added by hand in the app.
- Set the repo variable `FORMAT=carousel` to go back to the three-track carousel.

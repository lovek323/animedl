# MyAnimeList + Kissanime downloader

## Running

Create a `config.json`:

```json
{
  "outputDirectory": "/media/data01/anime",
  "tvFinalDirectory": "/media/data01/anime",
  "series": [
    {"aniDbId": 8692}
  ],
  "franchises": [
      {"name": "swordArtOnline", "format": "dub"}
  ]
}
```

The `series` property is an array of objects with the following properties:

- `aniDbId`: the aniDB ID (taken from the URL)
- `format`: either `"sub"` or `"dub"` depending on whether you want the subbed version or the dubbed version

The `franchises` property allows you to add entire franchises. Each object in the `franchises` array has the following
properties:

- `name`: the franchise name (filenames from the `franchises` directory)
- `format`: either `"sub"` or `"dub"` depending on whether you want the subbed version or the dubbed version


## Adding new series

Edit the `data.js` file and make a PR. This is the format:

```js
module.exports = {
  // Sword Art Online (Sword Art Offline)
  { aniDbId: 8692, aniDbStart: 'S1', [constants.FORMAT_SUB]: { providerId: 'q83v' } },
};
```

- Try to put each "franchise" in a separate file in the `data` directory (e.g., Sword Art Online, Sword Art Online II
  and associated specials)
- Comments should precede the line containing the aniDB ID and be the exact title as it appears on aniDB.
- `aniDbId`: the aniDB ID (from the aniDB URL)
- `aniDbStart` (defaults to `'1'`): ignore aniDB episodes before this episode (it's listed in the "EP" column on the
  aniDB page, e.g., "1", "S1", "C1", and so on)
- `[constants.FORMAT_SUB]`: the subbed version of the video with the following properties
  - `providerStart` (defaults to `1`): ignore provider episodes before this episode to ignore specials that the provider
    has included with the regular episodes
  - `providerEnd` (defaults to `null`): `null` to process all remaining provider episodes or the provider episode number
    to go to (this is inclusive)
  - `provider` (defaults to `constants.PROVIDER_9ANIME`): either `constants.PROVIDER_9ANIME` or
    `constants.PROVIDER_KISSANIME`
  - `providerId`: the 9anime.to or kissanime.to provider ID, found in the URL
    `https://9anime.to/watch/boku-no-hero-academia-2nd-season.6z94/jpy998` (the numbers and letters after the `.`,
    before the `/`)
- `[constants.FORMAT_DUB]`: the dubbed version of the video with the same properties as above

Combine multiple entries for the same aniDB ID.

### Adding a complex series (overriding what's in aniDB)

```js
// My Hero Academia (2016) -- This one contains the Jump Festa 2016 special, but it's not included with the main
//                            Boku no Hero Academia entry, so we have some custom handling
{
  aniDbId: 12344,
  title: 'Boku no Hero Academia',
  episodes: [
    {
      aniDbNumber: '1',
      name: 'Jump Special Anime Festa 2016',
      number: 'S1',
    }
  ],
  [constants.FORMAT_SUB]: { providerId: 'n8nl' },
},
```

If necessary, you can override series title and the episode number and title. Make sure you put a comment to explain
why you're doing this.


## Install the dependencies:

```
npm install
```

Run the tool:

```
rm cache/*.mp4
node main.js
```


## Debugging

```
DEBUG="animedl,malapi:anime" node main.js
```

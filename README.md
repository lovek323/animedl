# MyAnimeList + Kissanime downloader

## Running

Create a `config.json`:

```json
{
  "outputDirectory": "",
  "moviesFinalDirectory": "",
  "tvFinalDirectory": "",
  "useYearSeasonDirectories": true,
  "series": [
    {
      "aniDbId": "10376",
      "providerEpisodeRanges": [
        {
          "name": "Sword Art Online II",
          "start": "1",
          "malId": "21881",
          "provider": "9anime.to",
          "providerId": "6y0",
          "format": "sub"
        }
      ]
    }
  ]
}
```

Install the dependencies:

```
brew install AtomicParsley
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

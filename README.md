# MyAnimeList + Kissanime downloader

## Running

Create a `config.json`:

```json
{
  "outputDirectory": "",
  "finalDirectory": "",
  "seriesIds": [
    "12345"
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
DEBUG="kissanime" node main.js
```

## Debugging

```
DEBUG="kissanime,malapi:anime" node main.js
```

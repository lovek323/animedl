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
node main.js
```

## Debugging

```
DEBUG="animedl,malapi:anime" node main.js
```

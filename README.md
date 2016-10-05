# MyAnimeList + Kissanime downloader

## Running

Create a `config.json`:

```json
{
  "outputDirectory": "",
  "moviesFinalDirectory": "",
  "tvFinalDirectory": "",
  "series": [
    {
      "id": "12345",
      "_9AnimeTitle": "Test",
      "kissanimeTitle": "Test"
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
node main.js
```

## Debugging

```
DEBUG="animedl,malapi:anime" node main.js
```

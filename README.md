# Counter-Strike Global Offensive Game State

A prototype that communicates with the CS::GO game state

## Structure
- ES6
- NodeJS
- Blessed / Blessed Contrib
- Simple Node Logger

## Basic Usage
- Install NodeJS 8.0 or higher
- Copy the `gamestate_integration_glennserver.cfg` file to your `Steam\SteamApps\common\Counter-Strike Global Offensive\csgo\cfg` folder
- Run `npm install` in the node folder
- Run `npm run server` in the node folder

Then open up CS::GO and start playing you will see the incoming logs in your command prompt.

## Advanced Usage
Your liked what you saw above now try to run: `npm run dashboard` in the node folder.
If the script crashes instantly then resize your command prompt to a bigger size.

## Logging
All logs will be written to the `csgo-gamestate.log` file in the node folder.

To increase the logging to get the RAW incoming data change the logLevel in the `config.js` file from `info` to `debug`.

When you now start your server every incoming data from CS::GO will be saved as a JSON file in the exp folder.

## License

MIT

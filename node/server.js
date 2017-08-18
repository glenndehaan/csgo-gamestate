const http = require('http');
const fs = require('fs');
const log = require('simple-node-logger').createSimpleLogger('csgo-gamestate.log');
const config = require('./config');

/**
 * Set log level from config
 */
log.setLevel(config.application.logLevel);

/**
 * Set global vars for later use
 * @type {{game_mode: boolean, map: boolean, round: number, players: Array, player_ids: Array, bombtime: number, bombtimer: boolean}}
 */
let general_data = {
    game_mode: false,
    map: false,
    round: 0,
    players: [],
    player_ids: [],
    bombtime: config.csgo.bombtime,
    bombtimer: false
};

/**
 * Create new HTTP server
 */
const server = http.createServer((req, res) => {
    res.writeHead(200, {'Content-Type': 'text/html'});

    req.on('data', (data) => {
        try {
            log.trace(JSON.parse(data.toString()));

            generalProcessData(JSON.parse(data.toString()));

            if (config.application.logLevel === "trace" || config.application.logLevel === "debug") {
                fs.writeFile(`${__dirname}/export/${JSON.parse(data.toString()).provider.timestamp}.json`, data.toString(), (err) => {
                    if (err) {
                        return log.error(`[FILE] Error writing file: ${err}`);
                    }
                });
            }
        } catch (e) {
            log.error(`[WEBDATA] Error retrieving data from API: ${e}`)
        }
    });

    req.on('end', () => {
        res.end('');
    });
});

/**
 * Function to check if the right information exists so the right logger can be triggered
 * @param data
 */
function generalProcessData(data) {
    if (typeof data.map !== "undefined") {
        log.trace("processMap");

        if (data.map.name !== general_data.map || data.map.mode !== general_data.game_mode) {
            log.info(`[MAP] Map change detected: ${data.map.name}, Game Mode: ${data.map.mode}`);
        }

        general_data.map = data.map.name;
        general_data.game_mode = data.map.mode;
        general_data.round = data.map.round;
    }

    if (typeof data.added !== "undefined") {
        if (typeof data.added.round !== "undefined") {
            if (typeof data.added.round.win_team !== "undefined" && data.added.round.win_team) {
                processRoundEnd(data);
                log.trace("processRoundEnd");
            }
        }
    }

    if (typeof data.previously !== "undefined") {
        if (typeof data.previously.map !== "undefined") {
            if (typeof data.previously.map.phase !== "undefined") {
                processMapEnd(data);
                log.trace("processMapEnd");
            }
        }
    }

    if (typeof data.round !== "undefined") {
        if (typeof data.round.bomb !== "undefined") {
            processBombStatus(data);
            log.trace("processBombStatus");
        }
    }

    if (typeof data.player !== "undefined") {
        if (typeof data.player.steamid !== "undefined") {
            processPlayerId(data);
            log.trace("processPlayerId");
        }
    }
}

/**
 * Process when the round has ended
 * @param data
 */
function processRoundEnd(data) {
    const team_won = data.round.win_team === 'T' ? 'Terrorists' : 'Counter-Terrorists';
    const ct_score = data.round.win_team === 'CT' ? data.map.team_ct.score + 1 : data.map.team_ct.score;
    const t_score = data.round.win_team === 'T' ? data.map.team_t.score + 1 : data.map.team_t.score;
    let reason_won = false;

    if (data.round.bomb === 'exploded') {
        reason_won = 'bombing a bombsite';
    } else if (data.round.bomb === 'defused') {
        reason_won = 'defusing the bomb';
    } else {
        reason_won = 'killing the opposition';
    }

    if (general_data.bombtimer !== false) {
        clearInterval(general_data.bombtimer);
        general_data.bombtimer = false;
        general_data.bombtime = config.csgo.bombtime;
    }

    log.info(`[ROUND_END] ${team_won} won by ${reason_won} (CT ${ct_score}-${t_score} T)`);
}

/**
 * Process when the map has ended
 * @param data
 */
function processMapEnd(data) {
    if (data.previously.map.phase === "live" && data.map.phase === "gameover") {
        let winner = false;
        const ct_score = data.round.win_team === 'CT' ? data.map.team_ct.score + 1 : data.map.team_ct.score;
        const t_score = data.round.win_team === 'T' ? data.map.team_t.score + 1 : data.map.team_t.score;

        if (ct_score > t_score) {
            winner = 'Counter-Terrorists win!';
        } else if (t_score > ct_score) {
            winner = 'Terrorists win!';
        } else {
            winner = "It's a tie!";
        }

        log.info(`[MAP_END] ${data.map.name} over, ${winner}`);
    }
}

/**
 * Process when bomb status changes
 * @param data
 */
function processBombStatus(data) {
    if (data.round.bomb === "planted") {
        if (general_data.bombtimer === false) {
            log.info(`[BOMB] Status: ${data.round.bomb}! ${config.csgo.bombtime} seconds to explosion`);
            general_data.bombtimer = setInterval(() => {
                general_data.bombtime = general_data.bombtime - 1;
                log.info(`[BOMB] ${general_data.bombtime} seconds to explosion`);

                if (general_data.bombtime === 0) {
                    clearInterval(general_data.bombtimer);
                    general_data.bombtimer = false;
                    general_data.bombtime = config.csgo.bombtime;
                }
            }, 1000);
        }
    }

    if (data.round.bomb === "exploded") {
        log.info(`[BOMB] Status: ${data.round.bomb}`);

        if (general_data.bombtimer !== false) {
            clearInterval(general_data.bombtimer);
            general_data.bombtimer = false;
            general_data.bombtime = config.csgo.bombtime;
        }
    }

    if (data.round.bomb === "defused") {
        log.info(`[BOMB] Status: ${data.round.bomb}`);

        if (general_data.bombtimer !== false) {
            clearInterval(general_data.bombtimer);
            general_data.bombtimer = false;
            general_data.bombtime = config.csgo.bombtime;
        }
    }
}

/**
 * Process when playerid had been found
 * @param data
 */
function processPlayerId(data) {
    if (!general_data.player_ids.includes(data.player.steamid)) {
        general_data.player_ids.push(data.player.steamid);
        general_data.players.push({id: data.player.steamid, name: data.player.name});
        log.info(`[PLAYER] New player found: ${data.player.steamid} (${data.player.name})`);

        fs.writeFile(`${__dirname}/export/players.json`, JSON.stringify(general_data.players), (err) => {
            if (err) {
                return log.error(`[FILE] Error writing file: ${err}`);
            }
        });
    }
}

/**
 * Start listening on the right port/host for the HTTP server
 */
server.listen(config.application.port, config.application.host);
log.info(`[SYSTEM] Monitoring CS:GO on: ${config.application.host}:${config.application.port}`);

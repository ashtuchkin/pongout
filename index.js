var express = require('express');
var app = express();
var browserify = require('browserify');

app.use(express.static("./public"));
app.use(express.bodyParser());
app.use(express.cookieParser());
//app.use(browserify({entry:"./client.js"}));

app.get('/', function(req, res) {
   res.render("index.ejs"); 
});

var GameState = require('./public/game.js').GameState;
var gs = undefined;

var sockjs = require('sockjs').createServer();
var conns = {};
var spectators = [];
var players = [];
var playerById = {};

function newGame() {
    if (players.length < 2) {
        console.log("Game cannot start - only one player available");
        gs = undefined;
    } else {
        console.log("Starting Game! ", players);
        gs = new GameState();
        gs.objects[0].id = players[0];
        gs.objects[1].id = players[1];
        playerById = {};
        playerById[players[0]] = 0;
        playerById[players[1]] = 1;
    }
    broadcast({
        type: "start",
        objects: gs ? gs.objects : null,
    });
}

function broadcast(msg) {
    for (var id in conns) {
        var conn = conns[id];
        msg.id = id;
        conn.write(JSON.stringify(msg));
    }
}

sockjs.on('connection', function(conn) {
    console.log("connected");
    var id = conn.id;
    conns[id] = conn;

    if (players.length < 2) {
        players.push(id);
        newGame();
    } else {
        spectators.push(id);
        conn.write(JSON.stringify({
            type: "start",
            objects: gs.objects,
            id: id
        }));
    }

    conn.on('data', function(message) {
        var idx = playerById[id];
        if (idx != null) {
            gs.objects[idx].x = JSON.parse(message).x;
        } else {
            console.log("bad player sent data: "+id);
        }
    });

    conn.on('close', function() {
        console.log("disconnect");
        delete conns[id];

        if ((players[0] == id) || (players[1] == id)) {
            gs = undefined;
            players[playerById[id]] = spectators.shift();
            players = players.filter(Boolean);
            newGame();
        }
    });
});


var startdate = Date.now();
setInterval(function() {
    var elapsed = Date.now() - startdate;
    if (gs) {
        gs.update();
        gs.updateServer();

        var diff = [
                {x: gs.objects[0].x, score: gs.objects[0].score, curPrize: gs.objects[0].curPrize},
                {x: gs.objects[1].x, score: gs.objects[1].score, curPrize: gs.objects[1].curPrize},
                gs.objects[2],
        ];

        for (var i = 3; i < gs.objects.length; i++)
            diff.push({vis: gs.objects[i].vis, color: gs.objects[i].color});

        broadcast({ type: "diff", diff: diff});
    }
}, 50);

var server = require('http').createServer();
sockjs.installHandlers(server, {prefix:'/sockjs'});
server.listen(9999, '0.0.0.0');

app.listen(5000);
console.log("Listening...");

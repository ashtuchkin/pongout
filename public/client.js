var canvas = null;
if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = (function () {
        return window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame ||
            window.oRequestAnimationFrame ||
            window.msRequestAnimationFrame ||
            function (/* function FrameRequestCallback */ callback, /* DOMElement Element */ element) {
                window.setTimeout(callback, 1000 / 60);
            };
    })();
}

var _img_ball = null, _img_player = null, _img_block = null, _img_wins = null;

$(function () {
    canvas = $("#layer1")[0]
    canvas.width = 600;
    canvas.style.width = '600px';
    canvas.height = 600;
    canvas.style.height = '600px';
    _img_ball = $("#img-ball")[0]
    _img_player = $("#img-player")[0]
    _img_block = $("#img-block")[0]
    _img_info = $("#img-info")[0]
    _img_wins = $("#img-win")[0]

    $(canvas).mousemove(function (e) {
        if (sock == null) return;
        if (gs == null) return;
        var data = { x:e.offsetX }
        sock.send(JSON.stringify(data));
    })

    $(document).on('touchstart touchmove', function(e){
        e.preventDefault();
    })
    $(canvas).on('touchstart touchmove', function(e){
        e.preventDefault();
        if (sock == null) return;
        if (gs == null) return;
        if (e.touches.length == 1) {
            var data = { x:e.touches[0].offsetX }
            sock.send(JSON.stringify(data));
        }
    })

    connect()
    drawWaiting()
})

var sock = null;

function connect() {
    sock = new SockJS('http://pongout.shtuchkin.com:9999/sockjs');
    sock.onopen = function () {
        console.log('open');
    };
    sock.onmessage = function (e) {
        var data = JSON.parse(e.data)
        if (data.type == "start") {
            console.log(e.data)
            if (data.objects) {
                gameStart(data)
            } else {
                gs = null;
                drawWaiting()
            }
        }
        if (data.type == "diff") {
            beforeUpdate()
            gs.change(data.diff)
            afterUpdate()
        }
    };
    sock.onclose = function () {
        drawOffline();
        sock = null;
        gs = null;
        console.log('close');
    };
}

var GameState = module.exports.GameState
var gs = null
var playerId = null, playerNum = null

function drawWaiting() {
    var context = layer1.getContext("2d");
    context.clearRect(0, 0, 600, 600)
    context.font = "32px Georgia";
    var s = "Waiting for opponent";
    var dim = context.measureText(s)
    var x = 300 - dim.width / 2, y = 300

    context.fillStyle = "white"
    context.fillText(s, x, y)
}

function drawOffline() {
    var context = layer1.getContext("2d");
    context.clearRect(0, 0, 600, 600)
    context.font = "32px Georgia";
    var s = "Offline, press F5";
    var dim = context.measureText(s)
    var x = 300 - dim.width / 2, y = 300

    context.fillStyle = "white"
    context.fillText(s, x, y)
}

function gameStart(data) {
    if (!drawStarted)
        requestAnimationFrame(gameDraw);
    gs = new GameState();
    playerId = data.id
    gs.objects = data.objects
    console.log(gs.objects)
    if (gs.objects[0].id == playerId)
        playerNum = 0;
    else if (gs.objects[1].id == playerId)
        playerNum = 1;
    else
        playerNum = -1;
}

function beforeUpdate() {
    for (var i in gs.objects) {
        var obj = gs.objects[i];
        obj._prevX = obj.x;
        obj._prevY = obj.y;
        obj._size = obj.size;
    }
}

function afterUpdate() {
    gs.update()
    if (gs.hit) {
        gs.hit = false;
        var x = Math.floor(Math.random() * 2)+1;
        var audio = $("#hit"+x)[0];
        audio.currentTime = 0;
        audio.play();
    }
    if (gs.lose) {
        gs.lose = false;
        var audio = $("#lose")[0];
        audio.currentTime = 0;
        audio.play();
    }
    if (gs.playerWins != 0) {
        wins = gs.playerWins;
        gs.playerWins = 0;
        winsTimer = 30;
    }
    if (winsTimer>0)
        winsTimer--;
    else wins = 0;
}

var drawStarted = false;
var wins = 0, winsTimer = 0;

function gameDraw() {
    if (gs == null) {
        drawStarted = false;
        return;
    }
    drawStarted = true;
    var context = layer1.getContext("2d");
    var dt = new Date().getTime()
    var delta = (dt - gs.lastUpdated) / 50.0;
    if (delta > 1.0) delta = 1.0;
    if (delta < 0.0) delta = 0.0;
    if (playerNum == 0) {
        context.save();
        context.translate(300, 300);
        context.scale(1.0, -1.0);
        context.translate(-300, -300);
    }

    context.clearRect(0, 0, 600, 600)
    context.strokeRect(0, 0, 600, 600)
    context.lineWidth = 4;

    for (var i in gs.objects) {
        var obj = gs.objects[i];

        var x1 = obj._prevX + delta * (obj.x - obj._prevX)
        var y1 = obj._prevY + delta * (obj.y - obj._prevY)

        var d = Math.sqrt((obj.x-obj._prevX) * (obj.x-obj._prevX) + (obj.y-obj._prevY) * (obj.y-obj._prevY));
        if (i>=2 && d>50.0) {
            x1 = obj.x;
            y1 = obj.y;
        }
        var sz = obj._size + delta * (obj.size - obj._size);
//var x1 = obj.x, y1 = obj.y

        if (obj.type == "ball") {
            context.beginPath();
            context.drawImage(_img_ball, x1 - 19, y1 - 19, 38, 38);
            context.stroke();
        }
        if (obj.type == "player") {
            context.drawImage(_img_player, 0, i*35, 100, 35, x1 - obj.width / 2 * sz, y1 - obj.height / 2, obj.width * sz, obj.height);
        }
        if (obj.type == "block") {
            var s = obj.color;
            context.drawImage(_img_block, 0, s*40, 100, 40, x1 - obj.width / 2 * sz, y1 - obj.height / 2* sz, obj.width* sz, obj.height* sz);
        }
    }

    if (wins == 1) {
        var w = 323, h = 79;
        context.save();
        context.translate(300, 300);
        context.scale(1.0, -1.0);
        context.translate(-300, -300);
        context.drawImage(_img_wins, 0, 0, w, h, 300-w/2, 150-h/2, w, h);
        context.restore();
        context.drawImage(_img_wins, 0, h, w, h, 300-w/2, 150-h/2, w, h);
    }
    if (wins == 2) {
        var w = 323, h = 79;
        context.drawImage(_img_wins, 0, 0, w, h, 300-w/2, 150-h/2, w, h);
        context.save();
        context.translate(300, 300);
        context.scale(1.0, -1.0);
        context.translate(-300, -300);
        context.drawImage(_img_wins, 0, h, w, h, 300-w/2, 150-h/2, w, h);
        context.restore();
    }

    if (playerNum == 0) {
        context.restore()
    }

    context.drawImage(_img_info, 500, 250);
    context.drawImage(_img_info, 500, 335);
    context.font = "30px Georgia";
    context.fillStyle = "black";
    if (playerNum == -1) playerNum = 0;
    context.fillText(gs.objects[playerNum].score, 560, 250+32)
    context.fillText(gs.objects[1-playerNum].score, 560, 335+32)

    requestAnimationFrame(gameDraw);
}
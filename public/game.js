module.exports = {
    GameState:function () {
        //initial state
        this.field = {width:600, height:600}
        this.hit = false
        this.lose = false
        this.objects = [
            {
                type:"player",
                name:"player-1",
                x:150, y:30, width:100, height:40, size : 1.0,
                score:0, curPrize: 0
            },
            {
                type:"player",
                name:"player-2",
                x:160, y:570, width:100, height:40, size : 1.0,
                score:0, curPrize: 0
            },
            {
                type:"ball",
                x:300, y:300, vx:7.07, vy:-7.07, rad:10.0, size: 1.0
            },
            {
                type:"block",
                x:105, y:370, width:120, height:40, size: 0.0, vis: false, color:0
            },
            {
                type:"block",
                x:180, y:230, width:120, height:40, size: 0.0, vis: false, color:0
            },
            {
                type:"block",
                x:255, y:370, width:120, height:40, size: 0.0, vis: false, color:0
            },
            {
                type:"block",
                x:330, y:230, width:120, height:40, size: 0.0, vis: false, color:0
            },
            {
                type:"block",
                x:405, y:370, width:120, height:40, size: 0.0, vis: false, color:0
            },
            {
                type:"block",
                x:480, y:230, width:120, height:40, size: 0.0, vis: false, color:0
            }
        ]

        this.tick = 0 //number of tick
        this.lastUpdated = -1 //used

        this.intersect = function (x1, y1, x2, y2, x3, y3, x4, y4) {
            var A1 = x2 - x1, B1 = x3 - x4, C1 = x3 - x1;
            var A2 = y2 - y1, B2 = y3 - y4, C2 = y3 - y1;
            var D = A1 * B2 - A2 * B1;
            if (Math.abs(D) < 1e-9) return 10.0;
            var T = C1 * B2 - C2 * B1;
            var U = A1 * C2 - A2 * C1;
            if (D < 0) {
                T = -T;
                U = -U;
                D = -D;
            }
            if (0 <= T && T <= D && 0 <= U && U <= D)
                return T / D;
            return 10.0;
        }

        this.change = function (diff) {
            this.objects[0].x = diff[0].x;
            this.objects[1].x = diff[1].x;
            if (diff[0].score) 
                this.objects[0].score = diff[0].score;
            if (diff[1].score)
                this.objects[1].score = diff[1].score;
            if (diff[0].curPrize !== null)
                this.objects[0].curPrize = diff[0].curPrize;
            if (diff[1].curPrize !== null)
                this.objects[1].curPrize = diff[1].curPrize;
            if (this.objects[2]) {
                this.objects[2].x = diff[2].x;
                this.objects[2].y = diff[2].y;
                this.objects[2].vx = diff[2].vx;
                this.objects[2].vy = diff[2].vy;
            }
            for (var i=3; i<9; i++) {
                this.objects[i].vis = diff[i].vis;
                this.objects[i].color = diff[i].color;
            }
        }

        this.throwBall = function () {
            var a = Math.random() * 3.14 * 2;
            while (Math.abs(Math.cos(a)) < 0.2)
                a = Math.random() * 3.14 * 2;
            var speed = 20;
            var obj = this.objects[2];
            obj.x = 300;
            obj.y = 300;
            obj.vx = speed * Math.sin(a), obj.vy = speed * Math.cos(a);
            obj.lastPlayer = 2;
        };

        this.batBounce = function (player) {
            var obj = this.objects[2];
            obj.vy = -obj.vy;
            var a = Math.atan(obj.vy, obj.vx);
            var speed = Math.sqrt(obj.vy * obj.vy + obj.vx * obj.vx);

            a += (player.x - obj.x) / player.width * 2 * (obj.vy/Math.abs(obj.vy));
            obj.vy = speed * Math.sin(a);
            obj.vx = speed * Math.cos(a);
        }

        this.mround = function (x) {
            return Math.round(x * 1000.0) / 1000.0;
        }

        this.serverTest = 0

        this.updateServer = function() {
            if (this.serverTest==0) {
                this.serverTest=1;
                this.throwBall()
            }
            var sz = 0, cnt = 0;
            for (var i=3; i<9; i++) {
                var obj = this.objects[i];
                if (obj.vis) cnt++;
                sz += obj.size;
            }

            if (cnt<2 && sz<=1.5) {
                var r = Math.floor(Math.random()*100);
                if (r<6)
                {
                    r+=3;
                    if (!this.objects[r].vis) {
                        this.objects[r].vis = true;
                        var probabilities = [50, 25, 25], sum = 0;
                        for (var i = 0; i < probabilities.length; i++)
                            sum += probabilities[i];
                        sum *= Math.random();
                        for (var i = 0; i < probabilities.length; i++) {
                            sum -= probabilities[i];
                            if (sum <= 0) {
                                this.objects[r].color = i;
                                break;
                            }
                        }
                    }
                }
            }

            for (var i=0; i<2; i++) {
                var obj = this.objects[i];
                if (obj.curPrize!=0) {
                    obj.curPrizeTicks--;
                    if (obj.curPrizeTicks<=0) {
                        obj.curPrize = 0;
                    }
                }
            }
        }

        this.updateBall =
            function (obj) {
                var collision = false;
                for (i = 3; i < this.objects.length; i++) {
                    var obj2 = this.objects[i];
                    if (obj2.size<0.2)
                        continue;
                    if (obj2.type == "block") {
                        var x1 = obj2.x - obj2.width / 2 * obj2.size;
                        var y1 = obj2.y - obj2.height / 2 * obj2.size;
                        var x2 = obj2.x + obj2.width / 2 * obj2.size;
                        var y2 = obj2.y + obj2.height / 2 * obj2.size;

                        var best = 10.0, bestAng = 0.0;

                        var N = 16;
                        for (j = 0; j < N; j++) {
                            var ang = Math.PI * 2 * j / N;
                            var rx = obj.x - obj.rad * Math.cos(ang)
                            var ry = obj.y - obj.rad * Math.sin(ang)

                            var tt = 10.0;
                            tt = Math.min(tt, this.intersect(rx, ry, rx + obj.vx, ry + obj.vy, x1, y1, x2, y1));
                            tt = Math.min(tt, this.intersect(rx, ry, rx + obj.vx, ry + obj.vy, x1, y2, x2, y2));
                            tt = Math.min(tt, this.intersect(rx, ry, rx + obj.vx, ry + obj.vy, x1, y1, x1, y2));
                            tt = Math.min(tt, this.intersect(rx, ry, rx + obj.vx, ry + obj.vy, x2, y1, x2, y2));
                            if (tt < best) {
                                best = tt;
                                bestAng = ang;
                            }
                        }
                        if (best <= 1.0) {
                            obj.x += obj.vx * best;
                            obj.y += obj.vy * best;
                            var dx = Math.cos(bestAng)
                            var dy = Math.sin(bestAng)
                            var s = obj.vx * dx + obj.vy * dy;
                            obj.vx -= s * dx * 2;
                            obj.vy -= s * dy * 2;
                            obj.x += obj.vx * (1.0 - best);
                            obj.y += obj.vy * (1.0 - best);
                            collision = true;
                            obj2.vis = false;

                            if (obj2.color == 0) { // Type 0 = faster.
                                var a = Math.atan2(obj.vy, obj.vx);
                                var newSpeed = 35;
                                obj.vx = newSpeed*Math.cos(a);
                                obj.vy = newSpeed*Math.sin(a);
                            } else if ((obj2.color == 1)||obj2.color == 2)  {
                                if (obj.lastPlayer < 2) {
                                    this.objects[obj.lastPlayer].curPrize = obj2.color;
                                    this.objects[obj.lastPlayer].curPrizeTicks = 200; 
                                }
                            }

                            obj.lastPlayer = 2;
                            this.hit = true;
                            break;
                        }
                    }
                }
                if (!collision) {
                    obj.x += obj.vx;
                    obj.y += obj.vy;
                }

                obj.x = this.mround(obj.x);
                obj.y = this.mround(obj.y);
                obj.vx = this.mround(obj.vx);
                obj.vy = this.mround(obj.vy);

                var speed = Math.sqrt(obj.vx * obj.vx + obj.vy * obj.vy);
                if (speed > 20) {
                    obj.vx *= 0.995;
                    obj.vy *= 0.995;
                }

                var rad = obj.rad
                if (obj.x - rad < 0) {
                    obj.x = rad * 2 - obj.x;
                    obj.vx = -obj.vx;
                }
                if (obj.x + rad > this.field.width) {
                    obj.x = (this.field.width - rad) * 2 - obj.x;
                    obj.vx = -obj.vx;
                }

                if (obj.y + rad * 2 < 0) {
                    // Player 1 wins!!
                    this.objects[0].score++;
                    this.throwBall();
                    this.lose = true;
                }
                if (obj.y - rad * 2 > this.field.height) {
                    // Player 2 wins!!
                    this.objects[1].score++;
                    this.throwBall();
                    this.lose = true;
                }
                var player1 = this.objects[0];
                if ((obj.vy < 0) && (obj.y - rad < player1.y + player1.height) && (Math.abs(player1.x - obj.x) <= player1.width / 2)) {
                    // Player 1 bounce
                    this.batBounce(player1);
                    obj.lastPlayer = 0;
                    this.hit = true;
                }

                var player2 = this.objects[1];
                if ((obj.vy > 0) && (obj.y + rad > player2.y - player2.height) && (Math.abs(player2.x - obj.x) <= player2.width / 2)) {
                    // Player 2 bounce
                    this.batBounce(player2);
                    obj.lastPlayer = 1;
                    this.hit = true;
                }

                obj.x = this.mround(obj.x);
                obj.y = this.mround(obj.y);
                obj.vx = this.mround(obj.vx);
                obj.vy = this.mround(obj.vy);
            }

        this.updateBlock = function(obj) {
            if (obj.vis) {
                if (obj.size<1.0)obj.size+=0.07;
                else obj.size = 1.0;
            }
            if (!obj.vis) {
                if (obj.size>0.0)obj.size-=0.5;
                else obj.size = 0.0;
            }
        }
        this.updatePlayer = function(obj) {
            if (obj.curPrize==1) {
                if (obj.size<1.5) obj.size+=0.05;
                else obj.size = 1.5;
            } else
            if (obj.curPrize==2) {
                if (obj.size>0.6)obj.size-=0.03;
                else obj.size = 0.6;
            } else {
                if (obj.size<1.0)
                    obj.size = Math.min(1.0, obj.size+0.03);
                else obj.size = Math.max(1.0, obj.size-0.05);
            }
        }
        this.update = function () {
            this.lastUpdated = new Date().getTime();
            //update physics
            var i;
            for (i = 0; i < this.objects.length; i++) {
                var obj = this.objects[i];

                if (obj.type == "ball") {
                    this.updateBall(obj)
                }
                if (obj.type == "block") {
                    this.updateBlock(obj)
                }
                if (obj.type == "player") {
                    this.updatePlayer(obj)
                }
            }
        }
    }
}
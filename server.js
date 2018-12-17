'use strict';
const WebSocket = require('ws'),
server = new WebSocket.Server({ port: 40510 }),
express = require('express'),
ent = require('ent'),
encode = require('ent/encode'),
decode = require('ent/decode'),
app = express(),
MAP = {x:6080, y:2400},
playerLength = 100,
THRUST = 1.7,

particle = {
	id:0,x:0,y:0,vx:0,vy:0,gravity:0,friction:0.95,
	speed:0,direction:0,width:100,height:100,hp:0,
	create: function(x, y, speed, direction, grav){
		const obj = Object.create(this);
		obj.x = x;
		obj.y = y;
		obj.vx = Math.cos(direction) * speed;
		obj.vy = Math.sin(direction) * speed;
		obj.gravity = grav || 0;
		return obj;
	},

	accelerate: function(ax, ay) {
		this.vx += ax;
		this.vy += ay;
	},

	update: function() {
		this.vx *= this.friction;
		this.vy *= this.friction;
		this.vy += this.gravity;
		this.x += Math.trunc(this.vx);
		this.y += Math.trunc(this.vy);
	}
};

let users = [];
let balls = [];

let leaderboard = [];
let leaderboardChange = false;

app.use(express.static(__dirname + '/public'));

function createId(len = 12, chars = 'abcdefghjkmnopqrstvwxyz01234567890') {
	let id = '';
	while (len--) id += chars[Math.random() * chars.length | 0];
	return id;
}

function randomInt(min, max) {
	return Math.floor(min + Math.random() * (max - min + 1));
}

function inRange(value, min, max) {
	return value >= Math.min(min, max) && value <= Math.max(min, max);
}

function pointInRect(x, y, rect) {
	return inRange(x, rect.x, rect.x + rect.width) &&
		inRange(y, rect.y, rect.y + rect.height);
}

function rangeIntersect(min0, max0, min1, max1) {
	return Math.max(min0, max0) >= Math.min(min1, max1) && 
		Math.min(min0, max0) <= Math.max(min1, max1);
}

function rectIntersect(r0, r1) {
	return rangeIntersect(r0.x, r0.x + r0.width, r1.x, r1.x + r1.width) &&
		rangeIntersect(r0.y, r0.y + r0.height, r1.y, r1.y + r1.height);
}

const rects = [];
rects.push({x:0, y:-400, width:1040, height:50});
rects.push({x:1540, y:-400, width:1000, height:50});
rects.push({x:3540, y:-400, width:1000, height:50});
rects.push({x:MAP.x-1040, y:-400, width:1040, height:50});

server.on('connection', (ws, req) => {
	const currentPlayer = particle.create(0, -playerLength, 0, 0, 1);
	const currentPlayerMin = {id:0, x:0, y:0, hp:0, score:0};
	const ip = req.connection.remoteAddress;
	const DIRECTION = {LEFT:0, RIGHT:0, DOWN:0, UP:0};
	const thrust = {x:0, y:0};
	let username;
	let DATA = 0;
	let isShoot = 0;
	console.log('[INFO] #'+currentPlayerMin.id+' s\'est connecté');
	
	ws.on('message', data => {
		DATA = JSON.parse(data);
		if (DATA.username) {
			username = ent.encode(DATA.username);
			
			currentPlayerMin.id = createId();
			currentPlayer.x = 0;//randomInt(0, MAP.x-playerLength); 
			currentPlayer.y = -100;
			currentPlayerMin.hp = 100;
			currentPlayerMin.username = ent.decode(username);
			currentPlayerMin.score = 0;

			console.log(currentPlayerMin);

			if (users.indexOf(currentPlayerMin) < 0) {
				users.push(currentPlayerMin);
				ws.send(JSON.stringify({id:currentPlayerMin.id}));
				server.clients.forEach(client => {
					client.send(JSON.stringify({users:users}));
				});
				console.log('[INFO] #'+currentPlayerMin.username+' a rejoint');
			}	
		}

		if (DATA.isShoot && DATA.angle && currentPlayerMin.hp > 0) {
			let bullet = particle.create(currentPlayer.x+50, currentPlayer.y+50, 25, DATA.angle);
			bullet.id = currentPlayerMin.id;
			server.clients.forEach(client => {
				if(client.readyState === WebSocket.OPEN) {
					client.send(JSON.stringify({bullet:{x:bullet.x, y:bullet.y, angle:DATA.angle}}));
				}
			});
			bullet.friction = 0.98;
			bullet.id = currentPlayerMin.id;
			bullet.width = 8;
			bullet.height = 8;
			balls.push(bullet);
			bullet.update();
		}
		
		if(DATA.DIRECTION){
			DIRECTION.LEFT = DATA.DIRECTION.LEFT;
			DIRECTION.RIGHT = DATA.DIRECTION.RIGHT;
			DIRECTION.DOWN = DATA.DIRECTION.DOWN;
			DIRECTION.UP = DATA.DIRECTION.UP;
		}

		//thrust.x = DIRECTION.LEFT ? -THRUST : 0;
		//thrust.x = DIRECTION.LEFT ? THRUST : 0;
		if (DIRECTION.LEFT) thrust.x = -THRUST;
		else if (!DIRECTION.RIGHT) thrust.x = 0;
		if (DIRECTION.RIGHT) thrust.x = THRUST;
		else if (!DIRECTION.LEFT) thrust.x = 0;

		if (DIRECTION.UP) {
			thrust.y = -2;
			currentPlayer.vy = -5;
		} 
		else if (currentPlayer.vy <= -5) {
			thrust.y = 0;
		}
	});

	setInterval(()=> {
		if (currentPlayer.x <= 0) currentPlayer.x = 0;
		if (currentPlayer.x >= MAP.x-playerLength) currentPlayer.x = MAP.x-playerLength;
		
		if (currentPlayer.y >= -playerLength) {
			currentPlayer.y = -playerLength;
			currentPlayer.gravity = 0;
		}
		else if (rectIntersect(currentPlayer, rects[0]) && currentPlayer.y >= rects[0].y) {
			currentPlayer.y = rects[0].y;
			currentPlayer.gravity = 0;
		}
		else if (rectIntersect(currentPlayer, rects[1]) && currentPlayer.y >= rects[1].y) {
			currentPlayer.y = rects[1].y;
			currentPlayer.gravity = 0;
		}
		else if (rectIntersect(currentPlayer, rects[2]) && currentPlayer.y >= rects[2].y) {
			currentPlayer.y = rects[2].y;
			currentPlayer.gravity = 0;
		}
		else if (rectIntersect(currentPlayer, rects[3]) && currentPlayer.y >= rects[3].y) {
			currentPlayer.y = rects[3].y;
			currentPlayer.gravity = 0;
		}
		else {
			currentPlayer.gravity = 1;
		}

		if (currentPlayerMin.hp > 0) {
			currentPlayer.accelerate(thrust.x, thrust.y);
			currentPlayer.update();
		}
		
		currentPlayerMin.x = currentPlayer.x;
		currentPlayerMin.y = currentPlayer.y;;


		for (let i = 0; i < balls.length; i++) {
			balls[i].update();
			if (pointInRect(balls[i].x, balls[i].y, currentPlayer) && balls[i].id != currentPlayerMin.id) {
				balls = balls.filter(ball=>!pointInRect(ball.x, ball.y, currentPlayer));
				currentPlayerMin.hp -= 30;
			}
		}
		balls = balls.filter(ball=>(Math.abs(ball.vx)>5||Math.abs(ball.vy)>5));
	}, 16);


	setInterval(()=> {
		if(ws.readyState === WebSocket.OPEN) {
			server.clients.forEach(client => {client.send(JSON.stringify({users:users}));});
		}

		if (currentPlayerMin.hp < 0) {
			server.clients.forEach(client => {client.send(JSON.stringify({users:users}));});			
			setTimeout(()=>{users = users.filter(user=>user.id != currentPlayerMin.id);}, 200);
		}
	}, 33);

	setInterval(()=> {
		if (users.length>0) {
			users.sort((a, b)=>{return b.score-a.score;})
			const topUsers = [];
			for (let i = 0; i < Math.min(5, users.length); i++) {
				topUsers.push({id:users[i].id, username:users[i].username, score:users[i].score});
			}

			if (isNaN(leaderboard) || leaderboard.leaderboard !== topUsers.length) {
				leaderboard = topUsers;
				leaderboardChange = true;
			} else {
				for (let i = 0; i < leaderboard.length; i++) {
					if (leaderboard[i].id != topUsers[i].id) {
						leaderboard = topUsers;
						leaderboardChange = true;
						break;
					}
				}
			}
		}
	}, 2500);

	ws.on('close', () => {
		if (currentPlayerMin.hp > 0) users.splice(users.indexOf(currentPlayerMin), 1);
		server.clients.forEach(client => {
			client.send(JSON.stringify({users:users}));
		});
		console.log('[INFO] #'+currentPlayerMin.id+' s\'est déconnecté');
	});
});
app.listen(8080);
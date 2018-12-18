'use strict';
(()=>{
	const ws = new WebSocket('ws://localhost:40510'),
	canvas = document.getElementById('canvas'),
	context = canvas.getContext('2d'),
	currentPlayer = particle.create(0, 0, 0, 0),
	thrust = {x:0, y:0},
	MAP = {x:6080, y:2400},
	DIRECTION = {LEFT:0, RIGHT:0, UP:0, DOWN:0};

	const form = document.getElementById('form');
	const playerNameInput = document.getElementById('playerNameInput');
	const startMenuWrapper = document.getElementById('startMenuWrapper');

	const playerLength = 100;
	const THRUST = 1.7;

	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	currentPlayer.friction = 0.8;
	currentPlayer.hp = 0;

	let currentPlayerID = 0,
	users = [],
	ballsServer = [],
	data = 0,
	angle = 0;

	const rects = [];

	rects.push({x:0, y:-300, width:1040, height:50});
	rects.push({x:1540, y:-300, width:1000, height:50});
	rects.push({x:3540, y:-300, width:1000, height:50});
	rects.push({x:MAP.x-1040, y:-300, width:1040, height:50});

	ws.onopen = () => {
		console.log('connected');
	}

	ws.onmessage = event => {
		data = JSON.parse(event.data);
		if (data.id) currentPlayerID = data.id;
		if (data.users) users = data.users;
		if (data.bullet) shoot(data.bullet.x, data.bullet.y, data.bullet.angle, ballsServer);
	}

	ws.onclose = () => console.log('disconnected');

	form.addEventListener('submit', event => {
		event.preventDefault();
		if ((playerNameInput.value).length >= 4 && (playerNameInput.value).length <= 16) {
			if (ws.readyState == 1) {
				ws.send(JSON.stringify({username:playerNameInput.value}));
			}
		}
	});

	function drawRotatedRect(x, y, width, height, angleInRad, axisX, axisY) {
		context.save();
		context.translate(x, y);
		context.rotate(angleInRad);
		context.fillRect(-axisX, -axisY, width, height);
		context.restore();
	}

	function drawPerso(perso, angleInRad, fillColor, strokeColor){
		context.fillStyle = fillColor;
		context.strokeStyle = strokeColor;
		context.fillRect(perso.x, perso.y, playerLength, perso.hp);
		context.fillStyle = 'black';
		context.strokeRect(perso.x, perso.y, playerLength, playerLength);
		drawRotatedRect(perso.x+playerLength*.5, perso.y+playerLength*.5, 100, 20, angleInRad, 0, 10);
		context.fillText(perso.username, perso.x+20, perso.y-20);
	}

	function drawBalls(balls, color){
		context.fillStyle = color;
		const length = balls.length;
		for (let i = 0; i < length; i++) {
			context.beginPath();
			context.arc(balls[i].x, balls[i].y, 10, 0, Math.PI*2, false);
			context.fill();
			balls[i].update();
		}
	}

	function shoot(x, y, angle, balls){
		const bullet = particle.create(x, y, 55, angle);
		bullet.friction = 0.98;
		balls.push(bullet);
	}

	function render(){
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;
		context.lineWidth = 4;

		if (currentPlayer.x <= 0) currentPlayer.x = 0; 
		if (currentPlayer.x >= MAP.x-playerLength) currentPlayer.x = MAP.x-playerLength; 
		context.clearRect(0, 0, canvas.width, canvas.height);
		context.save();
		context.translate(canvas.width*.5-currentPlayer.x-playerLength*.5, canvas.height*.5-currentPlayer.y-playerLength*.5);
		context.strokeStyle='#8C8C8C';
		context.fillStyle='#BBBBBB';	
		for (let i = 0; i < rects.length; i++) {	
			context.strokeRect(rects[i].x, rects[i].y, rects[i].width, 50);
			context.fillRect(rects[i].x, rects[i].y, rects[i].width, 50);
		}
		for (let i = 0; i < users.length; i++) {
			if (users[i].id != currentPlayerID) {
				drawPerso(users[i], 0, 'red', 'darkred');
			} else {
				drawPerso(users[i], angle, 'green', 'darkgreen');
				//current player infos from the serv
				currentPlayer.x = users[i].x;
				currentPlayer.y = users[i].y;
				currentPlayer.hp = users[i].hp;
				if (currentPlayer.hp <= 0) {
					startMenuWrapper.hidden = false;
				}
				else {
					startMenuWrapper.hidden = true;
				}
			}
		}
		/*
		local calcul usefull for prediction
		particle.accelerate(thrust.x, thrust.y);
		particle.update();*/
		drawBalls(ballsServer, 'red');
		ballsServer = ballsServer.filter(ballServer=>Math.abs(ballServer.vx)>5||Math.abs(ballServer.vy)>5);
		context.strokeStyle = 'black';
		context.strokeRect(0, -MAP.y, MAP.x, MAP.y);
		context.restore();
		context.fillText(currentPlayer.x, 10, 10);
		context.fillText(currentPlayer.y, 10, 30);
		context.fillText('hp: '+currentPlayer.hp, 10, 50);
	}

	(function animLoop(){
		render();
		window.requestAnimationFrame(animLoop, canvas);
	})();

	document.body.addEventListener('mousemove', event => {
		angle = Math.atan2(event.clientY-canvas.height*.5, event.clientX-canvas.width*.5);
	});
	
	document.body.addEventListener('mousedown', event =>{
		if (ws.readyState == 1 && event.buttons == 1) {
			ws.send(JSON.stringify({isShoot:true, angle:angle}));
		}
		shoot(currentPlayer.x+playerLength*.5, currentPlayer.y+playerLength*.5, angle, balls);
	});
	// set thrust to calcul position of current player locally
	document.addEventListener('keydown', event =>{
		switch(event.key){
			case 'z': case 'Z': case 'ArrowUp':
				DIRECTION.UP = 1;
				//thrust.y = -1;
				break;
			case 's': case 'S': case 'ArrowDown':
				DIRECTION.DOWN = 1;
				//thrust.y = 1;
				break;
			case 'd': case 'D': case 'ArrowRight':
				DIRECTION.RIGHT = 1;
				//thrust.x = THRUST;
				break;
			case 'q': case 'Q': case 'ArrowLeft':
				DIRECTION.LEFT = 1;
				//thrust.x = -THRUST;
				break;
			default: return false;
		}
		if (ws.readyState == 1) ws.send(JSON.stringify({DIRECTION:DIRECTION}));
		return false;
	});
	// same here
	document.addEventListener('keyup',  event =>{
		switch(event.key) {
			case 'z': case 'Z': case 'ArrowUp':
				DIRECTION.UP = 0;
				//thrust.y = 0;
				break;
			case 's': case 'S': case 'ArrowDown':
				DIRECTION.DOWN = 0;
				//thrust.y = 0;
				break;
			case 'd': case 'D': case 'ArrowRight':
				DIRECTION.RIGHT = 0;
				//thrust.x = 0;
				break;
			case 'q': case 'Q': case 'ArrowLeft':
				DIRECTION.LEFT = 0;
				//thrust.x = 0;
				break;
			default: return false;
		}
		if (ws.readyState == 1) ws.send(JSON.stringify({DIRECTION:DIRECTION}));
		return false;
	});
})();

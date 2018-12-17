const particle = {
	x:0,y:0,vx:0,vy:0,width:100,height:100,friction:1,gravity:0,
	create: function(x, y, speed, direction, grav) {
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

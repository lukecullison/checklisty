(function() {
  const canvas = document.getElementById('confetti-canvas');
  const ctx = canvas.getContext('2d');
  let particles = [];
  let animationId = null;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  window.addEventListener('resize', resize);
  resize();

  const colors = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#14b8a6', '#ffffff'];

  class Particle {
    constructor(x, y) {
      this.x = x || Math.random() * canvas.width;
      this.y = y || -10;
      this.size = Math.random() * 10 + 5;
      this.speedX = (Math.random() - 0.5) * 8;
      this.speedY = Math.random() * 4 + 2;
      this.color = colors[Math.floor(Math.random() * colors.length)];
      this.rotation = Math.random() * 360;
      this.rotationSpeed = (Math.random() - 0.5) * 10;
      this.opacity = 1;
      this.shape = Math.random() > 0.5 ? 'rect' : 'circle';
    }

    update() {
      this.x += this.speedX;
      this.y += this.speedY;
      this.speedY += 0.1;
      this.rotation += this.rotationSpeed;
      this.opacity -= 0.005;
    }

    draw() {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate((this.rotation * Math.PI) / 180);
      ctx.globalAlpha = Math.max(0, this.opacity);
      ctx.fillStyle = this.color;

      if (this.shape === 'rect') {
        ctx.fillRect(-this.size / 2, -this.size / 4, this.size, this.size / 2);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles = particles.filter(p => p.opacity > 0 && p.y < canvas.height + 50);

    particles.forEach(p => {
      p.update();
      p.draw();
    });

    if (particles.length > 0) {
      animationId = requestAnimationFrame(animate);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  function burst(count = 100, originX, originY) {
    for (let i = 0; i < count; i++) {
      const p = new Particle(originX, originY);
      p.speedX = (Math.random() - 0.5) * 20;
      p.speedY = (Math.random() - 0.5) * 20 - 5;
      p.size = Math.random() * 12 + 6;
      particles.push(p);
    }
    if (!animationId) animate();
  }

  function rain(count = 150) {
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        particles.push(new Particle());
      }, Math.random() * 1000);
    }
    if (!animationId) animate();
  }

  window.confetti = { burst, rain };
})();

(function() {
  let container = null;

  function getContainer() {
    if (!container) {
      container = document.createElement('div');
      container.id = 'confetti-container';
      container.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999;overflow:hidden;';
      document.body.appendChild(container);
    }
    return container;
  }

  const colors = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#14b8a6', '#ffffff', '#ff6b6b', '#ffd93d'];

  function createPiece(x, y, burst) {
    const piece = document.createElement('div');
    const size = Math.random() * 10 + 6;
    const color = colors[Math.floor(Math.random() * colors.length)];
    const isCircle = Math.random() > 0.5;
    const drift = (Math.random() - 0.5) * (burst ? 300 : 150);
    const fallDistance = Math.random() * 400 + 300;
    const rotation = Math.random() * 720 - 360;
    const duration = Math.random() * 1500 + 1000;

    piece.style.cssText = `
      position: absolute;
      left: ${x}px;
      top: ${y}px;
      width: ${size}px;
      height: ${isCircle ? size : size * 0.6}px;
      background: ${color};
      border-radius: ${isCircle ? '50%' : '2px'};
      opacity: 1;
      pointer-events: none;
    `;

    getContainer().appendChild(piece);

    const anim = piece.animate([
      { transform: `translate(0, 0) rotate(0deg)`, opacity: 1 },
      { transform: `translate(${drift / 2}px, ${fallDistance * 0.3}px) rotate(${rotation / 2}deg)`, opacity: 0.8, offset: 0.3 },
      { transform: `translate(${drift}px, ${fallDistance}px) rotate(${rotation}deg)`, opacity: 0 }
    ], {
      duration: duration,
      easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      fill: 'forwards'
    });

    anim.onfinish = () => piece.remove();
  }

  function burst(count, x, y) {
    const container = getContainer();
    const rect = container.getBoundingClientRect();
    const cx = x || rect.width / 2;
    const cy = y || rect.height / 2;

    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        createPiece(cx, cy, true);
      }, Math.random() * 300);
    }
  }

  function rain(count) {
    const container = getContainer();
    const width = container.getBoundingClientRect().width;

    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        createPiece(Math.random() * width, -20, false);
      }, Math.random() * 1500);
    }
  }

  window.confetti = { burst, rain };
})();

(function() {
  var canvas = document.getElementById("universe");
  if (!canvas) return;

  var ctx = canvas.getContext("2d");
  var width, height, starCount;
  var stars = [];
  
  // 调整颜色，稍微偏蓝一点，看起来更像星空而不是头皮屑
  var giantColor = "180,184,240";
  var starColor = "226,225,242"; 
  var cometColor = "226,225,224";

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    // 减少星星数量，避免过于密集
    starCount = width * 0.15; 
    
    stars = [];
    for (var i = 0; i < starCount; i++) {
      var newStar = new Star();
      newStar.reset();
      stars.push(newStar);
    }
  }

  function Star() {//
    this.reset = function() {
      this.giant = getProbability(3);
      this.comet = this.giant || firstRun ? false : getProbability(10);
      this.x = getRand(0, width - 10);
      this.y = getRand(0, height);
      this.r = getRand(1.1, 2.6);
      this.dx = getRand(0.05, 0.2) + (this.comet ? 2 : 0);
      this.dy = -getRand(0.05, 0.2) - (this.comet ? 2 : 0);

      this.fadingOut = null;
      this.fadingIn = true;
      this.opacity = 0;
      this.opacityTresh = getRand(0.5, 0.9);
      this.do = getRand(0.0005, 0.002) + (this.comet ? 0.001 : 0);

      // 正弦呼吸参数
      this.pulseBase = getRand(0.15, 0.35);
      this.pulseRange = getRand(0.15, 0.4);
      this.pulseSpeed = getRand(0.0015, 0.0035);
      this.pulsePhase = Math.random() * Math.PI * 2;
    };
// ...existing code...
    this.pulse = function() {
      if (!this.fadingIn && !this.fadingOut && !this.comet) {
        var t = Date.now();
        this.opacity =
          this.pulseBase +
          Math.sin(t * this.pulseSpeed + this.pulsePhase) * this.pulseRange;
        this.opacity = Math.max(0.05, Math.min(this.opacity, 1));
      }
    };
  }

  function getProbability(percents) {
    return ((Math.floor(Math.random() * 1000) + 1) < (percents * 10));
  }

  function getRand(min, max) {
    return Math.random() * (max - min) + min;
  }

  var firstRun = true;
  resize();
  firstRun = false;
  
  window.addEventListener("resize", resize, false);

  function render() {
    // 仅在暗色模式下绘制
    if (document.documentElement.getAttribute('data-theme') === 'dark') {
      ctx.clearRect(0, 0, width, height);
      for (var i = 0; i < stars.length; i++) {
        stars[i].move();
        stars[i].fadeIn();
        stars[i].fadeOut();
        stars[i].pulse(); // 调用闪烁
        stars[i].draw();
      }
    }
    window.requestAnimationFrame(render);
  }
  
  render();
})();
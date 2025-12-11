(function() {
  var canvas = document.getElementById("universe");
  if (!canvas) return;

  var ctx = canvas.getContext("2d");
  var width, height, starCount;
  var stars = [];
  var giantColor = "180,184,240";
  var starColor = "30,144,255";
  var cometColor = "226,225,224";

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    starCount = width * 0.216;
    
    stars = [];
    for (var i = 0; i < starCount; i++) {
      var newStar = new Star();
      newStar.reset();
      stars.push(newStar);
    }
  }

  function Star() {
    this.reset = function() {
      this.giant = getProbability(3);
      this.comet = this.giant || firstRun ? false : getProbability(10);
      this.x = getRand(0, width - 10);
      this.y = getRand(0, height);
      this.r = getRand(1.1, 2.6);
      this.dx = getRand(0.05, 0.3) + (this.comet ? 2 : 0);
      this.dy = -getRand(0.05, 0.3) - (this.comet ? 2 : 0);
      this.fadingOut = null;
      this.fadingIn = true;
      this.opacity = 0;
      this.opacityTresh = getRand(0.2, 1 - (this.comet ? 0.4 : 0));
      this.do = getRand(0.0005, 0.002) + (this.comet ? 0.001 : 0);
    };
    this.fadeIn = function() {
      if (this.fadingIn) {
        this.fadingIn = this.opacity <= this.opacityTresh;
        this.opacity += this.do;
      }
    };
    this.fadeOut = function() {
      if (this.fadingOut) {
        this.fadingOut = this.opacity >= 0;
        this.opacity -= this.do / 2;
        if (this.x > width || this.y < 0) {
          this.fadingOut = false;
          this.reset();
        }
      }
    };
    this.draw = function() {
      ctx.beginPath();
      if (this.giant) {
        ctx.fillStyle = "rgba(" + giantColor + "," + this.opacity + ")";
        ctx.arc(this.x, this.y, 2, 0, 2 * Math.PI, false);
      } else if (this.comet) {
        ctx.fillStyle = "rgba(" + cometColor + "," + this.opacity + ")";
        ctx.arc(this.x, this.y, 1.5, 0, 2 * Math.PI, false);
        for (var i = 0; i < 30; i++) {
          ctx.fillStyle = "rgba(" + cometColor + "," + (this.opacity - (this.opacity / 20) * i) + ")";
          ctx.rect(this.x - (this.dx / 4) * i, this.y - (this.dy / 4) * i - 2, 2, 2);
          ctx.fill();
        }
      } else {
        ctx.fillStyle = "rgba(" + starColor + "," + this.opacity + ")";
        ctx.rect(this.x, this.y, this.r, this.r);
      }
      ctx.closePath();
      ctx.fill();
    };
    this.move = function() {
      this.x += this.dx;
      this.y += this.dy;
      if (this.fadingOut === false) {
        this.reset();
      }
      if (this.x > width - (width / 4) || this.y < 0) {
        this.fadingOut = true;
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
        stars[i].draw();
      }
    }
    window.requestAnimationFrame(render);
  }
  
  render();
})();


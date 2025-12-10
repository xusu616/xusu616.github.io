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
    starCount = width * 0.1; 
    
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
      // 减慢移动速度，看起来更优雅
      this.dx = getRand(0.05, 0.2) + (this.comet ? 2 : 0);
      this.dy = -getRand(0.05, 0.2) - (this.comet ? 2 : 0);
      
      this.fadingOut = null;
      this.fadingIn = true;
      this.opacity = 0;
      this.opacityTresh = getRand(0.2, 1 - (this.comet ? 0.4 : 0));
      this.do = getRand(0.0005, 0.002) + (this.comet ? 0.001 : 0);
      
      // 新增：闪烁参数
      this.pulseDir = 1; // 1 变亮, -1 变暗
      this.pulseSpeed = getRand(0.005, 0.02); // 闪烁速度
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

    // 新增：闪烁逻辑
    this.pulse = function() {
      // 只有在不是淡入也不是淡出的时候才闪烁
      if (!this.fadingIn && !this.fadingOut && !this.comet) {
        this.opacity += this.pulseSpeed * this.pulseDir;
        
        // 到达最大亮度或最小亮度时反转方向
        if (this.opacity >= this.opacityTresh) {
          this.opacity = this.opacityTresh;
          this.pulseDir = -1;
        } else if (this.opacity <= 0.2) { // 保持一个最低亮度，不要完全消失
          this.opacity = 0.2;
          this.pulseDir = 1;
        }
      }
    };

    this.draw = function() {
      ctx.beginPath();
      
      // 关键修改：添加发光效果，消除"实心点"的感觉
      if (this.giant) {
        ctx.fillStyle = "rgba(" + giantColor + "," + this.opacity + ")";
        ctx.shadowBlur = 15;
        ctx.shadowColor = "rgba(" + giantColor + ",1)";
        ctx.arc(this.x, this.y, 2, 0, 2 * Math.PI, false);
      } else if (this.comet) {
        ctx.fillStyle = "rgba(" + cometColor + "," + this.opacity + ")";
        ctx.shadowBlur = 10;
        ctx.shadowColor = "rgba(" + cometColor + ",1)";
        ctx.arc(this.x, this.y, 1.5, 0, 2 * Math.PI, false);
        
        // 彗星尾巴
        for (var i = 0; i < 30; i++) {
          ctx.fillStyle = "rgba(" + cometColor + "," + (this.opacity - (this.opacity / 20) * i) + ")";
          ctx.rect(this.x - (this.dx / 4) * i, this.y - (this.dy / 4) * i - 2, 2, 2);
          ctx.fill();
        }
      } else {
        // 普通星星
        ctx.fillStyle = "rgba(" + starColor + "," + this.opacity + ")";
        // 给普通星星也加一点微弱的光晕
        ctx.shadowBlur = 5; 
        ctx.shadowColor = "rgba(255, 255, 255, 0.5)";
        ctx.rect(this.x, this.y, this.r, this.r);
      }
      
      ctx.closePath();
      ctx.fill();
      // 重置阴影，避免影响性能
      ctx.shadowBlur = 0;
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
        stars[i].pulse(); // 调用闪烁
        stars[i].draw();
      }
    }
    window.requestAnimationFrame(render);
  }
  
  render();
})();
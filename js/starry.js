(function() {
  var canvas = document.getElementById("universe");
  if (!canvas) return;

  var ctx = canvas.getContext("2d");
  var width, height, starCount;
  var stars = [];
  var giantColor = "180,184,240";
  var starColor = "30,144,255";
  var cometColor = "226,225,224";

  // 缓存暗色模式检测结果，避免每帧重复计算
  var darkMode = false;
  function updateDarkMode() {
    var html = document.documentElement;
    darkMode = !!(
      html.getAttribute('data-theme') === 'dark' ||
      window.matchMedia('(prefers-color-scheme: dark)').matches ||
      html.dataset.darkreaderScheme === 'dark'
    );
  }

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    starCount = width * 0.16;

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
      this.dx = getRand(0.12, 0.55) + (this.comet ? 3 : 0);
      this.dy = -getRand(0.12, 0.55) - (this.comet ? 3 : 0);
      this.fadingOut = null;
      this.fadingIn = true;
      this.opacity = 0;
      this.opacityTresh = getRand(0.2, 1 - (this.comet ? 0.4 : 0));
      this.do = getRand(0.001, 0.003) + (this.comet ? 0.002 : 0);
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
      if (this.giant) {
        ctx.beginPath();
        ctx.fillStyle = "rgba(" + giantColor + "," + this.opacity + ")";
        ctx.arc(this.x, this.y, 2, 0, 2 * Math.PI, false);
        ctx.fill();
      } else if (this.comet) {
        // 流星：每个尾迹段独立 beginPath/fill，避免路径累积
        // 先画尾迹（从远到近），再画头部
        for (var i = 17; i >= 0; i--) {
          ctx.beginPath();
          ctx.fillStyle = "rgba(" + cometColor + "," + (this.opacity - (this.opacity / 20) * i) + ")";
          ctx.rect(this.x - (this.dx / 4) * i, this.y - (this.dy / 4) * i - 2, 2, 2);
          ctx.fill();
        }
        // 头部
        ctx.beginPath();
        ctx.fillStyle = "rgba(" + cometColor + "," + this.opacity + ")";
        ctx.arc(this.x, this.y, 1.5, 0, 2 * Math.PI, false);
        ctx.fill();
      } else {
        // 普通星星：直接用 fillRect，跳过 path 构建
        ctx.fillStyle = "rgba(" + starColor + "," + this.opacity + ")";
        ctx.fillRect(this.x, this.y, this.r, this.r);
      }
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
  updateDarkMode();
  resize();
  firstRun = false;

  window.addEventListener("resize", function() {
    resize();
    updateDarkMode();
  }, false);

  // 监听暗色模式切换（主题按钮 / Dark Reader）
  var observer = new MutationObserver(function(mutations) {
    for (var i = 0; i < mutations.length; i++) {
      var attr = mutations[i].attributeName;
      if (attr === 'data-theme' || (attr && attr.startsWith('data-darkreader'))) {
        updateDarkMode();
        return;
      }
    }
  });
  observer.observe(document.documentElement, { attributes: true });

  // 监听系统暗色模式切换
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', updateDarkMode);

  function render() {
    if (darkMode) {
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

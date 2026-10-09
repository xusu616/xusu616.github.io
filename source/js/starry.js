(function() {
  var canvas = document.getElementById("universe");
  if (!canvas) return;

  var ctx = canvas.getContext("2d");
  var width, height, starCount;
  var stars = [];
  var giantColor = "180,184,240";
  var starColor = "30,144,255";
  var cometColor = "226,225,224";
  var html = document.documentElement;
  var systemDarkMode = window.matchMedia('(prefers-color-scheme: dark)');
  var storageKey = 'starry-mode';
  var mode = null;
  var visible = false;
  var animationFrame = null;
  var toggleButton;

  // 保存的开关只影响夜间模式；白天模式始终关闭星星。
  try {
    var savedMode = localStorage.getItem(storageKey);
    if (savedMode === 'on' || savedMode === 'off') mode = savedMode;
  } catch (error) {
    // 禁用存储时仍可在当前页面切换。
  }

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    starCount = Math.log( width ) * 10;

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
      this.comet = this.giant || firstRun ? false : getProbability(20);
      this.r = getRand(1.1, 2.6);
      this.dx = getRand(0.06, 0.1) + (this.comet ? 3 : 0);
      this.dy = -getRand(0.06, 0.1) - (this.comet ? 3 : 0);
      this.opacityTresh = getRand(0.2, 1 - (this.comet ? 0.4 : 0));
      this.do = getRand(0.0005, 0.002) + (this.comet ? 0.001 : 0);
      // 闪烁参数：每颗星星独立的频率和相位
      this.twinkleSpeed = getRand(0.03, 0.06);
      this.twinklePhase = getRand(0, Math.PI * 2);

      // 随机相位：每颗星星出生时处于生命週期的不同阶段，彻底避免同步
      var phase = Math.random();
      if (phase < 0.25) {
        // 刚诞生：渐显中，靠左
        this.x = getRand(0, width * 0.3);
        this.y = getRand(0, height);
        this.opacity = getRand(0, this.opacityTresh * 0.3);
        this.fadingIn = true;
        this.fadingOut = null;
      } else if (phase < 0.85) {
        // 壮年期：完全可见，屏幕各处巡航
        this.x = getRand(0, width);
        this.y = getRand(0, height);
        this.opacity = this.opacityTresh + getRand(0, 0.3);
        this.fadingIn = false;
        this.fadingOut = null;
      } else {
        // 暮年期：渐隐中，靠右/靠上，即将 reset
        this.x = getRand(width * 0.65, width);
        this.y = getRand(0, height * 0.3);
        this.opacity = getRand(0, this.opacityTresh);
        this.fadingIn = false;
        this.fadingOut = true;
      }
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
    this.twinkle = function() {
      // 流星不闪烁
      if (this.comet) return;
      // 正弦波闪烁 + 微量随机抖动，模拟自然星光
      this.twinklePhase += this.twinkleSpeed;
      var flicker = Math.sin(this.twinklePhase) * 0.01 + (Math.random() - 0.5) * 0.005;
      this.opacity += flicker;
      // 最低不低于目标透明度的一半，最高不超过 1.3
      var floor = this.opacityTresh * 0.3;
      if (this.opacity < floor) this.opacity = floor;
      if (this.opacity > 1.3) this.opacity = 1.3;
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
        for (var i = 0; i < 20; i++) {
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

  // 检测暗色模式：主题按钮 / 系统暗色 / Dark Reader 插件
  function isDarkMode() {
    // 博客明确选择的主题优先于系统和插件。
    var theme = html.getAttribute('data-theme');
    if (theme === 'light') return false;
    if (theme === 'dark') return true;
    // 系统暗色模式
    if (systemDarkMode.matches) return true;
    // Dark Reader: 仅夜间模式 (scheme=dark)，排除日间模式 (scheme=dimmed)
    if (html.dataset.darkreaderScheme === 'dark') return true;
    return false;
  }

  var firstRun = true;
  resize();
  firstRun = false;

  window.addEventListener("resize", resize, false);

  function render() {
    ctx.clearRect(0, 0, width, height);
    for (var i = 0; i < stars.length; i++) {
      stars[i].move();
      stars[i].fadeIn();
      stars[i].fadeOut();
      stars[i].twinkle();
      stars[i].draw();
    }
    animationFrame = window.requestAnimationFrame(render);
  }

  function updateVisibility() {
    var dark = isDarkMode();
    visible = dark && mode !== 'off';
    html.setAttribute('data-starry', visible ? 'on' : 'off');

    if (toggleButton) {
      toggleButton.hidden = !dark;
      var label = visible ? '隐藏星星' : '显示星星';
      toggleButton.title = label;
      toggleButton.setAttribute('aria-label', label);
      toggleButton.setAttribute('aria-pressed', String(visible));
    }

    if (visible && animationFrame === null) {
      render();
    } else if (!visible && animationFrame !== null) {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = null;
      ctx.clearRect(0, 0, width, height);
    }
  }

  function addToggleButton() {
    var rightside = document.getElementById('rightside-config-hide');
    if (!rightside || document.getElementById('starry-toggle')) return;

    toggleButton = document.createElement('button');
    toggleButton.id = 'starry-toggle';
    toggleButton.type = 'button';
    toggleButton.setAttribute('aria-controls', 'universe');
    toggleButton.innerHTML = '<i class="fas fa-star" aria-hidden="true"></i>';
    rightside.insertBefore(toggleButton, rightside.firstChild);
    toggleButton.addEventListener('click', function() {
      mode = visible ? 'off' : 'on';
      try {
        localStorage.setItem(storageKey, mode);
      } catch (error) {
        // 存储失败不影响按钮功能。
      }
      updateVisibility();
    });
    updateVisibility();
  }

  new MutationObserver(updateVisibility).observe(html, {
    attributes: true,
    attributeFilter: ['data-theme', 'data-darkreader-scheme']
  });
  systemDarkMode.addEventListener('change', updateVisibility);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addToggleButton, { once: true });
  } else {
    addToggleButton();
  }
  updateVisibility();
})();

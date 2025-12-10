(function() {
  // 等待 DOM 完全加载
  function init() {
    var canvas = document.getElementById("universe");
    if (!canvas) {
      console.error("Canvas element with id 'universe' not found!");
      return;
    }

    // 添加调试信息
    console.log("Canvas found:", canvas);
    console.log("Canvas dimensions:", canvas.width, canvas.height);

    var ctx = canvas.getContext("2d");
    var width, height, starCount;
    var stars = [];
    
    // ...existing code...

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      console.log("Resized to:", width, height); // 调试信息
      starCount = width * 0.1; 
      
      stars = [];
      for (var i = 0; i < starCount; i++) {
        var newStar = new Star();
        newStar.reset();
        stars.push(newStar);
      }
    }

    // ...existing code...

    var firstRun = true;
    resize();
    firstRun = false;
    
    window.addEventListener("resize", resize, false);

    function render() {
      if (document.documentElement.getAttribute('data-theme') === 'dark') {
        ctx.clearRect(0, 0, width, height);
        for (var i = 0; i < stars.length; i++) {
          stars[i].move();
          stars[i].fadeIn();
          stars[i].fadeOut();
          stars[i].pulse();
          stars[i].draw();
        }
      }
      window.requestAnimationFrame(render);
    }
    
    render();
  }

  // 确保 DOM 加载完成后再执行
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
/* ============================================================================
 * postfx.js — 《无限轮回》自包含手写后处理模块（不依赖 three.js examples）
 *
 * 依赖：全局 THREE（r150+ UMD 构建）。请确保本文件在 three.min.js 之后、
 * world2d.js / zone3d.js 之前加载。
 *
 * 暴露：window.PostFX
 *   - PostFX.attach(renderer, scene, camera) : 记录对象、建 RT + 全屏 quad、编译 shader
 *   - PostFX.ready                                  : attach 成功后为 true
 *   - PostFX.render()                               : 主 scene→后处理链→画到屏幕
 *   - PostFX.dispose()                              : 释放 RT/geometry/material
 *
 * 后处理链（场景已由 renderer 用 ACESFilmicToneMapping 色调映射，此处不再二次
 * tonemap，避免过曝）：
 *   主scene(自带相机) → rtB（原始场景）
 *            → [brightPass] rtB→rtA 亮度阈值提取高光（软阈值，保留 >0.82 高光）
 *            → [gaussBlur x2 rounds] rtA↔rtC 分离式高斯模糊（水平/垂直各 2 次）
 *            → [combine] rtB(原图)+rtA(模糊高光) 叠加 + 饱和度/对比度/曝光微调 → rtC
 *            → [vignette] rtC→屏幕 暗角（径向渐变压暗边缘），增强恐怖氛围
 * ========================================================================== */
(function () {
  "use strict";

  // ---- 全屏 quad 共享 shader ----
  // 顶点着色器：两个三角形覆盖 NDC(-1..1)，frag 里从 NDC 还原 UV。
  var POST_VS =
    "varying vec2 vUv;\n" +
    "void main() {\n" +
    "  vUv = uv;\n" +
    "  gl_Position = vec4(position.xy, 0.0, 1.0);\n" +
    "}\n";

  function PostFX() {
    this.ready = false;
    this._renderer = null;
    this._scene = null;      // 主场景（用场景自带相机渲染到 rtA）
    this._aspect = 0;        // 记录 attach 时的宽高比，供 ortho 相机使用
    this._quad = null;       // 全屏 Mesh
    this._camera = null;     // ortho 相机（渲染 fullscreen quad 用）
    this._postScene = null;
    this._rtA = null;
    this._rtB = null;
    this._rtC = null;
    this._width = 0;
    this._height = 0;

    // pass 顺序（后渲染的叠加到前面）: bright → blur → combine → vignette
    this._passes = [
      { name: "bright",   fsh: brightFS,    uniforms: null },
      { name: "blur",     fsh: gaussBlurFS, uniforms: null },
      { name: "combine",  fsh: combineFS,   uniforms: null },
      { name: "vignette", fsh: vignetteFS,  uniforms: null }
    ];
    this._mats = {};       // name -> ShaderMaterial
  }

  // ---- attach ----
  PostFX.prototype.attach = function (renderer, scene, camera) {
    var self = this;
    if (!renderer || !renderer.isWebGLRenderer) { console.warn("[PostFX] attach: 无效 renderer"); return false; }
    this._renderer = renderer;
    this._scene = scene;
    this._mainCam = camera;

    // 建 ortho 相机 + 空场景 + 全屏 quad
    this._camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this._postScene = new THREE.Scene();
    var geo = new THREE.BufferGeometry();
    // 6 个顶点（2 个覆盖屏幕的三角形），NDC -1..1，附带 uv
    geo.setAttribute("position", new THREE.Float32BufferAttribute([
      -1, -1, 0.5,  1, -1, 0.5,  1, 1, 0.5,
      -1, -1, 0.5,  1,  1, 0.5, -1, 1, 0.5
    ], 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute([
      0, 0,  1, 0,  1, 1,
      0, 0,  1, 1,  0, 1
    ], 2));

    // 按 pass 建材质
    this._mats = {};
    this._passes.forEach(function (p) {
      var uniforms = { tDiffuse: { value: null }, resolution: { value: new THREE.Vector2(1, 1) } };
      if (p.name === "bright") {
        uniforms.threshold = { value: 0.82 };
        uniforms.knee      = { value: 0.18 };
      } else if (p.name === "blur") {
        uniforms.direction = { value: new THREE.Vector2(1, 0) };
        uniforms.radius    = { value: 4.0 };
      } else if (p.name === "combine") {
        uniforms.bloomTex  = { value: null };
        uniforms.bloomStrength = { value: 0.55 };
        uniforms.saturation = { value: 1.05 };
        uniforms.contrast   = { value: 1.03 };
        uniforms.exposure   = { value: 1.0 };
      } else if (p.name === "vignette") {
        uniforms.vignetteStrength = { value: 0.55 };
        uniforms.vignetteRadius   = { value: 0.72 };
        uniforms.aspect = { value: 1.0 };
      }
      p.uniforms = uniforms;
      self._mats[p.name] = new THREE.ShaderMaterial({
        vertexShader: POST_VS,
        fragmentShader: p.fsh,
        uniforms: uniforms,
        depthTest: false,
        depthWrite: false
      });
    });

    this._quad = new THREE.Mesh(geo, this._mats["bright"]);
    this._quad.frustumCulled = false;
    this._postScene.add(this._quad);

    this.ready = true;
    return true;
  };

  // ---- 尺寸管理：RT 跟随 renderer 画布（×pixelRatio），不一致则重建 ----
  PostFX.prototype._ensureSize = function () {
    if (!this._renderer) return;
    var dpr = this._renderer.getPixelRatio ? this._renderer.getPixelRatio() : 1;
    var canvas = this._renderer.domElement;
    var w = Math.max(1, Math.round((canvas ? canvas.clientWidth : 0) * dpr));
    var h = Math.max(1, Math.round((canvas ? canvas.clientHeight : 0) * dpr));
    if (!w || !h) { w = 1280; h = 720; } // 兜底（canvas 尚未布局时）
    if (!this._rtA || this._width !== w || this._height !== h) {
      this._disposeRTs();
      this._width = w; this._height = h;
      this._rtA = this._makeRT(w, h);
      this._rtB = this._makeRT(w, h);
      this._rtC = this._makeRT(w, h);
      var res = new THREE.Vector2(0.5 / w, 0.5 / h);
      this._passes.forEach(function (p) {
        if (p.uniforms) {
          if (p.uniforms.resolution) p.uniforms.resolution.value.set(w, h);
          if (p.name === "vignette" && p.uniforms.aspect) p.uniforms.aspect.value = w / h;
        }
      });
    }
  };

  PostFX.prototype._makeRT = function (w, h) {
    return new THREE.WebGLRenderTarget(w, h, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType,
      depthBuffer: false,
      stencilBuffer: false
    });
  };

  PostFX.prototype._disposeRTs = function () {
    if (this._rtA) { try { this._rtA.dispose(); } catch (e) {} this._rtA = null; }
    if (this._rtB) { try { this._rtB.dispose(); } catch (e) {} this._rtB = null; }
    if (this._rtC) { try { this._rtC.dispose(); } catch (e) {} this._rtC = null; }
  };

  // ---- 用指定 pass 的材质，把全屏 quad 渲到 dst（uniform 需由调用方先设好）----
  PostFX.prototype._fullscreen = function (name, dst) {
    this._quad.material = this._mats[name];
    this._renderer.setRenderTarget(dst);
    this._renderer.render(this._postScene, this._camera);
  };

  // ---- render ----
  // 无副作用安全调用：未 attach / 无主场景时报错前返回。
  PostFX.prototype.render = function () {
    if (!this.ready || !this._renderer || !this._scene) return;

    var mainCam = this._mainCam || this._camera;
    this._ensureSize();
    if (!this._rtA || !this._rtB || !this._rtC) return;

    var rtA = this._rtA, rtB = this._rtB, rtC = this._rtC;

    // 1) 主 scene 渲染到 rtB（用场景自带相机），随后 rtB 视为“原始场景”
    var bright = this._mats["bright"];
    bright.uniforms.tDiffuse.value = null;
    this._renderer.setRenderTarget(rtB);
    this._renderer.render(this._scene, mainCam);

    // 2) brightPass: rtB -> rtA （亮度阈值提取高光）
    bright.uniforms.tDiffuse.value = rtB.texture;
    this._fullscreen("bright", rtA);

    // 3) 高斯模糊：先水平后垂直，交替 ping-pong（rtA <-> rtC），各 2 轮
    var blur = this._mats["blur"];
    for (var round = 0; round < 2; round++) {
      blur.uniforms.direction.value.set(1, 0);
      blur.uniforms.tDiffuse.value = rtA.texture;
      this._fullscreen("blur", rtC);                       // rtA -> rtC (水平)
      blur.uniforms.direction.value.set(0, 1);
      blur.uniforms.tDiffuse.value = rtC.texture;
      this._fullscreen("blur", rtA);                        // rtC -> rtA (垂直)
    }
    // 此时 rtA = 模糊高光（bloom），rtB = 原始场景

    // 4) combine: rtB(原图) + rtA(模糊高光) 叠加 + 饱和度/对比度微调 -> rtC
    var combine = this._mats["combine"];
    combine.uniforms.tDiffuse.value = rtB.texture;           // 原始场景
    combine.uniforms.bloomTex.value = rtA.texture;           // 模糊高光
    this._fullscreen("combine", rtC);

    // 5) vignette: rtC -> 屏幕（暗角压暗边缘）
    var vig = this._mats["vignette"];
    vig.uniforms.tDiffuse.value = rtC.texture;
    this._renderer.setRenderTarget(null);
    this._fullscreen("vignette", null);
  };

  // ---- dispose ----
  PostFX.prototype.dispose = function () {
    this._disposeRTs();
    if (this._quad) {
      try { this._quad.geometry.dispose(); } catch (e) {}
      try { if (this._quad.material) this._quad.material.dispose(); } catch (e) {}
      this._quad = null;
    }
    for (var k in this._mats) {
      if (this._mats[k]) { try { this._mats[k].dispose(); } catch (e) {} }
    }
    this._mats = {};
    this.ready = false;
    this._renderer = null;
    this._scene = null;
    this._mainCam = null;
    this._postScene = null;
    this._camera = null;
  };

  /* ======================================================================
   * 片元着色器
   * ==================================================================== */

  // 亮度阈值提取：带 knee 的软阈值，超出 threshold 的高光保留，并压缩过渡带。
  var brightFS =
    "uniform sampler2D tDiffuse;\n" +
    "uniform float threshold;\n" +
    "uniform float knee;\n" +
    "varying vec2 vUv;\n" +
    "void main() {\n" +
    "  vec3 c = texture2D(tDiffuse, vUv).rgb;\n" +
    "  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));\n" +
    "  float t = threshold;\n" +
    "  float k = max(knee, 1e-5);\n" +
    "  // knee 处的线性软阈值：低于 (t - 减量) 全 0，高于 (t + 减量) 全保留\n" +
    "  float over = l - t;\n" +
    "  float amt = clamp(over / (k * 2.0) + 0.5, 0.0, 1.0);\n" +
    "  float amt2 = amt * amt;\n" +
    "  vec3 result = c * amt2;\n" +
    "  gl_FragColor = vec4(result, 1.0);\n" +
    "}\n";

  // 分离式高斯模糊：沿 direction(水平/垂直) 采样 9 个点，加权求和。
  var gaussBlurFS =
    "uniform sampler2D tDiffuse;\n" +
    "uniform vec2 direction;\n" +
    "uniform vec2 resolution;\n" +
    "uniform float radius;\n" +
    "varying vec2 vUv;\n" +
    "void main() {\n" +
    "  vec2 px = direction / resolution;\n" +
    "  const float sigma = 2.0;\n" +
    "  vec3 sum = vec3(0.0);\n" +
    "  float wsum = 0.0;\n" +
    "  for (int i = -4; i <= 4; i++) {\n" +
    "    float f = float(i);\n" +
    "    float w = exp(-(f * f) / (2.0 * sigma * sigma));\n" +
    "    vec3 s = texture2D(tDiffuse, vUv + px * f * radius).rgb;\n" +
    "    sum += s * w;\n" +
    "    wsum += w;\n" +
    "  }\n" +
    "  gl_FragColor = vec4(sum / wsum, 1.0);\n" +
    "}\n";

  // 合成：原图 + 模糊高光（Bloom），并做饱和度 / 对比度 / 曝光微调。
  var combineFS =
    "uniform sampler2D tDiffuse;\n" +
    "uniform sampler2D bloomTex;\n" +
    "uniform float bloomStrength;\n" +
    "uniform float saturation;\n" +
    "uniform float contrast;\n" +
    "uniform float exposure;\n" +
    "varying vec2 vUv;\n" +
    "void main() {\n" +
    "  vec3 base = texture2D(tDiffuse, vUv).rgb;\n" +
    "  vec3 bloom = texture2D(bloomTex, vUv).rgb;\n" +
    "  vec3 c = base + bloom * bloomStrength;\n" +
    "  // 曝光\n" +
    "  c *= exposure;\n" +
    "  // 对比度\n" +
    "  c = (c - 0.5) * contrast + 0.5;\n" +
    "  // 饱和度\n" +
    "  float luma = dot(c, vec3(0.2126, 0.7152, 0.0722));\n" +
    "  c = mix(vec3(luma), c, saturation);\n" +
    "  c = clamp(c, 0.0, 1.0);\n" +
    "  gl_FragColor = vec4(c, 1.0);\n" +
    "}\n";

  // 暗角 + 最终输出（sRGB 已在 renderer 输出时处理，这里只做边缘压暗）。
  var vignetteFS =
    "uniform sampler2D tDiffuse;\n" +
    "uniform float vignetteStrength;\n" +
    "uniform float vignetteRadius;\n" +
    "uniform float aspect;\n" +
    "varying vec2 vUv;\n" +
    "void main() {\n" +
    "  vec3 c = texture2D(tDiffuse, vUv).rgb;\n" +
    "  vec2 uv  = vUv * 2.0 - 1.0;\n" +
    "  uv.x *= aspect;\n" +
    "  float d = length(uv);\n" +
    "  float v = smoothstep(vignetteRadius, 1.55, d);   // 近边缘逐渐压暗\n" +
    "  c *= (1.0 - v * vignetteStrength);\n" +
    "  c = clamp(c, 0.0, 1.0);\n" +
    "  gl_FragColor = vec4(c, 1.0);\n" +
    "}\n";

  // 暴露全局单例
  if (typeof window !== "undefined") {
    window.PostFX = new PostFX();
  }

})();

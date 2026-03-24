import { useEffect, useRef } from 'react';
import { Renderer, Camera, RenderTarget, Geometry, Program, Mesh, Color, Vec2 } from 'ogl';

interface LiquidEtherProps {
  colors?: string[];
  mouseForce?: number;
  cursorSize?: number;
  resolution?: number;
  dt?: number;
  BFECC?: boolean;
  isViscous?: boolean;
  viscous?: number;
  iterationsViscous?: number;
  iterationsPoisson?: number;
  isBounce?: boolean;
  autoDemo?: boolean;
  autoSpeed?: number;
  autoIntensity?: number;
  takeoverDuration?: number;
  autoResumeDelay?: number;
  autoRampDuration?: number;
  className?: string;
  style?: React.CSSProperties;
}

const defaultColors = ["#5227FF", "#FF9FFC", "#B19EEF"];

const baseVertex = `
    attribute vec2 position;
    attribute vec2 uv;
    varying vec2 vUv;
    varying vec2 vL;
    varying vec2 vR;
    varying vec2 vT;
    varying vec2 vB;
    uniform vec2 texelSize;
    void main () {
        vUv = uv;
        vL = vUv - vec2(texelSize.x, 0.0);
        vR = vUv + vec2(texelSize.x, 0.0);
        vT = vUv + vec2(0.0, texelSize.y);
        vB = vUv - vec2(0.0, texelSize.y);
        gl_Position = vec4(position, 0.0, 1.0);
    }
`;

const splatFragment = `
    precision highp float;
    precision highp sampler2D;
    varying vec2 vUv;
    uniform sampler2D uTarget;
    uniform float aspectRatio;
    uniform vec3 color;
    uniform vec2 point;
    uniform float radius;
    void main () {
        vec2 p = vUv - point.xy;
        p.x *= aspectRatio;
        vec3 splat = exp(-dot(p, p) / radius) * color;
        vec3 base = texture2D(uTarget, vUv).xyz;
        gl_FragColor = vec4(base + splat, 1.0);
    }
`;

const advectionFragment = `
    precision highp float;
    precision highp sampler2D;
    varying vec2 vUv;
    uniform sampler2D uVelocity;
    uniform sampler2D uSource;
    uniform vec2 texelSize;
    uniform vec2 dyeTexelSize;
    uniform float dt;
    uniform float dissipation;
    void main () {
        vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
        gl_FragColor = dissipation * texture2D(uSource, coord);
        gl_FragColor.a = 1.0;
    }
`;

const divergenceFragment = `
    precision highp float;
    precision highp sampler2D;
    varying highp vec2 vUv;
    varying highp vec2 vL;
    varying highp vec2 vR;
    varying highp vec2 vT;
    varying highp vec2 vB;
    uniform sampler2D uVelocity;
    void main () {
        float L = texture2D(uVelocity, vL).x;
        float R = texture2D(uVelocity, vR).x;
        float T = texture2D(uVelocity, vT).y;
        float B = texture2D(uVelocity, vB).y;
        vec2 C = texture2D(uVelocity, vUv).xy;
        if (vL.x < 0.0) { L = -C.x; }
        if (vR.x > 1.0) { R = -C.x; }
        if (vT.y > 1.0) { T = -C.y; }
        if (vB.y < 0.0) { B = -C.y; }
        float div = 0.5 * (R - L + T - B);
        gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
    }
`;

const pressureFragment = `
    precision highp float;
    precision highp sampler2D;
    varying highp vec2 vUv;
    varying highp vec2 vL;
    varying highp vec2 vR;
    varying highp vec2 vT;
    varying highp vec2 vB;
    uniform sampler2D uPressure;
    uniform sampler2D uDivergence;
    void main () {
        float L = texture2D(uPressure, vL).x;
        float R = texture2D(uPressure, vR).x;
        float T = texture2D(uPressure, vT).x;
        float B = texture2D(uPressure, vB).x;
        float C = texture2D(uPressure, vUv).x;
        float divergence = texture2D(uDivergence, vUv).x;
        float pressure = (L + R + B + T - divergence) * 0.25;
        gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
    }
`;

const gradientSubtractFragment = `
    precision highp float;
    precision highp sampler2D;
    varying highp vec2 vUv;
    varying highp vec2 vL;
    varying highp vec2 vR;
    varying highp vec2 vT;
    varying highp vec2 vB;
    uniform sampler2D uPressure;
    uniform sampler2D uVelocity;
    void main () {
        float L = texture2D(uPressure, vL).x;
        float R = texture2D(uPressure, vR).x;
        float T = texture2D(uPressure, vT).x;
        float B = texture2D(uPressure, vB).x;
        vec2 velocity = texture2D(uVelocity, vUv).xy;
        velocity.xy -= vec2(R - L, T - B);
        gl_FragColor = vec4(velocity, 0.0, 1.0);
    }
`;

const colorFragment = `
    precision highp float;
    precision highp sampler2D;
    varying vec2 vUv;
    uniform sampler2D uVelocity;
    uniform vec3 color1;
    uniform vec3 color2;
    uniform vec3 color3;
    void main () {
        vec2 vel = texture2D(uVelocity, vUv).xy;
        float len = length(vel);
        
        vec3 col = mix(color1, color2, clamp(len * 2.0, 0.0, 1.0));
        col = mix(col, color3, clamp(len * 4.0 - 1.0, 0.0, 1.0));
        
        gl_FragColor = vec4(col, 1.0);
    }
`;

const LiquidEther = ({
  colors = defaultColors,
  mouseForce = 20,
  cursorSize = 100,
  resolution = 0.5,
  dt = 0.014,
  BFECC = true,
  isViscous = false,
  viscous = 30,
  iterationsViscous = 32,
  iterationsPoisson = 32,
  isBounce = false,
  autoDemo = true,
  autoSpeed = 0.5,
  autoIntensity = 2.2,
  takeoverDuration = 0.25,
  autoResumeDelay = 1000,
  autoRampDuration = 0.6,
  className = '',
  style = {}
}: LiquidEtherProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const renderer = new Renderer({ dpr: 2, alpha: true, depth: false });
    const gl = renderer.gl;
    containerRef.current.appendChild(gl.canvas);

    const camera = new Camera(gl);
    camera.position.z = 1;

    const geometry = new Geometry(gl, {
      position: { size: 2, data: new Float32Array([-1, -1, 3, -1, -1, 3]) },
      uv: { size: 2, data: new Float32Array([0, 0, 2, 0, 0, 2]) }
    });

    const createFBO = (w: number, h: number, internalFormat: number, format: number, type: number, param: number) => {
      gl.activeTexture(gl.TEXTURE0);
      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, param);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, param);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null);

      const fbo = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
      gl.viewport(0, 0, w, h);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.bindTexture(gl.TEXTURE_2D, null);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);

      return { texture, fbo, width: w, height: h };
    };

    const createDoubleFBO = (w: number, h: number, internalFormat: number, format: number, type: number, param: number) => {
      let fbo1 = createFBO(w, h, internalFormat, format, type, param);
      let fbo2 = createFBO(w, h, internalFormat, format, type, param);

      return {
        get read() { return fbo1; },
        get write() { return fbo2; },
        swap() {
          const temp = fbo1;
          fbo1 = fbo2;
          fbo2 = temp;
        }
      };
    };

    let width = 0;
    let height = 0;
    let simWidth = 0;
    let simHeight = 0;

    const ext = gl.getExtension('EXT_color_buffer_float') || gl.getExtension('OES_texture_float');
    const halfFloatExt = gl.getExtension('EXT_color_buffer_half_float') || gl.getExtension('OES_texture_half_float');

    const supportLinearFiltering = gl.getExtension('OES_texture_float_linear') || gl.getExtension('OES_texture_half_float_linear');

    const type = gl.FLOAT;
    const internalFormat = gl.RGBA32F || gl.RGBA;
    const format = gl.RGBA;
    const filtering = supportLinearFiltering ? gl.LINEAR : gl.NEAREST;

    let velocity: any;
    let pressure: any;
    let divergence: any;

    const resize = () => {
      width = containerRef.current!.clientWidth;
      height = containerRef.current!.clientHeight;
      
      simWidth = Math.round(width * resolution);
      simHeight = Math.round(height * resolution);

      renderer.setSize(width, height);

      velocity = createDoubleFBO(simWidth, simHeight, internalFormat, format, type, filtering);
      pressure = createDoubleFBO(simWidth, simHeight, internalFormat, format, type, gl.NEAREST);
      divergence = createFBO(simWidth, simHeight, internalFormat, format, type, gl.NEAREST);
    };

    resize();
    window.addEventListener('resize', resize);

    const splatProgram = new Program(gl, {
      vertex: baseVertex,
      fragment: splatFragment,
      uniforms: {
        uTarget: { value: null },
        aspectRatio: { value: width / height },
        color: { value: new Color() },
        point: { value: new Vec2() },
        radius: { value: 0 },
        texelSize: { value: new Vec2(1 / simWidth, 1 / simHeight) }
      },
      depthTest: false
    });

    const advectionProgram = new Program(gl, {
      vertex: baseVertex,
      fragment: advectionFragment,
      uniforms: {
        uVelocity: { value: null },
        uSource: { value: null },
        dt: { value: dt },
        dissipation: { value: 0.98 },
        texelSize: { value: new Vec2(1 / simWidth, 1 / simHeight) },
        dyeTexelSize: { value: new Vec2(1 / simWidth, 1 / simHeight) }
      },
      depthTest: false
    });

    const divergenceProgram = new Program(gl, {
      vertex: baseVertex,
      fragment: divergenceFragment,
      uniforms: {
        uVelocity: { value: null },
        texelSize: { value: new Vec2(1 / simWidth, 1 / simHeight) }
      },
      depthTest: false
    });

    const pressureProgram = new Program(gl, {
      vertex: baseVertex,
      fragment: pressureFragment,
      uniforms: {
        uPressure: { value: null },
        uDivergence: { value: null },
        texelSize: { value: new Vec2(1 / simWidth, 1 / simHeight) }
      },
      depthTest: false
    });

    const gradientSubtractProgram = new Program(gl, {
      vertex: baseVertex,
      fragment: gradientSubtractFragment,
      uniforms: {
        uPressure: { value: null },
        uVelocity: { value: null },
        texelSize: { value: new Vec2(1 / simWidth, 1 / simHeight) }
      },
      depthTest: false
    });

    const displayProgram = new Program(gl, {
      vertex: baseVertex,
      fragment: colorFragment,
      uniforms: {
        uVelocity: { value: null },
        color1: { value: new Color(colors[0]) },
        color2: { value: new Color(colors[1]) },
        color3: { value: new Color(colors[2]) }
      },
      depthTest: false
    });

    const mesh = new Mesh(gl, { geometry, program: displayProgram });

    const blit = (target: any) => {
      if (target == null) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      } else {
        gl.bindFramebuffer(gl.FRAMEBUFFER, target);
      }
      gl.clear(gl.COLOR_BUFFER_BIT);
      
      mesh.program.use();
      mesh.draw({ camera });
    };

    const splat = (x: number, y: number, dx: number, dy: number) => {
      mesh.program = splatProgram;
      splatProgram.uniforms.uTarget.value = velocity.read.texture;
      splatProgram.uniforms.aspectRatio.value = width / height;
      splatProgram.uniforms.point.value.set(x / width, 1.0 - y / height);
      splatProgram.uniforms.color.value.set(dx * mouseForce, -dy * mouseForce, 0.0);
      splatProgram.uniforms.radius.value = cursorSize / 10000.0;
      
      gl.viewport(0, 0, simWidth, simHeight);
      mesh.program.uniforms = splatProgram.uniforms;
      blit(velocity.write.fbo);
      velocity.swap();
    };

    let pointerX = width / 2;
    let pointerY = height / 2;
    let pointerDX = 0;
    let pointerDY = 0;
    let lastTime = Date.now();
    let isInteracting = false;
    let lastInteractionTime = Date.now();

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - pointerX;
      const dy = e.clientY - pointerY;
      pointerX = e.clientX;
      pointerY = e.clientY;
      splat(pointerX, pointerY, dx, dy);
      isInteracting = true;
      lastInteractionTime = Date.now();
    };

    const handleTouchMove = (e: TouchEvent) => {
      const dx = e.touches[0].clientX - pointerX;
      const dy = e.touches[0].clientY - pointerY;
      pointerX = e.touches[0].clientX;
      pointerY = e.touches[0].clientY;
      splat(pointerX, pointerY, dx, dy);
      isInteracting = true;
      lastInteractionTime = Date.now();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove);

    let autoAngle = 0;

    const update = () => {
      const now = Date.now();
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      if (now - lastInteractionTime > autoResumeDelay) {
        isInteracting = false;
      }

      if (autoDemo && !isInteracting) {
        autoAngle += autoSpeed * delta;
        const targetX = width / 2 + Math.cos(autoAngle) * width * 0.3;
        const targetY = height / 2 + Math.sin(autoAngle * 2) * height * 0.3;
        const dx = targetX - pointerX;
        const dy = targetY - pointerY;
        pointerX = targetX;
        pointerY = targetY;
        splat(pointerX, pointerY, dx * autoIntensity, dy * autoIntensity);
      }

      gl.viewport(0, 0, simWidth, simHeight);

      mesh.program = advectionProgram;
      mesh.program.uniforms = advectionProgram.uniforms;
      advectionProgram.uniforms.texelSize.value.set(1 / simWidth, 1 / simHeight);
      advectionProgram.uniforms.uVelocity.value = velocity.read.texture;
      advectionProgram.uniforms.uSource.value = velocity.read.texture;
      blit(velocity.write.fbo);
      velocity.swap();

      mesh.program = divergenceProgram;
      mesh.program.uniforms = divergenceProgram.uniforms;
      divergenceProgram.uniforms.texelSize.value.set(1 / simWidth, 1 / simHeight);
      divergenceProgram.uniforms.uVelocity.value = velocity.read.texture;
      blit(divergence.fbo);

      gl.bindFramebuffer(gl.FRAMEBUFFER, pressure.read.fbo);
      gl.clear(gl.COLOR_BUFFER_BIT);

      mesh.program = pressureProgram;
      mesh.program.uniforms = pressureProgram.uniforms;
      pressureProgram.uniforms.texelSize.value.set(1 / simWidth, 1 / simHeight);
      pressureProgram.uniforms.uDivergence.value = divergence.texture;

      for (let i = 0; i < iterationsPoisson; i++) {
        pressureProgram.uniforms.uPressure.value = pressure.read.texture;
        blit(pressure.write.fbo);
        pressure.swap();
      }

      mesh.program = gradientSubtractProgram;
      mesh.program.uniforms = gradientSubtractProgram.uniforms;
      gradientSubtractProgram.uniforms.texelSize.value.set(1 / simWidth, 1 / simHeight);
      gradientSubtractProgram.uniforms.uPressure.value = pressure.read.texture;
      gradientSubtractProgram.uniforms.uVelocity.value = velocity.read.texture;
      blit(velocity.write.fbo);
      velocity.swap();

      gl.viewport(0, 0, width, height);
      mesh.program = displayProgram;
      mesh.program.uniforms = displayProgram.uniforms;
      displayProgram.uniforms.uVelocity.value = velocity.read.texture;
      
      // Update colors if they change
      displayProgram.uniforms.color1.value.set(colors[0]);
      displayProgram.uniforms.color2.value.set(colors[1]);
      displayProgram.uniforms.color3.value.set(colors[2]);

      blit(null);

      requestAnimationFrame(update);
    };

    update();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className={`fixed inset-0 w-full h-full z-[-1] pointer-events-none ${className}`} 
      style={style}
    />
  );
};

export default LiquidEther;

import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  let modelPath = searchParams.get('model')

  if (!modelPath) {
    return new NextResponse('Missing model path', { status: 400 })
  }

  // try {
  //   modelPath = decodeURIComponent(decodeURIComponent(modelPath))
  // } catch (e) {
  //   try {
  //     modelPath = decodeURIComponent(modelPath)
  //   } catch (e) {
  //     return new NextResponse('Invalid URL encoding', { status: 400 })
  //   }
  // }

  // if (!modelPath.startsWith('/uploads/')) {
  //   return new NextResponse('Invalid model path', { status: 400 })
  // }

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { 
            margin: 0; 
            padding: 0; 
            overflow: hidden; 
            background-color: #f3f4f6; 
            font-family: system-ui, -apple-system, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
          }
          #canvas { 
            width: 100%; 
            height: 100vh; 
            touch-action: none;
          }
          .loading {
            position: absolute;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-direction: column;
            background-color: #f3f4f6;
            z-index: 20;
          }
          .error {
            position: absolute;
            inset: 0;
            display: none;
            align-items: center;
            justify-content: center;
            flex-direction: column;
            background-color: #f3f4f6;
            z-index: 20;
            color: #6b7280;
          }
          .spinner {
            width: 40px;
            height: 40px;
            border: 4px solid #e5e7eb;
            border-top: 4px solid #3b82f6;
            border-radius: 50%;
            margin-bottom: 8px;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        </style>
      </head>
      <body>
        <div id="loading" class="loading">
          <div class="spinner"></div>
          <div style="color: #6b7280;">加载中...</div>
        </div>
        
        <div id="error" class="error">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div style="margin-top: 8px;">加载失败</div>
        </div>

        <canvas id="canvas"></canvas>

        <script async src="https://cdn.jsdelivr.net/npm/es-module-shims@1.8.0/dist/es-module-shims.js"></script>
        <script type="importmap">
        {
          "imports": {
            "three": "https://cdn.jsdelivr.net/npm/three@0.159.0/build/three.module.js",
            "three/examples/jsm/loaders/ColladaLoader": "https://cdn.jsdelivr.net/npm/three@0.159.0/examples/jsm/loaders/ColladaLoader.js",
            "three/examples/jsm/controls/OrbitControls": "https://cdn.jsdelivr.net/npm/three@0.159.0/examples/jsm/controls/OrbitControls.js"
          }
        }
        </script>
        <link rel="preload" as="script" href="https://cdn.jsdelivr.net/npm/three@0.159.0/build/three.module.js">

        <script type="module">
          import * as THREE from 'three';
          import { ColladaLoader } from 'three/examples/jsm/loaders/ColladaLoader';
          import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

          try {
            const canvas = document.getElementById('canvas');
            const scene = new THREE.Scene();
            scene.background = new THREE.Color(0xf3f4f6);

            const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 2000);
            
            const renderer = new THREE.WebGLRenderer({ 
              canvas, 
              antialias: true,
              alpha: true,
              powerPreference: "high-performance"
            });
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            renderer.shadowMap.enabled = true;
            renderer.shadowMap.type = THREE.PCFSoftShadowMap;

            const controls = new OrbitControls(camera, canvas);
            controls.enableDamping = true;
            controls.dampingFactor = 0.05;
            controls.autoRotate = true;
            controls.autoRotateSpeed = 2;
            controls.enablePan = true;
            controls.panSpeed = 1.5;
            controls.mouseButtons = {
              LEFT: THREE.MOUSE.ROTATE,
              MIDDLE: THREE.MOUSE.DOLLY,
              RIGHT: THREE.MOUSE.PAN
            };
            controls.maxPolarAngle = Math.PI / 1.5;

            const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
            scene.add(ambientLight);

            const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
            directionalLight.position.set(5, 5, 5);
            directionalLight.castShadow = true;
            directionalLight.shadow.mapSize.width = 2048;
            directionalLight.shadow.mapSize.height = 2048;
            directionalLight.shadow.camera.near = 0.5;
            directionalLight.shadow.camera.far = 500;
            scene.add(directionalLight);

            let isAnimating = true;

            const loader = new ColladaLoader();
            const modelUrl = '${modelPath}';
            console.log('Loading model from:', modelUrl);
            
            loader.load(
              modelUrl,
              (collada) => {
                console.log('Model loaded successfully');
                document.getElementById('loading').style.display = 'none';
                const model = collada.scene;
                
                model.traverse((child) => {
                  if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    if (child.material) {
                      child.material.needsUpdate = true;
                    }
                  }
                });

                scene.add(model);

                const box = new THREE.Box3().setFromObject(model);
                const size = box.getSize(new THREE.Vector3());
                const center = box.getCenter(new THREE.Vector3());

                model.position.sub(center);
                model.position.y -= size.y * 0.3;

                const maxDim = Math.max(size.x, size.y, size.z);
                const fov = camera.fov * (Math.PI / 180);
                const distance = (maxDim / (2 * Math.tan(fov / 2))) * 1.3;

                camera.position.set(
                  distance * Math.cos(Math.PI / 4),
                  distance * 0.3,
                  distance * Math.sin(Math.PI / 4)
                );

                camera.lookAt(0, -size.y * 0.1, 0);
                controls.target.set(0, -size.y * 0.1, 0);

                controls.minDistance = distance * 0.5;
                controls.maxDistance = distance * 1.5;
                controls.maxPolarAngle = Math.PI * 0.55;
                controls.minPolarAngle = Math.PI * 0.25;

                camera.near = distance * 0.01;
                camera.far = distance * 10;
                camera.updateProjectionMatrix();

                window.parent.postMessage({ type: 'modelLoadSuccess' }, '*');
                animate();
              },
              undefined,
              (error) => {
                console.error('Error loading DAE:', error);
                document.getElementById('loading').style.display = 'none';
                document.getElementById('error').style.display = 'flex';
                window.parent.postMessage({ type: 'modelLoadError' }, '*');
              }
            );

            function animate() {
              if (!isAnimating) return;
              requestAnimationFrame(animate);
              controls.update();
              renderer.render(scene, camera);
            }

            let resizeTimeout;
            window.addEventListener('resize', () => {
              clearTimeout(resizeTimeout);
              resizeTimeout = setTimeout(() => {
                camera.aspect = window.innerWidth / window.innerHeight;
                camera.updateProjectionMatrix();
                renderer.setSize(window.innerWidth, window.innerHeight);
                renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
              }, 100);
            });

            document.addEventListener('visibilitychange', () => {
              isAnimating = !document.hidden;
              if (isAnimating) {
                animate();
              }
            });

          } catch (error) {
            console.error('Failed to initialize 3D viewer:', error);
            document.getElementById('loading').style.display = 'none';
            document.getElementById('error').style.display = 'flex';
            window.parent.postMessage({ type: 'modelLoadError', error: error.message }, '*');
          }
        </script>
      </body>
    </html>
  `

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
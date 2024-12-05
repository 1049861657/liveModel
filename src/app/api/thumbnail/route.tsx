import { NextResponse } from 'next/server'
import path from 'path'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const modelPath = searchParams.get('model')
  const format = path.extname(modelPath || '').toLowerCase()

  if (!modelPath) {
    return new NextResponse('Missing model path', { status: 400 })
  }

  // 根据文件格式返回不同的预览页面
  if (format === '.dae') {
    // DAE 格式使用 Three.js 预览
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { margin: 0; padding: 0; overflow: hidden; background-color: #f3f4f6; }
            #canvas { width: 100%; height: 100vh; }
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
            <div style="color: #6b7280; font-family: system-ui, -apple-system, sans-serif;">加载中...</div>
          </div>
          
          <div id="error" class="error">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div style="margin-top: 8px;">加载失败</div>
          </div>

          <canvas id="canvas"></canvas>

          <script type="module">
            import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.157.0/build/three.module.js';
            import { ColladaLoader } from 'https://cdn.jsdelivr.net/npm/three@0.157.0/examples/jsm/loaders/ColladaLoader.js';
            import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.157.0/examples/jsm/controls/OrbitControls.js';

            const canvas = document.getElementById('canvas');
            const scene = new THREE.Scene();
            scene.background = new THREE.Color(0xf3f4f6);

            const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 2000);
            const renderer = new THREE.WebGLRenderer({ 
              canvas, 
              antialias: true,
              alpha: true 
            });
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.shadowMap.enabled = true;

            const controls = new OrbitControls(camera, canvas);
            controls.enableDamping = true;
            controls.autoRotate = true;
            controls.autoRotateSpeed = 2;

            // 添加灯光
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
            scene.add(ambientLight);

            const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
            directionalLight.position.set(5, 5, 5);
            directionalLight.castShadow = true;
            scene.add(directionalLight);

            const loader = new ColladaLoader();
            loader.load(
              '${modelPath}',
              (collada) => {
                document.getElementById('loading').style.display = 'none';
                const model = collada.scene;
                scene.add(model);

                // 计算包围盒
                const box = new THREE.Box3().setFromObject(model);
                const center = box.getCenter(new THREE.Vector3());
                const size = box.getSize(new THREE.Vector3());

                // 调整模型位置到中心
                model.position.sub(center);

                // 计算合适的相机距离
                const maxDim = Math.max(size.x, size.y, size.z);
                const fov = camera.fov * (Math.PI / 180);
                const cameraDistance = maxDim / (2 * Math.tan(fov / 2));

                // 设置相机位置
                camera.position.set(cameraDistance, cameraDistance * 0.5, cameraDistance);
                camera.lookAt(0, 0, 0);
                controls.target.set(0, 0, 0);

                // 设置控制器限制
                controls.minDistance = cameraDistance * 0.5;
                controls.maxDistance = cameraDistance * 2;

                window.parent.postMessage({ type: 'modelLoadSuccess' }, '*');
                animate();
              },
              null,
              (error) => {
                console.error('Error loading DAE:', error);
                document.getElementById('loading').style.display = 'none';
                document.getElementById('error').style.display = 'flex';
                window.parent.postMessage({ type: 'modelLoadError' }, '*');
              }
            );

            function animate() {
              requestAnimationFrame(animate);
              controls.update();
              renderer.render(scene, camera);
            }

            window.addEventListener('resize', () => {
              camera.aspect = window.innerWidth / window.innerHeight;
              camera.updateProjectionMatrix();
              renderer.setSize(window.innerWidth, window.innerHeight);
            });
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

  // GLB 格式使用 model-viewer (原有代码)
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background-color: #f3f4f6; }
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
          model-viewer {
            width: 100%;
            height: 100%;
            position: absolute;
            top: 0;
            left: 0;
            border: none;
            background-color: transparent;
            z-index: 10;
          }
          model-viewer::part(default-progress-bar) {
            display: none;
          }
          model-viewer::part(default-ar-button) {
            display: none;
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
          <div style="color: #6b7280; font-family: system-ui, -apple-system, sans-serif;">加载中...</div>
        </div>
        
        <div id="error" class="error">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div style="margin-top: 8px;">加载失败</div>
        </div>
        
        <model-viewer
          id="viewer"
          src="${modelPath}"
          auto-rotate
          camera-controls
          touch-action="pan-y"
          interaction-prompt="none"
          shadow-intensity="1"
          exposure="1"
          camera-orbit="-45deg 60deg auto"
          min-camera-orbit="auto auto auto"
          max-camera-orbit="auto auto auto"
          camera-target="0m 0m 0m"
          auto-rotate-delay="0"
          rotation-per-second="30deg"
          field-of-view="30deg"
          bounds="tight"
          interpolation-decay="200"
        ></model-viewer>

        <script type="module">
          const timeout = setTimeout(() => {
            document.getElementById('loading').style.display = 'none';
            document.getElementById('error').style.display = 'flex';
            window.parent.postMessage({ type: 'modelLoadError' }, '*');
          }, 10000);

          window.addEventListener('error', () => {
            clearTimeout(timeout);
            document.getElementById('loading').style.display = 'none';
            document.getElementById('error').style.display = 'flex';
            window.parent.postMessage({ type: 'modelLoadError' }, '*');
          });

          await customElements.whenDefined('model-viewer');
          const viewer = document.querySelector('model-viewer');

          viewer.addEventListener('load', () => {
            clearTimeout(timeout);
            document.getElementById('loading').style.display = 'none';
            
            const boundingBox = viewer.getBoundingBoxCenter();
            const size = viewer.getDimensions();
            const maxDim = Math.max(size.x, size.y, size.z);
            const distance = maxDim * 2;
            
            viewer.cameraOrbit = \`-45deg 60deg \${distance}m\`;
            viewer.fieldOfView = '30deg';
            viewer.cameraTarget = \`\${boundingBox.x}m \${boundingBox.y}m \${boundingBox.z}m\`;

            window.parent.postMessage({ type: 'modelLoadSuccess' }, '*');
          });

          viewer.addEventListener('error', () => {
            clearTimeout(timeout);
            document.getElementById('loading').style.display = 'none';
            document.getElementById('error').style.display = 'flex';
            window.parent.postMessage({ type: 'modelLoadError' }, '*');
          });
        </script>
        
        <script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.3.0/model-viewer.min.js"></script>
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
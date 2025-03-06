import { NextResponse } from 'next/server'
import {getTranslations} from 'next-intl/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const modelPath = searchParams.get('model')
  const locale = searchParams.get('locale') || 'zh'
  
  if (!modelPath) {
    return new NextResponse('缺少模型路径', { status: 400 })
  }

  const t = await getTranslations({locale, namespace: 'ModelPreview'});

  // 使用Three.js渲染GLTF模型
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <!-- 使用本地打包的Three.js组件 -->
        <script type="module" src="/vendor/three-bundle.js"></script>
        <style>
          body { 
            margin: 0; 
            padding: 0; 
            width: 100%; 
            height: 100%; 
            overflow: hidden; 
            background-color: #f3f4f6; 
          }
          canvas { 
            display: block; 
            width: 100%; 
            height: 100%; 
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
          .reload-button {
            margin-top: 16px;
            padding: 8px 16px;
            background-color: #3b82f6;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-family: system-ui, -apple-system, sans-serif;
            transition: background-color 0.2s;
          }
          .reload-button:hover {
            background-color: #2563eb;
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
          <div style="color: #6b7280; font-family: system-ui, -apple-system, sans-serif;">${t('loading')}</div>
        </div>
        
        <div id="error" class="error">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div style="margin-top: 8px;">${t('error.title')}</div>
          <button class="reload-button" onclick="window.location.reload()">${t('error.reload')}</button>
        </div>
        
        <canvas id="canvas"></canvas>

        <script type="module">
          import { THREE, GLTFLoader, OrbitControls, DRACOLoader, RGBELoader } from '/vendor/three-bundle.js';

          // 错误处理函数
          function showError(error) {
            console.error('加载错误:', error);
            document.getElementById('loading').style.display = 'none';
            document.getElementById('error').style.display = 'flex';
            window.parent.postMessage({ type: 'modelLoadError' }, '*');
          }

          // 创建超时处理
          const timeout = setTimeout(() => {
            showError('加载超时');
          }, 20000);

          // 捕获全局错误
          window.addEventListener('error', (event) => {
            clearTimeout(timeout);
            showError(event.error || '未知错误');
          });

          try {
            // 创建场景
            const scene = new THREE.Scene();
            scene.background = new THREE.Color(0xf3f4f6);

            // 添加环境光和定向光
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
            scene.add(ambientLight);
            
            const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
            directionalLight.position.set(1, 2, 3);
            scene.add(directionalLight);

            const backLight = new THREE.DirectionalLight(0xffffff, 0.5);
            backLight.position.set(-1, 1, -1);
            scene.add(backLight);
            
            // 设置相机
            const camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 0.1, 1000);
            camera.position.set(0, 0, 5);
            
            // 创建渲染器
            const renderer = new THREE.WebGLRenderer({ 
              canvas: document.getElementById('canvas'),
              antialias: true 
            });
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setPixelRatio(window.devicePixelRatio);
            renderer.outputColorSpace = THREE.SRGBColorSpace;
            renderer.toneMapping = THREE.ACESFilmicToneMapping;
            renderer.toneMappingExposure = 1.0;
            renderer.shadowMap.enabled = true;
            
            // 添加HDR环境映射
            const pmremGenerator = new THREE.PMREMGenerator(renderer);
            pmremGenerator.compileEquirectangularShader();

            new RGBELoader()
              .load('/hdr/buikslotermeerplein_1k.hdr', function(texture) {
                const envMap = pmremGenerator.fromEquirectangular(texture).texture;
                scene.environment = envMap;
                texture.dispose();
                pmremGenerator.dispose();
              });
            
            // 创建控制器
            const controls = new OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.dampingFactor = 0.05;
            controls.autoRotate = true;
            controls.autoRotateSpeed = 1.0;
            controls.enableZoom = true;
            controls.enablePan = false;
            controls.minDistance = 2;
            controls.maxDistance = 10;
            
            // 创建GLTF加载器
            const loadingManager = new THREE.LoadingManager();
            
            const dracoLoader = new DRACOLoader(loadingManager);
            // 设置DRACO解码器路径
            dracoLoader.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.174.0/examples/jsm/libs/draco/');
            
            const gltfLoader = new GLTFLoader(loadingManager);
            gltfLoader.setDRACOLoader(dracoLoader);
            
            // 加载GLTF模型
            gltfLoader.load(
              '${modelPath}', 
              (gltf) => {
                clearTimeout(timeout);
                
                const model = gltf.scene;
                scene.add(model);
                
                // 计算模型边界框并调整相机位置
                const box = new THREE.Box3().setFromObject(model);
                const center = box.getCenter(new THREE.Vector3());
                const size = box.getSize(new THREE.Vector3());
                
                // 改进的相机距离计算
                const maxDim = Math.max(size.x, size.y, size.z);
                const fov = camera.fov * (Math.PI / 180); // 将视场角转换为弧度
                let distance = (maxDim / (2 * Math.tan(fov / 2))) * 1.2; // 基于视场角的距离计算
                
                // 设置最小和最大距离阈值
                distance = Math.max(distance, maxDim * 1.5); // 确保最小距离
                distance = Math.min(distance, maxDim * 4); // 限制最大距离
                
                // 重置模型位置，使其居中
                model.position.sub(center);
                
                // 根据模型尺寸调整相机
                camera.position.set(distance * 0.8, distance * 0.6, distance);
                camera.lookAt(new THREE.Vector3(0, 0, 0));
                
                // 调整相机的近剪裁面和远剪裁面
                camera.near = distance * 0.01;
                camera.far = distance * 10;
                camera.updateProjectionMatrix();
                
                // 调整控制器
                controls.target.set(0, 0, 0);
                controls.minDistance = distance * 0.5;
                controls.maxDistance = distance * 2;
                controls.update();
                
                // 隐藏加载指示器
                document.getElementById('loading').style.display = 'none';
                
                // 通知父窗口加载完成
                window.parent.postMessage({ type: 'modelLoadSuccess' }, '*');
              },
              (progress) => {
                // 可以显示加载进度
              },
              (error) => {
                clearTimeout(timeout);
                showError(error);
              }
            );
            
            // 调整窗口大小事件
            window.addEventListener('resize', () => {
              camera.aspect = window.innerWidth / window.innerHeight;
              camera.updateProjectionMatrix();
              renderer.setSize(window.innerWidth, window.innerHeight);
            });
            
            // 动画循环
            function animate() {
              requestAnimationFrame(animate);
              controls.update();
              renderer.render(scene, camera);
            }
            
            animate();
          } catch (error) {
            clearTimeout(timeout);
            showError(error);
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
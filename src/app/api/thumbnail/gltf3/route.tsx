import { NextResponse } from 'next/server'
import {getTranslations} from 'next-intl/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const modelPath = searchParams.get('model')
  const locale = searchParams.get('locale') || 'zh'
  
  if (!modelPath) {
    return new NextResponse('Missing model path', { status: 400 })
  }

  const t = await getTranslations({locale, namespace: 'ModelPreview'});

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <script src="/vendor/babylon-bundle.js"></script>
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
          .help-button {
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
          .help-button:hover {
            background-color: #2563eb;
          }
          #renderCanvas {
            width: 100%;
            height: 100%;
            position: absolute;
            top: 0;
            left: 0;
            touch-action: none;
            outline: none;
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
          html, body {
            position: fixed;
            width: 100%;
            height: 100%;
            overflow: hidden;
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
          <div id="error-buttons">
            <button id="reload-button" class="reload-button" onclick="window.location.reload()">${t('error.reload')}</button>
            <button id="help-button" class="help-button" onclick="window.parent.postMessage({ type: 'openHelp', anchor: 'category=model&question=model-2' }, '*')">${t('error.help')}</button>
          </div>
        </div>

        <canvas id="renderCanvas"></canvas>

        <script>
          // 阻止默认滚轮行为
          document.addEventListener('wheel', (e) => {
            e.preventDefault();
          }, { passive: false });

          // 阻止触摸移动默认行为
          document.addEventListener('touchmove', (e) => {
            e.preventDefault();
          }, { passive: false });

          const timeout = setTimeout(() => {
            document.getElementById('loading').style.display = 'none';
            document.getElementById('error').style.display = 'flex';
            window.parent.postMessage({ type: 'modelLoadError' }, '*');
          }, 20000);

          window.addEventListener('error', () => {
            clearTimeout(timeout);
            document.getElementById('loading').style.display = 'none';
            document.getElementById('error').style.display = 'flex';
            window.parent.postMessage({ type: 'modelLoadError' }, '*');
          });

          const canvas = document.getElementById('renderCanvas');
          const engine = new BABYLON.Engine(canvas, true);

          const createScene = async function() {
            const scene = new BABYLON.Scene(engine);
            scene.clearColor = new BABYLON.Color4(0.95, 0.96, 0.97, 1);

            // 创建相机
            const camera = new BABYLON.ArcRotateCamera(
              "camera",
              -Math.PI / 4,
              Math.PI / 3,
              10,
              BABYLON.Vector3.Zero(),
              scene
            );
            camera.attachControl(canvas, true);
            
            // 设置相机控制参数
            camera.wheelPrecision = 50;
            camera.pinchPrecision = 50;
            camera.panningSensibility = 50;
            camera.inertia = 0.7;
            camera.angularSensibilityX = 1000;
            camera.angularSensibilityY = 1000;
            camera.panningInertia = 0.5;
            camera.useBouncingBehavior = true;
            camera.useFramingBehavior = true;

            // 创建默认环境
            scene.createDefaultEnvironment({
              createGround: false,
              createSkybox: false,
            });

            // 创建HDR环境光照
            const hdrTexture = new BABYLON.HDRCubeTexture("/hdr/buikslotermeerplein_1k.hdr", scene, 512);
            scene.environmentTexture = hdrTexture;
            scene.environmentIntensity = 1.2;

            // 配置相机帧行为
            const framingBehavior = camera.getBehaviorByName("Framing");
            if (framingBehavior) {
              framingBehavior.radiusScale = 1.5;
            }

            // 配置鼠标输入
            if (camera.inputs.attached.mousewheel) {
              camera.inputs.attached.mousewheel.wheelDeltaPercentage = 0.05;
            }

            // 配置指针输入
            if (camera.inputs.attached.pointers) {
              camera.inputs.attached.pointers.buttons = [0, 1, 2];
            }

            // 创建一个标志来跟踪是否正在手动旋转
            let isManuallyRotating = false;
            let autoRotationObserver = null;

            // 监听鼠标按下事件
            canvas.addEventListener("pointerdown", () => {
              isManuallyRotating = true;
            });

            // 监听鼠标释放事件
            canvas.addEventListener("pointerup", () => {
              isManuallyRotating = false;
            });

            // 监听鼠标离开事件
            canvas.addEventListener("pointerout", () => {
              isManuallyRotating = false;
            });

            // 添加环境光和平行光
            const ambientLight = new BABYLON.HemisphericLight(
              "ambientLight",
              new BABYLON.Vector3(0, 1, 0),
              scene
            );
            ambientLight.intensity = 0.6;

            const directionalLight = new BABYLON.DirectionalLight(
              "directionalLight",
              new BABYLON.Vector3(-1, -2, -1),
              scene
            );
            directionalLight.intensity = 0.8;
            directionalLight.position = new BABYLON.Vector3(10, 20, 10);

            // 添加阴影生成器
            const shadowGenerator = new BABYLON.ShadowGenerator(2048, directionalLight);
            shadowGenerator.useBlurExponentialShadowMap = true;
            shadowGenerator.blurKernel = 32;

            try {
              // 加载GLTF模型
              const result = await BABYLON.SceneLoader.ImportMeshAsync(
                "",
                "",
                '${modelPath}',
                scene
              );

              // 计算所有网格的总包围盒
              let min = new BABYLON.Vector3(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE);
              let max = new BABYLON.Vector3(Number.MIN_VALUE, Number.MIN_VALUE, Number.MIN_VALUE);
              
              result.meshes.forEach((mesh) => {
                if (mesh.getBoundingInfo) {
                  mesh.computeWorldMatrix(true);
                  const boundingInfo = mesh.getBoundingInfo();
                  const worldMatrix = mesh.getWorldMatrix();
                  const meshMin = BABYLON.Vector3.TransformCoordinates(boundingInfo.minimum, worldMatrix);
                  const meshMax = BABYLON.Vector3.TransformCoordinates(boundingInfo.maximum, worldMatrix);
                  
                  min = BABYLON.Vector3.Minimize(min, meshMin);
                  max = BABYLON.Vector3.Maximize(max, meshMax);
                }
              });

              // 计算包围盒的尺寸和中心点
              const size = max.subtract(min);
              const center = min.add(size.scale(0.5));

              // 将模型移动到原点
              const rootMesh = result.meshes[0];
              rootMesh.position = center.scale(-1);

              // 重新计算包围盒（因为模型已经移动）
              let adjustedMin = new BABYLON.Vector3(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE);
              let adjustedMax = new BABYLON.Vector3(Number.MIN_VALUE, Number.MIN_VALUE, Number.MIN_VALUE);
              
              result.meshes.forEach((mesh) => {
                if (mesh.getBoundingInfo) {
                  mesh.computeWorldMatrix(true);
                  const boundingInfo = mesh.getBoundingInfo();
                  const worldMatrix = mesh.getWorldMatrix();
                  const meshMin = BABYLON.Vector3.TransformCoordinates(boundingInfo.minimum, worldMatrix);
                  const meshMax = BABYLON.Vector3.TransformCoordinates(boundingInfo.maximum, worldMatrix);
                  
                  adjustedMin = BABYLON.Vector3.Minimize(adjustedMin, meshMin);
                  adjustedMax = BABYLON.Vector3.Maximize(adjustedMax, meshMax);
                }
              });

              // 计算调整后的尺寸
              const adjustedSize = adjustedMax.subtract(adjustedMin);
              const maxDim = Math.max(adjustedSize.x, adjustedSize.y, adjustedSize.z);

              // 根据模型大小调整相机距离
              const fov = camera.fov;
              const aspectRatio = engine.getAspectRatio(camera);
              const distance = (maxDim / (2 * Math.tan(fov / 2))) * 1.5;

              // 设置相机位置和目标点
              camera.setTarget(BABYLON.Vector3.Zero());
              camera.alpha = -Math.PI / 4;  // -45度
              camera.beta = Math.PI / 3;    // 60度
              camera.radius = distance;

              // 根据模型大小调整相机限制
              camera.lowerRadiusLimit = distance * 0.3; // 减小最小距离限制
              camera.upperRadiusLimit = distance * 3; // 增加最大距离限制
              camera.wheelPrecision = distance / 100; // 降低滚轮精度以使缩放更平滑
              camera.pinchPrecision = 100; // 增加触摸缩放精度
              camera.maxPolarAngle = Math.PI * 0.85; // 增加垂直旋转范围
              camera.minPolarAngle = Math.PI * 0.15;
              camera.lowerBetaLimit = Math.PI * 0.15; // 限制垂直旋转范围
              camera.upperBetaLimit = Math.PI * 0.85;
              camera.panningSensibility = distance / 20; // 根据模型大小调整平移灵敏度

              // 为所有网格添加阴影
              result.meshes.forEach((mesh) => {
                if (mesh.id !== "__root__") {
                  shadowGenerator.addShadowCaster(mesh);
                  mesh.receiveShadows = true;
                }
              });

              // 自动旋转相机
              const rotationSpeed = 0.005;
              autoRotationObserver = scene.onBeforeRenderObservable.add(() => {
                if (!isManuallyRotating) {  // 只在不手动旋转时自动旋转
                  camera.alpha += rotationSpeed;  // 直接修改相机的当前角度
                }
              });

              clearTimeout(timeout);
              document.getElementById('loading').style.display = 'none';
              window.parent.postMessage({ type: 'modelLoadSuccess' }, '*');

            } catch (error) {
              console.error('${t('console.loadError')}', error);
              clearTimeout(timeout);
              document.getElementById('loading').style.display = 'none';
              document.getElementById('error').style.display = 'flex';
              
              // 检查错误类型
              const isResourceMissing = error.message.includes('Failed to load') || 
                                      error.message.includes('404') ||
                                      error.message.includes('找不到资源') ||
                                      error.message.includes('资源缺失');
              
              // 根据错误类型显示不同的按钮
              const reloadButton = document.getElementById('reload-button');
              const helpButton = document.getElementById('help-button');
              
              if (isResourceMissing) {
                reloadButton.style.display = 'none';
                helpButton.style.display = 'inline-block';
              } else {
                reloadButton.style.display = 'inline-block';
                helpButton.style.display = 'none';
              }
              
              window.parent.postMessage({ 
                type: 'modelLoadError',
                error: error.message,
                isResourceMissing: isResourceMissing
              }, '*');
            }

            return scene;
          }

          createScene().then(scene => {
            engine.runRenderLoop(() => {
              scene.render();
            });
          });

          // 响应窗口大小变化
          window.addEventListener('resize', () => {
            engine.resize();
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
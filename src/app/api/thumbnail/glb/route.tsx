import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const modelPath = searchParams.get('model')

  if (!modelPath) {
    return new NextResponse('Missing model path', { status: 400 })
  }
  // GLB 格式使用 model-viewer (原有代码)
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <script type="module" src="/vendor/model-viewer-bundle.js"></script>
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
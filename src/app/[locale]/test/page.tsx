import { UploadComparison } from '@/components/test/UploadComparison';

export default function TestPage() {
  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white shadow sm:rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-8">
            文件上传方式对比测试
          </h1>
          
          <div className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-md">
              <h2 className="text-sm font-medium text-blue-800 mb-2">
                测试说明
              </h2>
              <ul className="text-sm text-blue-700 list-disc pl-5 space-y-1">
                <li>请准备不同大小的文件进行测试</li>
                <li>可以尝试上传大文件（如视频）来体验两种方式的差异</li>
                <li>观察上传速度、进度显示等指标</li>
                <li>可以通过断网等方式测试上传中断的情况</li>
              </ul>
            </div>

            <UploadComparison />
          </div>
        </div>
      </div>
    </div>
  );
} 
import type { Category } from '@/types/help'

export const helpItems: Category[] = [
  {
    id: 'model',
    category: '模型相关',
    questions: [
      {
        id: 'model-1',
        q: '支持哪些格式的模型？',
        a: [
          '目前支持以下格式的模型文件：',
          {
            type: 'list',
            items: [
              {
                title: 'GLB (.glb)',
                description: '推荐格式，包含完整的模型、材质和动画数据，无需额外的资源文件'
              },
              {
                title: 'GLTF (.gltf)',
                description: '支持外部资源引用的模型格式，适合需要分离资源的场景'
              },
              {
                title: 'Collada (.dae)',
                description: '支持带贴图的静态模型，可搭配 SMD 动画，适合需要自定义动画的场景'
              }
            ]
          }
        ]
      },
      {
        id: 'model-2',
        q: '为什么我的模型显示错误？',
        a: [
          '对于 DAE 格式，请检查是否上传了所需的贴图文件。',
          {
            type: 'image',
            src: '/help/model-2-1.png',
            alt: 'DAE 上传贴图步骤示例',
            width: 600,
            height: 300
          },
          '对于 GLTF 格式，请确保同时上传相关的贴图文件和二进制文件（.bin）。如果实在没有贴图，可以切换为glb引擎。',
          {
            type: 'image',
            src: '/help/model-2-2.jpg',
            alt: 'GLTF 文件结构示例',
            width: 600,
            height: 300
          }
        ]
      },
      {
        id: 'model-3',
        q: '模型文件大小有限制吗？',
        a: '单个模型文件大小限制为 100MB。建议在上传前对模型进行适当压缩以获得更好的加载性能。'
      },
      {
        id: 'model-4',
        q: 'gltf提示材质错误？',
        a: '本站的glb引擎采用three.js进行模型加载，但是新版本的three移除了对KHR材质扩展的支持，所以如果模型使用了KHR材质扩展，则无法加载贴图。您可以使用babylon进行预览。'
      }
    ]
  },
  {
    id: 'animation',
    category: '动画相关',
    questions: [
      {
        id: 'animation-1',
        q: '如何为模型添加动画？',
        a: [
          '对于 DAE 模型，您可以按照以下步骤添加 SMD 动画：',
          {
            type: 'steps',
            content: [
              '在关联模型列表找到您的 DAE 模型',
              '在弹出的对话框中选择 SMD 格式的动画文件',
              '点击上传完成添加'
            ]
          },
          {
            type: 'image',
            src: '/help/animation-1.png',
            alt: '添加动画步骤示例',
            width: 600,
            height: 300
          },
          '上传完成后，您可以在模型预览页面的左侧找到新添加的动画。'
        ]
      },
      {
        id: 'animation-2',
        q: '为什么我无法上传动画？',
        a: 'SMD 动画仅支持 DAE 格式的模型。如果您使用的是 GLB 格式，请使用模型自带的动画。'
      },
      {
        id: 'animation-3',
        q: '如何调整动画播放速度？',
        a: '在动画播放控制器中，您可以使用速度滑块来调整动画的播放速度。'
      },
      {
        id: 'animation-4',
        q: '为什么动画播放不流畅？',
        a: '这可能是由于动画文件过大或帧率设置不当导致。建议检查动画文件的帧率设置，并确保动画文件大小适中。'
      }
    ]
  },
  {
    id: 'preview',
    category: '查看与预览',
    questions: [
      {
        id: 'preview-1',
        q: '如何旋转和缩放模型？',
        a: '使用鼠标左键拖动可以旋转模型，滚轮可以缩放模型，按住鼠标右键拖动可以平移视角。'
      },
      {
        id: 'preview-2',
        q: '如何重置视角？',
        a: '点击右上角的"重置视角"按钮可以将视角恢复到默认状态。'
      },
      {
        id: 'preview-3',
        q: '如何隐藏/显示某些部件？',
        a: '在右侧面板的"模型部件"列表中，点击眼睛图标可以控制各个部件的显示状态。'
      }
    ]
  },
  {
    id: 'other',
    category: '其他问题',
    questions: [
      {
        id: 'other-1',
        q: '如何设置模型为私有？',
        a: '在上传模型时，或者编辑已上传的模型，取消勾选"公开模型"选项即可将模型设为私有，只有您自己可以查看。'
      },
      {
        id: 'other-2',
        q: '如何删除已上传的模型或动画？',
        a: '在模型列表中找到要删除的模型，点击删除按钮即可。删除模型会同时删除与之关联的所有动画。'
      },
      {
        id: 'other-3',
        q: '遇到其他技术问题怎么办？',
        a: '如果您遇到其他技术问题，请联系技术支持或在问题反馈区提交您的问题。'
      }
    ]
  }
] 
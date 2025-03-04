import type { Category } from '@/types/help'

export const helpItems: Category[] = [
  {
    id: 'model',
    category: 'Model Related',
    questions: [
      {
        id: 'model-1',
        q: 'Which model formats are supported?',
        a: [
          'Currently, the following model file formats are supported:',
          {
            type: 'list',
            items: [
              {
                title: 'GLB (.glb)',
                description: 'Recommended format, includes complete model, material and animation data without additional resource files'
              },
              {
                title: 'GLTF (.gltf)',
                description: 'Model format supporting external resource references, suitable for scenarios requiring resource separation'
              },
              {
                title: 'Collada (.dae)',
                description: 'Supports static models with textures, can be paired with SMD animations, suitable for scenes requiring custom animations'
              }
            ]
          }
        ]
      },
      {
        id: 'model-2',
        q: 'Why is my model displayed incorrectly?',
        a: [
          'For DAE format, please check if you have uploaded the required texture files.',
          {
            type: 'image',
            src: '/help/model-2-1.png',
            alt: 'DAE texture upload step example',
            width: 600,
            height: 300
          },
          'For GLTF format, ensure you upload related texture files and binary files (.bin). If there are no textures, you can switch to the glb engine.',
          {
            type: 'image',
            src: '/help/model-2-2.jpg',
            alt: 'GLTF file structure example',
            width: 600,
            height: 300
          }
        ]
      },
      {
        id: 'model-3',
        q: 'Is there a size limit for model files?',
        a: 'Individual model files are limited to 100MB. We recommend appropriately compressing models before uploading for better loading performance.'
      },
      {
        id: 'model-4',
        q: 'GLTF showing material errors?',
        a: 'Our GLB engine uses three.js for model loading, but newer versions of three have removed support for KHR material extensions. If your model uses KHR material extensions, textures cannot be loaded. You can use babylon for preview instead.'
      }
    ]
  },
  {
    id: 'animation',
    category: 'Animation Related',
    questions: [
      {
        id: 'animation-1',
        q: 'How to add animations to a model?',
        a: [
          'For DAE models, you can add SMD animations following these steps:',
          {
            type: 'steps',
            content: [
              'Find your DAE model in the related models list',
              'Select the SMD format animation file in the dialog that appears',
              'Click upload to complete the addition'
            ]
          },
          {
            type: 'image',
            src: '/help/animation-1.png',
            alt: 'Add animation step example',
            width: 600,
            height: 300
          },
          'After uploading, you can find the newly added animation on the left side of the model preview page.'
        ]
      },
      {
        id: 'animation-2',
        q: 'Why can\'t I upload animations?',
        a: 'SMD animations only support DAE format models. If you are using GLB format, please use the animations included with the model.'
      },
      {
        id: 'animation-3',
        q: 'How to adjust animation playback speed?',
        a: 'In the animation player controller, you can use the speed slider to adjust the playback speed of the animation.'
      },
      {
        id: 'animation-4',
        q: 'Why is animation playback not smooth?',
        a: 'This may be due to oversized animation files or improper frame rate settings. Check the frame rate settings of the animation file and ensure the animation file size is moderate.'
      }
    ]
  },
  {
    id: 'preview',
    category: 'Viewing & Preview',
    questions: [
      {
        id: 'preview-1',
        q: 'How to rotate and scale models?',
        a: 'Use the left mouse button drag to rotate the model, the scroll wheel to scale the model, and hold the right mouse button drag to pan the view.'
      },
      {
        id: 'preview-2',
        q: 'How to reset the view?',
        a: 'Click the "Reset View" button in the top right corner to restore the view to its default state.'
      },
      {
        id: 'preview-3',
        q: 'How to hide/show certain parts?',
        a: 'In the "Model Parts" list in the right panel, click the eye icon to control the display state of each part.'
      }
    ]
  },
  {
    id: 'other',
    category: 'Other Questions',
    questions: [
      {
        id: 'other-1',
        q: 'How to set a model as private?',
        a: 'When uploading a model, or editing an already uploaded model, uncheck the "Public Model" option to set the model as private, viewable only by yourself.'
      },
      {
        id: 'other-2',
        q: 'How to delete uploaded models or animations?',
        a: 'Find the model you want to delete in the model list and click the delete button. Deleting a model will also delete all animations associated with it.'
      },
      {
        id: 'other-3',
        q: 'What if I encounter other technical issues?',
        a: 'If you encounter other technical issues, please contact technical support or submit your question in the feedback area.'
      }
    ]
  }
] 
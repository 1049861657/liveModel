/**
 * GLTF转换工具
 * 用于将使用KHR_materials_pbrSpecularGlossiness扩展的GLTF模型
 * 转换为标准PBR材质(KHR_materials_pbrMetallicRoughness)
 */
import { createTranslator } from 'next-intl';

// 日志回调函数类型
export type LogCallback = (message: string) => void;

/**
 * 将GLTF文件从SpecGloss转换为MetallicRoughness
 * @param file 要转换的GLTF文件
 * @param onLog 日志回调函数
 * @param locale 当前语言环境
 * @returns 包含转换结果的Promise
 */
export async function convertGltfModel(
  file: File, 
  onLog?: LogCallback, 
  locale: string = 'zh'
): Promise<{
  convertedFile: Blob | null;
  hasSpecGloss: boolean;
  error?: string;
}> {
  // 创建翻译函数
  const t = createTranslator({
    locale,
    namespace: 'GltfFix'
  });

  try {
    // 检查文件扩展名，只接受.gltf文件
    if (!file.name.toLowerCase().endsWith('.gltf')) {
      const errorMsg = t('onlyGltfSupported');
      onLog?.(errorMsg);
      return { convertedFile: null, hasSpecGloss: false, error: errorMsg };
    }

    onLog?.(t('fileInfo', { name: file.name, size: (file.size / 1024).toFixed(2) }));
    onLog?.(t('initConversion'));

    // 读取文件内容
    const fileReader = new FileReader();
    
    // 使用Promise包装FileReader
    const readFileAsText = (): Promise<string> => {
      return new Promise<string>((resolve, reject) => {
        fileReader.onload = () => {
          if (typeof fileReader.result === 'string') {
            resolve(fileReader.result);
          } else {
            reject(new Error(t('fileReadFailed')));
          }
        };
        fileReader.onerror = () => reject(fileReader.error);
        fileReader.readAsText(file);
      });
    };
    
    // 读取文件内容
    onLog?.(t('readingFile'));
    const jsonText = await readFileAsText();
    onLog?.(t('parsingJson'));
    
    // 解析JSON
    let gltfJson;
    try {
      gltfJson = JSON.parse(jsonText);
      onLog?.(t('jsonParseComplete'));
    } catch (parseError) {
      const errorMsg = t('jsonParseError', { 
        error: parseError instanceof Error ? parseError.message : String(parseError) 
      });
      onLog?.(errorMsg);
      return { convertedFile: null, hasSpecGloss: false, error: errorMsg };
    }
    
    // 验证GLTF格式
    if (!gltfJson.asset || !gltfJson.asset.version) {
      const errorMsg = t('invalidGltf');
      onLog?.(errorMsg);
      return { convertedFile: null, hasSpecGloss: false, error: errorMsg };
    }
    
    // 检查是否使用了KHR_materials_pbrSpecularGlossiness扩展
    const extensionsUsed = gltfJson.extensionsUsed || [];
    onLog?.(t('detectingExtensions', { 
      extensions: extensionsUsed.join(', ') || t('none') 
    }));
    
    const hasSpecGloss = extensionsUsed.includes('KHR_materials_pbrSpecularGlossiness');
    
    if (hasSpecGloss) {
      onLog?.(t('specGlossFound'));
      
      // 手动转换材质
      try {
        // 遍历所有材质
        if (gltfJson.materials) {
          for (const material of gltfJson.materials) {
            // 检查材质是否使用了KHR_materials_pbrSpecularGlossiness扩展
            if (material.extensions && material.extensions.KHR_materials_pbrSpecularGlossiness) {
              const specGloss = material.extensions.KHR_materials_pbrSpecularGlossiness;
              
              // 创建pbrMetallicRoughness属性（如果不存在）
              if (!material.pbrMetallicRoughness) {
                material.pbrMetallicRoughness = {};
              }
              
              // 转换漫反射颜色到基础颜色
              if (specGloss.diffuseFactor) {
                material.pbrMetallicRoughness.baseColorFactor = specGloss.diffuseFactor;
              }
              
              // 转换漫反射纹理到基础颜色纹理
              if (specGloss.diffuseTexture) {
                material.pbrMetallicRoughness.baseColorTexture = specGloss.diffuseTexture;
              }
              
              // 设置金属度和粗糙度
              // 镜面光泽度转换为粗糙度: 粗糙度 = 1.0 - 光泽度
              const glossiness = specGloss.glossinessFactor !== undefined ? specGloss.glossinessFactor : 1.0;
              material.pbrMetallicRoughness.roughnessFactor = 1.0 - glossiness;
              
              // 镜面反射率转换为金属度（简化转换）
              // 这是一个简化的转换，实际上更复杂
              material.pbrMetallicRoughness.metallicFactor = 0.0; // 默认为非金属
              
              // 删除KHR_materials_pbrSpecularGlossiness扩展
              delete material.extensions.KHR_materials_pbrSpecularGlossiness;
              
              // 如果extensions为空，删除它
              if (Object.keys(material.extensions).length === 0) {
                delete material.extensions;
              }
              
              onLog?.(t('convertingMaterial', { name: material.name || t('unnamed') }));
            }
          }
        }
        
        // 从extensionsUsed中移除KHR_materials_pbrSpecularGlossiness
        const index = gltfJson.extensionsUsed.indexOf('KHR_materials_pbrSpecularGlossiness');
        if (index !== -1) {
          gltfJson.extensionsUsed.splice(index, 1);
          
          // 如果extensionsUsed为空，删除它
          if (gltfJson.extensionsUsed.length === 0) {
            delete gltfJson.extensionsUsed;
          }
        }
        
        // 从extensionsRequired中移除KHR_materials_pbrSpecularGlossiness（如果存在）
        if (gltfJson.extensionsRequired) {
          const reqIndex = gltfJson.extensionsRequired.indexOf('KHR_materials_pbrSpecularGlossiness');
          if (reqIndex !== -1) {
            gltfJson.extensionsRequired.splice(reqIndex, 1);
            
            // 如果extensionsRequired为空，删除它
            if (gltfJson.extensionsRequired.length === 0) {
              delete gltfJson.extensionsRequired;
            }
          }
        }
        
        onLog?.(t('conversionComplete'));
        
        // 创建转换后的文件，使用自定义序列化函数
        const blob = new Blob([compactStringify(gltfJson, 2)], { type: 'model/gltf+json' });
        onLog?.(t('conversionSuccess', { size: (blob.size / 1024).toFixed(2) }));
        
        return { convertedFile: blob, hasSpecGloss: true };
      } catch (transformError) {
        const errorMsg = t('materialConversionFailed', { 
          error: transformError instanceof Error ? transformError.message : String(transformError) 
        });
        onLog?.(errorMsg);
        return { convertedFile: null, hasSpecGloss: true, error: errorMsg };
      }
    } else {
      const infoMsg = t('noSpecGlossFound');
      onLog?.(infoMsg);
      return { convertedFile: null, hasSpecGloss: false, error: infoMsg };
    }
  } catch (err) {
    const errorMsg = t('processingError', { 
      error: err instanceof Error ? err.message : String(err) 
    });
    onLog?.(errorMsg);
    return { convertedFile: null, hasSpecGloss: false, error: errorMsg };
  }
}

/**
 * 创建一个自定义的JSON序列化函数，使数值数组更紧凑
 * @param obj 要序列化的对象
 * @param space 缩进空格数
 * @returns 格式化的JSON字符串
 */
function compactStringify(obj: any, space: number = 2): string {
  // 基本的JSON字符串
  const json = JSON.stringify(obj, null, space);
  
  // 使用正则表达式查找数值数组并将它们压缩到一行
  // 匹配形如 [数字, 数字, ...] 的模式，可能跨越多行
  const numberArrayRegex = /\[\s*-?\d+\.?\d*e?-?\d*\s*,\s*-?\d+\.?\d*e?-?\d*\s*(,\s*-?\d+\.?\d*e?-?\d*\s*)*\]/g;
  
  // 替换找到的数值数组，移除其中的换行和多余空格
  return json.replace(numberArrayRegex, (match) => {
    // 将数组内的所有空白字符替换为单个空格
    return match.replace(/\s+/g, ' ');
  });
}
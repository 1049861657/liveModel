import * as THREE from 'three'

export interface BoneData {
  bone: number
  position: THREE.Vector3
  rotation: THREE.Vector3
}

export interface Frame {
  time: number
  bones: BoneData[]
}

export interface AnimationInfo {
  name: string
  duration: number
  frameCount: number
  boneCount: number
}

export class SMDParser {
  private initialPoses = new Map<string, {
    position: THREE.Vector3
    rotation: THREE.Quaternion
  }>()

  parse(text: string) {
    const lines = text.split('\n')
    const bones: any[] = []
    const frames: any[] = []
    let currentFrame: any = null
    let section = ''
    let version = ''
    let name = 'Unknown Animation'

    lines.forEach(line => {
      line = line.trim()
      const parts = line.split(' ')

      if (line.startsWith('version')) {
        version = parts[1]
      } else if (line.startsWith('//') && line.toLowerCase().includes('name:')) {
        name = line.split('name:')[1].trim()
      }

      if (line.startsWith('//') || line.startsWith('#') || line.startsWith(';')) {
        return
      }

      if (line === 'nodes') {
        section = 'nodes'
        return
      } else if (line === 'skeleton') {
        section = 'skeleton'
        return
      }

      if (section === 'nodes') {
        if (line === 'end') {
          section = ''
          return
        }

        if (parts.length >= 3) {
          bones.push({
            id: parseInt(parts[0]),
            name: parts[1].replace(/"/g, ''),
            parent: parseInt(parts[2])
          })
        }
      }

      if (section === 'skeleton') {
        if (line === 'end') {
          section = ''
          return
        }

        if (parts[0] === 'time') {
          if (currentFrame) frames.push(currentFrame)
          currentFrame = {
            time: parseInt(parts[1]),
            bones: []
          }
        } else if (currentFrame && parts.length >= 7) {
          currentFrame.bones.push({
            bone: parseInt(parts[0]),
            position: new THREE.Vector3(
              parseFloat(parts[1]),
              parseFloat(parts[2]),
              parseFloat(parts[3])
            ),
            rotation: new THREE.Vector3(
              parseFloat(parts[4]) * THREE.MathUtils.RAD2DEG,
              parseFloat(parts[5]) * THREE.MathUtils.RAD2DEG,
              parseFloat(parts[6]) * THREE.MathUtils.RAD2DEG
            )
          })
        }
      }
    })

    if (currentFrame) frames.push(currentFrame)

    const firstFrame = frames[0]
    const referencepose = new Map()
    
    if (firstFrame) {
      firstFrame.bones.forEach((boneData: BoneData) => {
        referencepose.set(boneData.bone, {
          position: boneData.position.clone(),
          rotation: boneData.rotation.clone()
        })
      })
    }
    
    frames.forEach((frame: Frame) => {
      frame.bones.forEach((boneData: BoneData) => {
        const reference = referencepose.get(boneData.bone)
        if (reference) {
          boneData.position.sub(reference.position)
          boneData.rotation.sub(reference.rotation)
        }
      })
    })
    
    const animationInfo: AnimationInfo = {
      name: name || `Animation_${version}`,
      duration: Number((frames.length / 30).toFixed(2)),
      frameCount: frames.length,
      boneCount: bones.length
    }

    return { bones, frames, animationInfo }
  }

  saveInitialPose(bone: THREE.Bone) {
    this.initialPoses.set(bone.name, {
      position: bone.position.clone(),
      rotation: bone.quaternion.clone()
    })
  }

  resetBone(bone: THREE.Bone) {
    const initial = this.initialPoses.get(bone.name)
    if (initial) {
      bone.position.copy(initial.position)
      bone.quaternion.copy(initial.rotation)
    }
  }

  clear() {
    this.initialPoses.clear()
  }
}

export default new SMDParser() 
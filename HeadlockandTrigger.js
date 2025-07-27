// === Vector3 Utility Class ===
class Vector3 {
  constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }

  add(v) { return new Vector3(this.x + v.x, this.y + v.y, this.z + v.z); }
  subtract(v) { return new Vector3(this.x - v.x, this.y - v.y, this.z - v.z); }
  multiply(s) { return new Vector3(this.x * s, this.y * s, this.z * s); }
  dot(v) { return this.x * v.x + this.y * v.y + this.z * v.z; }
  length() { return Math.sqrt(this.x ** 2 + this.y ** 2 + this.z ** 2); }
  normalize() { const l = this.length(); return l === 0 ? new Vector3(0, 0, 0) : this.multiply(1 / l); }
  distanceTo(v) { return this.subtract(v).length(); }
  static zero() { return new Vector3(0, 0, 0); }
}

// === Camera Controller ===
class CameraController {
  constructor() {
    this.position = new Vector3(0, 1.6, -2);
    this.rotation = { x: 0, y: 0 }; // pitch (x), yaw (y)
    this.smoothing = 0.01;
  }

  getPosition() { return this.position; }

  getDirection() {
    const yaw = this.rotation.y, pitch = this.rotation.x;
    return new Vector3(
      Math.sin(yaw) * Math.cos(pitch),
      Math.sin(-pitch),
      Math.cos(yaw) * Math.cos(pitch)
    ).normalize();
  }

  aimAt(target) {
    const dir = target.subtract(this.getPosition()).normalize();
    const yaw = Math.atan2(dir.x, dir.z);
    const pitch = -Math.asin(dir.y);
    this.rotation.y += (yaw - this.rotation.y) * this.smoothing;
    this.rotation.x += (pitch - this.rotation.x) * this.smoothing;
  }
}

// === Transform Utility ===
class TransformUtils {
  static rotateByQuaternion(v, q) {
    const { x, y, z } = v;
    const { x: qx, y: qy, z: qz, w: qw } = q;

    const ix = qw * x + qy * z - qz * y;
    const iy = qw * y + qz * x - qx * z;
    const iz = qw * z + qx * y - qy * x;
    const iw = -qx * x - qy * y - qz * z;

    return new Vector3(
      ix * qw + iw * -qx + iy * -qz - iz * -qy,
      iy * qw + iw * -qy + iz * -qx - ix * -qz,
      iz * qw + iw * -qz + ix * -qy - iy * -qx
    );
  }

  static applyFullTransform(pos, bindpose, rotation = null, scale = null) {
    let v = new Vector3(pos.x, pos.y, pos.z);
    if (scale) v = new Vector3(v.x * scale.x, v.y * scale.y, v.z * scale.z);
    if (rotation) v = this.rotateByQuaternion(v, rotation);
    const { e00, e01, e02, e03, e10, e11, e12, e13, e20, e21, e22, e23 } = bindpose;
    return new Vector3(
      e00 * v.x + e01 * v.y + e02 * v.z + e03,
      e10 * v.x + e11 * v.y + e12 * v.z + e13,
      e20 * v.x + e21 * v.y + e22 * v.z + e23
    );
  }
}

// === Head Hitbox ===
class HeadHitbox {
  constructor(config, bonePos, bindpose, rotation = null, scale = null) {
    const col = config.boneColliderProperty || config.defaultBoneColliderProperty;
    const reducer = col.reducerProperty || {};
    const scl = reducer.scale || { x: 1, y: 1, z: 1 };
    const offset = reducer.offset || { x: 0, y: 0, z: 0 };
    const thick = reducer.minThickness || { x: 0.01, y: 0.01, z: 0.01 };

    const worldPos = TransformUtils.applyFullTransform(bonePos, bindpose, rotation, scale);
    this.center = worldPos.add(new Vector3(offset.x, offset.y, offset.z));
    this.radius = Math.max(thick.x, thick.z, 0.1);
    this.radiusX = thick.x * scl.x;
    this.radiusY = thick.y * scl.y;
  }

  containsCrosshair(crosshair, threshold = 0.2) {
    const dx = Math.abs(crosshair.x - this.center.x);
    const dy = Math.abs(crosshair.y - this.center.y);
    if (dx < this.radiusX && dy < this.radiusY) {
      const accuracy = (1 - dx / this.radiusX + 1 - dy / this.radiusY) / 2;
      return accuracy >= threshold;
    }
    return false;
  }

  isInLineOfSight(camPos, camDir) {
    const toHead = this.center.subtract(camPos);
    const proj = camDir.dot(toHead);
    if (proj < 0) return false;
    const hit = camPos.add(camDir.multiply(proj));
    return hit.distanceTo(this.center) <= this.radius * 1.05;
  }
}

// === Auto-Aim System ===
class AutoAimSystem {
  constructor() {
    this.camera = new CameraController();
    this.crosshair = { x: 0.5, y: 0.5 }; // screen center
    this.firePressed = false;
    this.autoFire = true;
    this.targets = [];
  }

  setFire(state) { this.firePressed = state; }
  setAutoFire(state) { this.autoFire = state; }

  addTarget(config, pos, bindpose, rot, scale) {
    const hitbox = new HeadHitbox(config, pos, bindpose, rot, scale);
    this.targets.push(hitbox);
  }

  findBestTarget() {
    const camPos = this.camera.getPosition();
    const camDir = this.camera.getDirection();
    let best = null, bestScore = -Infinity;

    for (const t of this.targets) {
      if (!t.isInLineOfSight(camPos, camDir)) continue;
      const dist = camPos.distanceTo(t.center);
      const angle = Math.acos(camDir.dot(t.center.subtract(camPos).normalize()));
      const score = 1 / (dist * (1 + angle));
      if (score > bestScore) { best = t; bestScore = score; }
    }
    return best;
  }

  triggerShoot() {
    console.log("🔫 FIRE triggered");
    // Gửi input thực tế tại đây nếu cần
  }

  sendInput(deltaX, deltaY) {
    console.log(`🖱 Adjust: Δx=${deltaX.toFixed(3)} Δy=${deltaY.toFixed(3)}`);
  }

  update() {
    const target = this.findBestTarget();
    if (!target) return;

    const camPos = this.camera.getPosition();
    const camDir = this.camera.getDirection();

    if (target.containsCrosshair(this.crosshair, 0.2)) {
      this.sendInput(0, 0); // giữ cứng
      if (this.autoFire) this.triggerShoot();
    } else if (this.firePressed) {
      this.camera.aimAt(target.center); // kéo về head
    } else if (this.autoFire && target.isInLineOfSight(camPos, camDir)) {
      this.triggerShoot(); // tự bắn
    }
  }
}

const autoAim = new AutoAimSystem();

const headConfig = {
  "boneColliderProperty": {
    "boneProperty": {
      "recursivery": 0
    },
    "splitProperty": {
      "boneWeightType": 0,
      "boneWeight2": 100,
      "boneWeight3": 100,
      "boneWeight4": 100,
      "greaterBoneWeight": 1,
      "boneTriangleExtent": 0
    },
    "reducerProperty": {
      "shapeType": 3,
      "fitType": 0,
      "meshType": 3,
      "maxTriangles": 255,
      "sliceMode": 0,
      "scale": {
        "x": 1.0,
        "y": 1.0,
        "z": 1.0
      },
      "scaleElementType": 0,
      "minThickness": {
        "x": 0.01,
        "y": 0.01,
        "z": 0.01
      },
      "minThicknessElementType": 0,
      "optimizeRotation": {
        "x": 1,
        "y": 1,
        "z": 1
      },
      "optimizeRotationElementType": 0,
      "colliderToChild": 2,
      "offset": {
        "x": 0.0,
        "y": 0.0,
        "z": 0.0
      },
      "thicknessA": {
        "x": 0.0,
        "y": 0.0,
        "z": 0.0
      },
      "thicknessB": {
        "x": 0.0,
        "y": 0.0,
        "z": 0.0
      },
      "viewAdvanced": 0
    },
    "colliderProperty": {
      "convex": 1,
      "isTrigger": 0,
      "material": {
        "m_FileID": 0,
        "m_PathID": 0
      },
      "isCreateAsset": 0
    },
    "rigidbodyProperty": {
      "mass": 1.0,
      "drag": 0.0,
      "angularDrag": 0.05,
      "isKinematic": 1,
      "useGravity": 0,
      "interpolation": 0,
      "collisionDetectionMode": 0,
      "isCreate": 0,
      "viewAdvanced": 0
    },
    "modifyNameEnabled": 0
  },
  "defaultBoneColliderProperty": {
    "boneProperty": {
      "recursivery": 0
    },
    "splitProperty": {
      "boneWeightType": 0,
      "boneWeight2": 50,
      "boneWeight3": 33,
      "boneWeight4": 25,
      "greaterBoneWeight": 1,
      "boneTriangleExtent": 1
    },
    "reducerProperty": {
      "shapeType": 2,
      "fitType": 0,
      "meshType": 3,
      "maxTriangles": 255,
      "sliceMode": 0,
      "scale": {
        "x": 1.0,
        "y": 1.0,
        "z": 1.0
      },
      "scaleElementType": 0,
      "minThickness": {
        "x": 0.01,
        "y": 0.01,
        "z": 0.01
      },
      "minThicknessElementType": 0,
      "optimizeRotation": {
        "x": 1,
        "y": 1,
        "z": 1
      },
      "optimizeRotationElementType": 0,
      "colliderToChild": 0,
      "offset": {
        "x": 0.0,
        "y": 0.0,
        "z": 0.0
      },
      "thicknessA": {
        "x": 0.0,
        "y": 0.0,
        "z": 0.0
      },
      "thicknessB": {
        "x": 0.0,
        "y": 0.0,
        "z": 0.0
      },
      "viewAdvanced": 0
    },
    "colliderProperty": {
      "convex": 1,
      "isTrigger": 0,
      "material": {
        "m_FileID": 0,
        "m_PathID": 0
      },
      "isCreateAsset": 0
    },
    "rigidbodyProperty": {
      "mass": 1.0,
      "drag": 0.0,
      "angularDrag": 0.05,
      "isKinematic": 1,
      "useGravity": 0,
      "interpolation": 0,
      "collisionDetectionMode": 0,
      "isCreate": 1,
      "viewAdvanced": 0
    },
    "modifyNameEnabled": 0
  }
};
const GamePackages = {
  GamePackage1: "com.dts.freefireth",
  GamePackage2: "com.dts.freefiremax"
};

// ===

const boneHeadPosition = { x: -0.0457, y: -0.00447, z: -0.02004 };
const boneHeadRotation = { x: 0.0258, y: -0.0861, z: -0.1402, w: 0.9860 };
const boneHeadScale = { x: 0.9999, y: 1.0, z: 1.0 };
const bindpose = {
  e00: -1.34559613e-13, e01: 8.881784e-14, e02: -1.0, e03: 0.487912,
  e10: -2.84512817e-06, e11: -1.0, e12: 8.881784e-14, e13: -2.842171e-14,
  e20: -1.0, e21: 2.84512817e-06, e22: -1.72951931e-13, e23: 0.0,
  e30: 0.0, e31: 0.0, e32: 0.0, e33: 1.0
};

autoAim.addTarget(headConfig, boneHeadPosition, bindpose, boneHeadRotation, boneHeadScale);

// Tick loop
setInterval(() => {
  autoAim.setFire(true); // nếu giữ chuột
  autoAim.update();
}, 8);

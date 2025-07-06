// === Vector3 Class ===
class Vector3 {
  constructor(x, y, z) {
    this.x = x; this.y = y; this.z = z;
  }
  subtract(v) { return new Vector3(this.x - v.x, this.y - v.y, this.z - v.z); }
  add(v) { return new Vector3(this.x + v.x, this.y + v.y, this.z + v.z); }
  dot(v) { return this.x * v.x + this.y * v.y + this.z * v.z; }
  length() { return Math.sqrt(this.x ** 2 + this.y ** 2 + this.z ** 2); }
  normalize() { const len = this.length(); return len === 0 ? new Vector3(0, 0, 0) : new Vector3(this.x / len, this.y / len, this.z / len); }
  distanceTo(v) { return this.subtract(v).length(); }
}

// === Camera / Crosshair State ===
const camera = {
  position: { x: 0, y: 1.6, z: -2 },
  rotation: { x: 0, y: 0 }
};
let fireButtonPressed = false;
let autoFireEnabled = true;
const crosshair = { x: 0.5, y: 0.5 }; // Mặc định tâm giữa màn hình

// === Utilities ===
function getCameraPosition() {
  return new Vector3(camera.position.x, camera.position.y, camera.position.z);
}
function getCameraDirection() {
  const yaw = camera.rotation.y, pitch = camera.rotation.x;
  return new Vector3(
    Math.sin(yaw) * Math.cos(pitch),
    Math.sin(-pitch),
    Math.cos(yaw) * Math.cos(pitch)
  ).normalize();
}
function applyFullTransform(position, bindpose) {
  const { x, y, z } = position;
  return new Vector3(
    bindpose.e00 * x + bindpose.e01 * y + bindpose.e02 * z + bindpose.e03,
    bindpose.e10 * x + bindpose.e11 * y + bindpose.e12 * z + bindpose.e13,
    bindpose.e20 * x + bindpose.e21 * y + bindpose.e22 * z + bindpose.e23
  );
}

// === Tạo Hitbox Head ===
function createHeadHitbox(config, boneHeadPos, bindposeMatrix) {
  const col = config.boneColliderProperty || config.defaultBoneColliderProperty;
  const scale = col?.reducerProperty?.scale || { x: 1, y: 1, z: 1 };
  const offset = col?.reducerProperty?.offset || { x: 0, y: 0, z: 0 };
  const minThickness = col?.reducerProperty?.minThickness || { x: 0.01, y: 0.01, z: 0.01 };
  const radius = Math.max(minThickness.x, minThickness.z, 0.1);
  const transformed = applyFullTransform(boneHeadPos, bindposeMatrix);
  const center = transformed.add(new Vector3(offset.x, offset.y, offset.z));
  return { center, radius, height: 0.22 * scale.y };
}

// === Lock Tâm Ngắm Về Đầu ===
function dragAimToHead(headCenter, cameraPos) {
  const dir = headCenter.subtract(cameraPos).normalize();
  const yaw = Math.atan2(dir.x, dir.z);
  const pitch = -Math.asin(dir.y);
  applyAimRotation(yaw, pitch);
}
function applyAimRotation(yaw, pitch) {
  const smooth = 0.22;
  camera.rotation.y += (yaw - camera.rotation.y) * smooth;
  camera.rotation.x += (pitch - camera.rotation.x) * smooth;
}

// === Trigger bắn nếu tâm nằm trong head ===
function crosshairInsideHead(cameraPos, cameraDir, headCenter, radius) {
  const toHead = headCenter.subtract(cameraPos);
  const projLength = cameraDir.dot(toHead);
  if (projLength < 0) return false;
  const projPoint = new Vector3(
    cameraPos.x + cameraDir.x * projLength,
    cameraPos.y + cameraDir.y * projLength,
    cameraPos.z + cameraDir.z * projLength
  );
  return projPoint.distanceTo(headCenter) <= radius * 1.05;
}

function triggerShoot() {
  console.log("🔫 Auto-FIRE triggered!");
  // TODO: Gửi sự kiện bắn
}

function sendInputToMouse({ deltaX, deltaY }) {
  console.log(`🎯 Stabilize mouse: Δx=${deltaX.toFixed(4)}, Δy=${deltaY.toFixed(4)}`);
}

// === Check Crosshair Trúng Collider Head ===
function checkHitHeadByCrosshair(crosshair, headWorld, headConfig, accuracyThreshold = 0.2) {
  const collider = headConfig?.boneColliderProperty || headConfig?.defaultBoneColliderProperty;
  if (!collider || !collider.reducerProperty) return false;

  const scale = collider.reducerProperty.scale || { x: 1.0, y: 1.0, z: 1.0 };
  const thickness = collider.reducerProperty.minThickness || { x: 0.01, y: 0.01, z: 0.01 };
  const radiusX = scale.x * thickness.x;
  const radiusY = scale.y * thickness.y;
  const dx = Math.abs(crosshair.x - headWorld.x);
  const dy = Math.abs(crosshair.y - headWorld.y);

  if (dx < radiusX && dy < radiusY) {
    const percentX = 1 - (dx / radiusX);
    const percentY = 1 - (dy / radiusY);
    const accuracy = (percentX + percentY) / 2;
    if (accuracy >= accuracyThreshold) {
      console.log(`✅ Crosshair chạm ${Math.round(accuracy * 100)}% vùng đầu`);
      return true;
    }
  }
  return false;
}

// === Hàm chính Auto Lock + Fire + Check ===
function autoLockAndTrigger(config, boneHeadPos, bindposeMatrix) {
  const cameraPos = getCameraPosition();
  const cameraDir = getCameraDirection();
  const headHitbox = createHeadHitbox(config, boneHeadPos, bindposeMatrix);
  const headCenter = headHitbox.center;

  // Nếu tâm ngắm đã nằm trong head collider (>20%) → giữ cứng
  if (checkHitHeadByCrosshair(crosshair, headCenter, config, 0.2)) {
    sendInputToMouse({ deltaX: 0, deltaY: 0 });
    return;
  }

  // Nếu đang bắn → kéo tâm về head
  if (fireButtonPressed) {
    dragAimToHead(headCenter, cameraPos);
  }

  // Nếu tâm đủ gần để tự bắn
  if (autoFireEnabled && crosshairInsideHead(cameraPos, cameraDir, headCenter, headHitbox.radius)) {
    triggerShoot();
  }
}

function applyFullTransform(position, bindpose, rotation = null, scale = null) {
  let pos = new Vector3(position.x, position.y, position.z);

  // Apply scale
  if (scale) {
    pos = new Vector3(
      pos.x * scale.x,
      pos.y * scale.y,
      pos.z * scale.z
    );
  }

  // Apply rotation (quaternion -> vector rotate)
  if (rotation) {
    pos = rotateVectorByQuaternion(pos, rotation);
  }

  // Apply bindpose matrix
  return new Vector3(
    bindpose.e00 * pos.x + bindpose.e01 * pos.y + bindpose.e02 * pos.z + bindpose.e03,
    bindpose.e10 * pos.x + bindpose.e11 * pos.y + bindpose.e12 * pos.z + bindpose.e13,
    bindpose.e20 * pos.x + bindpose.e21 * pos.y + bindpose.e22 * pos.z + bindpose.e23
  );
}

// Hàm xoay vector bởi quaternion
function rotateVectorByQuaternion(v, q) {
  const x = v.x, y = v.y, z = v.z;
  const qx = q.x, qy = q.y, qz = q.z, qw = q.w;

  // Calculate quaternion * vector
  const ix =  qw * x + qy * z - qz * y;
  const iy =  qw * y + qz * x - qx * z;
  const iz =  qw * z + qx * y - qy * x;
  const iw = -qx * x - qy * y - qz * z;

  // Calculate result * inverse quaternion
  return new Vector3(
    ix * qw + iw * -qx + iy * -qz - iz * -qy,
    iy * qw + iw * -qy + iz * -qx - ix * -qz,
    iz * qw + iw * -qz + ix * -qy - iy * -qx
  );
}

// === Đầu vào thử nghiệm ===
const boneHeadPosition = { x: -0.0457, y: -0.00447, z: -0.02004 };

const boneHeadRotation = {
  x: 0.0258174837,
  y: -0.08611039,
  z: -0.1402113,
  w: 0.9860321
};

const boneHeadScale = {
  x: 0.99999994,
  y: 1.00000012,
  z: 1.0
};

const bindpose = {
  e00: -1.34559613e-13, e01: 8.881784e-14, e02: -1.0, e03: 0.487912,
  e10: -2.84512817e-06, e11: -1.0, e12: 8.881784e-14, e13: -2.842171e-14,
  e20: -1.0, e21: 2.84512817e-06, e22: -1.72951931e-13, e23: 0.0,
  e30: 0.0, e31: 0.0, e32: 0.0, e33: 1.0
};

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


// === Tick mỗi frame (60fps) ===
setInterval(() => {
  autoLockAndTrigger(headConfig, boneHeadPosition, bindpose);
}, 16);

const transformedHead = applyFullTransform(boneHeadPosition, bindpose, boneHeadRotation, boneHeadScale);

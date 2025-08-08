let body = $response.body;

// Nếu là JSON thì parse thử
try { body = JSON.parse($response.body); } catch (e) {}
// === Enhanced Vector3 Utility Class ===
class Vector3 {
    constructor(x = 0, y = 0, z = 0) { 
        this.x = x; this.y = y; this.z = z; 
    }

    add(v) { return new Vector3(this.x + v.x, this.y + v.y, this.z + v.z); }
    subtract(v) { return new Vector3(this.x - v.x, this.y - v.y, this.z - v.z); }
    multiply(s) { return new Vector3(this.x * s, this.y * s, this.z * s); }
    dot(v) { return this.x * v.x + this.y * v.y + this.z * v.z; }
    cross(v) { 
        return new Vector3(
            this.y * v.z - this.z * v.y,
            this.z * v.x - this.x * v.z,
            this.x * v.y - this.y * v.x
        ); 
    }
    
    length() { return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z); }
    lengthSquared() { return this.x * this.x + this.y * this.y + this.z * this.z; }
    
    normalize() { 
        const l = this.length(); 
        return l === 0 ? new Vector3(0, 0, 0) : this.multiply(1 / l); 
    }
    
    distanceTo(v) { return this.subtract(v).length(); }
    distanceToSquared(v) { return this.subtract(v).lengthSquared(); }
    
    lerp(v, t) {
        return new Vector3(
            this.x + (v.x - this.x) * t,
            this.y + (v.y - this.y) * t,
            this.z + (v.z - this.z) * t
        );
    }
    
    clone() { return new Vector3(this.x, this.y, this.z); }
    equals(v, tolerance = 1e-6) {
        return Math.abs(this.x - v.x) < tolerance && 
               Math.abs(this.y - v.y) < tolerance && 
               Math.abs(this.z - v.z) < tolerance;
    }
    
    static zero() { return new Vector3(0, 0, 0); }
    static one() { return new Vector3(1, 1, 1); }
    static forward() { return new Vector3(0, 0, 1); }
    static up() { return new Vector3(0, 1, 0); }
    static right() { return new Vector3(1, 0, 0); }
}

// === Performance Monitor ===

class PerformanceMonitor {
    constructor() {
        this.metrics = {
            updateTimes: [],
            targetCount: 0,
            hitRate: 0,
            fps: 0,
            lastFrameTime: Date.now()
        };
        this.maxSamples = 60;
    }
    
    startFrame() {
        this.frameStart = Date.now();
    }
    
    endFrame() {
        const frameTime = Date.now() - this.frameStart;
        this.metrics.updateTimes.push(frameTime);
        
        if (this.metrics.updateTimes.length > this.maxSamples) {
            this.metrics.updateTimes.shift();
        }
        
        // Calculate FPS
        const now = Date.now();
        const delta = now - this.metrics.lastFrameTime;
        if (delta > 0) {
            this.metrics.fps = 1000 / delta;
        } else {
            this.metrics.fps = 0;
        }
        this.metrics.lastFrameTime = now;
    }
    
    getAverageUpdateTime() {
        if (this.metrics.updateTimes.length === 0) return 0;
        return this.metrics.updateTimes.reduce((a, b) => a + b, 0) / this.metrics.updateTimes.length;
    }
    
    getStats() {
        return {
            avgUpdateTime: this.getAverageUpdateTime().toFixed(2) + 'ms',
            fps: Math.round(this.metrics.fps),
            targetCount: this.metrics.targetCount,
            hitRate: (this.metrics.hitRate * 100).toFixed(1) + '%'
        };
    }
}

// === Enhanced Camera Controller ===
class CameraController {
    constructor(config = {}) {
        this.position = new Vector3(0, 1.6, -2);
        this.rotation = { x: 0, y: 0 };
        this.smoothing = config.smoothing || 0.01;
        this.maxSmoothingSpeed = config.maxSmoothingSpeed || 0.1;
        this.sensitivity = config.sensitivity || 1.0;
        
        // Advanced smoothing
        this.velocity = { x: 0, y: 0 };
        this.damping = config.damping || 0.85;
        
        // Recoil system
        this.recoil = { x: 0, y: 0 };
        this.recoilDecay = config.recoilDecay || 0.9;
    }

    getPosition() { return this.position.clone(); }

    getDirection() {
        const yaw = this.rotation.y;
        const pitch = this.rotation.x;
        return new Vector3(
            Math.sin(yaw) * Math.cos(pitch),
            Math.sin(-pitch),
            Math.cos(yaw) * Math.cos(pitch)
        ).normalize();
    }
    
    getForward() { return this.getDirection(); }
    getRight() { return this.getDirection().cross(Vector3.up()).normalize(); }
    getUp() { return this.getRight().cross(this.getDirection()).normalize(); }

    aimAt(target, deltaTime = 0.016) {
        const dir = target.subtract(this.getPosition()).normalize();
        const targetYaw = Math.atan2(dir.x, dir.z);
        const targetPitch = -Math.asin(Math.max(-1, Math.min(1, dir.y)));
        
        // Advanced smoothing with velocity
        const yawDiff = this.normalizeAngle(targetYaw - this.rotation.y);
        const pitchDiff = targetPitch - this.rotation.x;
        
        this.velocity.x += pitchDiff * this.smoothing * deltaTime * 60;
        this.velocity.y += yawDiff * this.smoothing * deltaTime * 60;
        
        // Apply damping
        this.velocity.x *= this.damping;
        this.velocity.y *= this.damping;
        
        // Limit velocity
        const maxSpeed = this.maxSmoothingSpeed;
        this.velocity.x = Math.max(-maxSpeed, Math.min(maxSpeed, this.velocity.x));
        this.velocity.y = Math.max(-maxSpeed, Math.min(maxSpeed, this.velocity.y));
        
        this.rotation.x += this.velocity.x + this.recoil.x;
        this.rotation.y += this.velocity.y + this.recoil.y;
        
        // Update recoil
        this.recoil.x *= this.recoilDecay;
        this.recoil.y *= this.recoilDecay;
        
        // Clamp pitch
        this.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, this.rotation.x));
    }
    
    addRecoil(x, y) {
        this.recoil.x += x;
        this.recoil.y += y;
    }
    
    normalizeAngle(angle) {
        while (angle > Math.PI) angle -= 2 * Math.PI;
        while (angle < -Math.PI) angle += 2 * Math.PI;
        return angle;
    }
}

// === Enhanced Transform Utilities ===
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
    
    static screenToWorldRay(screenX, screenY, camera, screenWidth = 1920, screenHeight = 1080) {
        const ndcX = (screenX / screenWidth) * 2 - 1;
        const ndcY = -((screenY / screenHeight) * 2 - 1);
        
        const forward = camera.getDirection();
        const right = camera.getRight();
        const up = camera.getUp();
        
        const fov = Math.PI / 4; // 45 degrees
        const aspect = screenWidth / screenHeight;
        
        const rayDir = forward
            .add(right.multiply(ndcX * Math.tan(fov / 2) * aspect))
            .add(up.multiply(ndcY * Math.tan(fov / 2)))
            .normalize();
            
        return { origin: camera.getPosition(), direction: rayDir };
    }
}

// === Enhanced Hitbox System ===
class EnhancedHitbox {
    constructor(config, bonePos, bindpose, rotation = null, scale = null, type = 'head') {
        const col = config.boneColliderProperty || config.defaultBoneColliderProperty;
        const reducer = col.reducerProperty || {};
        const scl = reducer.scale || { x: 1, y: 1, z: 1 };
        const offset = reducer.offset || { x: 0, y: 0, z: 0 };
        const thick = reducer.minThickness || { x: 0.01, y: 0.01, z: 0.01 };

        this.worldPos = TransformUtils.applyFullTransform(bonePos, bindpose, rotation, scale);
        this.center = this.worldPos.add(new Vector3(offset.x, offset.y, offset.z));
        this.radius = Math.max(thick.x, thick.z, 0.1);
        this.radiusX = thick.x * scl.x;
        this.radiusY = thick.y * scl.y;
        this.radiusZ = thick.z * scl.z;
        
        // Enhanced properties
        this.type = type;
        this.priority = this.getPriority(type);
        this.lastHitTime = 0;
        this.hitCount = 0;
        this.isMoving = false;
        this.velocity = Vector3.zero();
        this.predictedPos = this.center.clone();
        
        // Bounding box for faster culling
        this.boundingBox = {
            min: this.center.subtract(new Vector3(this.radiusX, this.radiusY, this.radiusZ)),
            max: this.center.add(new Vector3(this.radiusX, this.radiusY, this.radiusZ))
        };
    }
    
    getPriority(type) {
        const priorities = { head: 10, chest: 7, body: 5, limb: 3 };
        return priorities[type] || 1;
    }
    
    updatePosition(newPos, deltaTime = 0.016) {
        if (this.center) {
            this.velocity = newPos.subtract(this.center).multiply(1 / deltaTime);
            this.isMoving = this.velocity.length() > 0.1;
        }
        
        this.center = newPos;
        this.predictedPos = this.center.add(this.velocity.multiply(deltaTime * 2));
        
        // Update bounding box
        this.boundingBox.min = this.center.subtract(new Vector3(this.radiusX, this.radiusY, this.radiusZ));
        this.boundingBox.max = this.center.add(new Vector3(this.radiusX, this.radiusY, this.radiusZ));
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

    isInLineOfSight(camPos, camDir, maxDistance = 1000) {
        const toHead = this.center.subtract(camPos);
        const distance = toHead.length();
        
        if (distance > maxDistance) return false;
        
        const proj = camDir.dot(toHead.normalize());
        if (proj < 0.5) return false; // Must be in front and within reasonable angle
        
        const closestPoint = camPos.add(camDir.multiply(camDir.dot(toHead)));
        const distanceToRay = closestPoint.distanceTo(this.center);
        
        return distanceToRay <= this.radius * 1.2;
    }
    
    // Raycast intersection
    intersectRay(rayOrigin, rayDirection) {
        const oc = rayOrigin.subtract(this.center);
        const a = rayDirection.dot(rayDirection);
        const b = 2 * oc.dot(rayDirection);
        const c = oc.dot(oc) - this.radius * this.radius;
        const discriminant = b * b - 4 * a * c;
        
        if (discriminant < 0) return null;
        
        const sqrt = Math.sqrt(discriminant);
        const t1 = (-b - sqrt) / (2 * a);
        const t2 = (-b + sqrt) / (2 * a);
        
        const t = t1 > 0 ? t1 : t2;
        if (t < 0) return null;
        
        return {
            distance: t,
            point: rayOrigin.add(rayDirection.multiply(t)),
            normal: this.center.subtract(rayOrigin.add(rayDirection.multiply(t))).normalize()
        };
    }
    
    getHitProbability(camPos, camDir) {
        const distance = camPos.distanceTo(this.center);
        const angle = Math.acos(Math.max(-1, Math.min(1, camDir.dot(this.center.subtract(camPos).normalize()))));
        
        // Base probability
        let probability = 1.0;
        
        // Distance factor (closer = higher probability)
        probability *= Math.max(0.1, 1.0 - (distance / 100));
        
        // Angle factor (center view = higher probability)
        probability *= Math.max(0.1, 1.0 - (angle / (Math.PI / 4)));
        
        // Movement factor (moving targets are harder)
        if (this.isMoving) {
            probability *= 0.7;
        }
        
        // Size factor
        probability *= Math.min(1.0, this.radius / 0.1);
        
        return Math.max(0, Math.min(1, probability));
    }
}

// === Target Tracking System ===

class TargetTracker {
    constructor() {
        this.trackedTargets = new Map();
        this.maxTrackingTime = 5000; // 5 seconds
        this.predictionTime = 0.1;   // 100ms ahead
    }

    trackTarget(targetId, hitbox) {
        const now = Date.now();

        if (!this.trackedTargets.has(targetId)) {
            this.trackedTargets.set(targetId, {
                id: targetId,
                hitbox: hitbox,
                firstSeen: now,
                lastSeen: now,
                positions: [hitbox.center.clone()],
                velocity: Vector3.zero(),
                isHostile: true,
                threat: 1.0
            });
        } else {
            const tracked = this.trackedTargets.get(targetId);
            tracked.lastSeen = now;
            tracked.positions.push(hitbox.center.clone());

            // Keep only recent positions
            if (tracked.positions.length > 10) {
                tracked.positions.shift();
            }

            // Calculate velocity
            if (tracked.positions.length >= 2) {
                const prev = tracked.positions[tracked.positions.length - 2];
                const curr = tracked.positions[tracked.positions.length - 1];
                tracked.velocity = curr.subtract(prev).multiply(60); // Assume 60 FPS
            }
        }
    }

    predictTargetPosition(targetId, deltaTime) {
        const tracked = this.trackedTargets.get(targetId);
        if (!tracked) return null;

        const prediction = tracked.hitbox.center.add(
            tracked.velocity.multiply(deltaTime)
        );
        return prediction;
    }

    cleanup() {
        const now = Date.now();
        for (const [id, tracked] of this.trackedTargets) {
            if (now - tracked.lastSeen > this.maxTrackingTime) {
                this.trackedTargets.delete(id);
            }
        }
    }

    getTrackedTargets() {
        return Array.from(this.trackedTargets.values());
    }
}

// === Enhanced Auto-Aim System ===
class EnhancedAutoAimSystem {
    constructor(config = {}) {
        this.camera = new CameraController(config.camera || {});
        this.crosshair = { x: 0.5, y: 0.5 };
        this.firePressed = false;
        this.autoFire = config.autoFire !== undefined ? config.autoFire : true;
        this.targets = [];
        this.targetTracker = new TargetTracker();
        this.performanceMonitor = new PerformanceMonitor();
        
        // Enhanced settings
        this.settings = {
            maxTargetDistance: config.maxTargetDistance || 9999,
            aimAssistStrength: config.aimAssistStrength || 10.0,
            autoFireDelay: config.autoFireDelay || 0,
            predictionEnabled: config.predictionEnabled !== undefined ? config.predictionEnabled : true,
            priorityTargeting: config.priorityTargeting !== undefined ? config.priorityTargeting : true,
            wallHackMode: config.wallHackMode || false,
            smoothAiming: config.smoothAiming !== undefined ? config.smoothAiming : true,
            recoilCompensation: config.recoilCompensation !== undefined ? config.recoilCompensation : true
        };
        
        // Statistics
        this.stats = {
            totalShots: 0,
            totalHits: 0,
            sessionsTargets: 0,
            uptime: Date.now()
        };
        
        // Last fire time for rate limiting
        this.lastFireTime = 0;
        
        // Recoil pattern (example for common weapons)
        this.recoilPattern = [
            { x: 0, y: -0.1 }, { x: 0.05, y: -0.15 }, { x: -0.1, y: -0.2 },
            { x: 0.15, y: -0.25 }, { x: -0.2, y: -0.3 }, { x: 0.1, y: -0.35 }
        ];
        this.currentRecoilIndex = 0;
    }

    setFire(state) { 
        this.firePressed = state; 
        if (!state) {
            this.currentRecoilIndex = 0; // Reset recoil when not firing
        }
    }
    
    setAutoFire(state) { this.autoFire = state; }
    
    updateSettings(newSettings) {
        Object.assign(this.settings, newSettings);
    }

    addTarget(config, pos, bindpose, rot, scale, type = 'head', id = null) {
        const hitbox = new EnhancedHitbox(config, pos, bindpose, rot, scale, type);
        hitbox.id = id || `target_${this.targets.length}`;
        this.targets.push(hitbox);
        
        if (id) {
            this.targetTracker.trackTarget(id, hitbox);
        }
        
        this.stats.sessionsTargets++;
        return hitbox;
    }
    
    removeTarget(id) {
        this.targets = this.targets.filter(t => t.id !== id);
        this.targetTracker.trackedTargets.delete(id);
    }
    
    clearTargets() {
        this.targets = [];
        this.targetTracker.trackedTargets.clear();
    }

    findBestTarget(deltaTime = 0.016) {
        if (this.targets.length === 0) return null;
        
        const camPos = this.camera.getPosition();
        const camDir = this.camera.getDirection();
        let candidates = [];

        // First pass: filter valid targets
        for (const target of this.targets) {
            if (!this.settings.wallHackMode && !target.isInLineOfSight(camPos, camDir, this.settings.maxTargetDistance)) {
                continue;
            }
            
            const distance = camPos.distanceTo(target.center);
            if (distance > this.settings.maxTargetDistance) continue;
            
            const predictedPos = this.settings.predictionEnabled ? 
                target.center.add(target.velocity.multiply(deltaTime * 3)) : target.center;
            
            const toTarget = predictedPos.subtract(camPos).normalize();
            const angle = Math.acos(Math.max(-1, Math.min(1, camDir.dot(toTarget))));
            
            // Multiple scoring factors
            let score = 0;
            
            // Distance score (closer is better)
            score += (1 / Math.max(1, distance)) * 50;
            
            // Angle score (center view is better)
            score += (1 / Math.max(0.1, angle)) * 30;
            
            // Priority score (head > chest > body)
            score += target.priority * 10;
            
            // Hit probability
            score += target.getHitProbability(camPos, camDir) * 20;
            
            // Recently hit targets get lower priority (spread damage)
            const timeSinceHit = performance.now() - target.lastHitTime;
            if (timeSinceHit < 1000) {
                score *= 0.5;
            }
            
            candidates.push({ target, score, distance, angle, predictedPos });
        }
        
        if (candidates.length === 0) return null;
        
        // Sort by score and return best
        candidates.sort((a, b) => b.score - a.score);
        
        // Update performance metrics
        this.performanceMonitor.metrics.targetCount = candidates.length;
        
        return candidates[0];
    }

    triggerShoot() {
        const now = performance.now();
        if (now - this.lastFireTime < this.settings.autoFireDelay) return;
        
        this.lastFireTime = now;
        this.stats.totalShots++;
        
        console.log(`🔫 ENHANCED FIRE: Shot #${this.stats.totalShots} | Accuracy: ${this.getAccuracy()}%`);
        
        // Apply recoil compensation
        if (this.settings.recoilCompensation && this.currentRecoilIndex < this.recoilPattern.length) {
            const recoil = this.recoilPattern[this.currentRecoilIndex];
            this.camera.addRecoil(recoil.x, recoil.y);
            this.currentRecoilIndex++;
        }
        
        // Send actual input here
        this.sendFireInput();
    }
    
    sendFireInput() {
        // Placeholder for actual game input
        console.log("🎯 Fire input sent to game");
    }

    sendInput(deltaX, deltaY, smooth = true) {
        if (smooth && this.settings.smoothAiming) {
            // Apply smoothing to mouse movement
            const smoothFactor = 0.7;
            deltaX *= smoothFactor;
            deltaY *= smoothFactor;
        }
        
        console.log(`🖱 Enhanced Adjust: Δx=${deltaX.toFixed(4)} Δy=${deltaY.toFixed(4)}`);
        
        // Placeholder for actual mouse input
        // window.gameInput?.moveMouse(deltaX, deltaY);
    }

    update(deltaTime = 0.016) {
        this.performanceMonitor.startFrame();
        
        const bestCandidate = this.findBestTarget(deltaTime);
        if (!bestCandidate) {
            this.performanceMonitor.endFrame();
            return;
        }
        
        const { target, predictedPos } = bestCandidate;
        const camPos = this.camera.getPosition();
        const camDir = this.camera.getDirection();
        
        // Enhanced crosshair detection
        if (target.containsCrosshair(this.crosshair, 0.15)) {
            this.sendInput(0, 0); // Hold steady
            
            if (this.autoFire) {
                this.triggerShoot();
                target.lastHitTime = performance.now();
                target.hitCount++;
                this.stats.totalHits++;
            }
        } 
        else if (this.firePressed || (this.autoFire && target.isInLineOfSight(camPos, camDir))) {
            // Enhanced aiming with prediction
            const aimTarget = this.settings.predictionEnabled ? predictedPos : target.center;
            
            if (this.settings.smoothAiming) {
                this.camera.aimAt(aimTarget, deltaTime);
            } else {
                // Direct snap aiming
                const dir = aimTarget.subtract(camPos).normalize();
                const yaw = Math.atan2(dir.x, dir.z);
                const pitch = -Math.asin(Math.max(-1, Math.min(1, dir.y)));
                
                this.camera.rotation.y = yaw;
                this.camera.rotation.x = pitch;
            }
            
            // Calculate mouse movement needed
            const currentDir = this.camera.getDirection();
            const targetDir = aimTarget.subtract(camPos).normalize();
            const angleDiff = Math.acos(Math.max(-1, Math.min(1, currentDir.dot(targetDir))));
            
            if (angleDiff > 0.01) { // Only move if significant difference
                const cross = currentDir.cross(targetDir);
                const deltaX = cross.x * this.settings.aimAssistStrength;
                const deltaY = cross.y * this.settings.aimAssistStrength;
                this.sendInput(deltaX, deltaY);
            }
            
            // Auto fire when on target
            if (this.autoFire && angleDiff < 0.05) {
                this.triggerShoot();
            }
        }
        
        // Cleanup old tracking data
        this.targetTracker.cleanup();
        
        this.performanceMonitor.endFrame();
    }
    
    getAccuracy() {
        return this.stats.totalShots > 0 ? 
            ((this.stats.totalHits / this.stats.totalShots) * 100).toFixed(1) : 0;
    }
    
    getStats() {
        return {
            ...this.stats,
            accuracy: this.getAccuracy(),
            uptime: ((performance.now() - this.stats.uptime) / 1000).toFixed(1),
            performance: this.performanceMonitor.getStats()
        };
    }
    
    // Debug visualization (for development)
    debugRender(ctx, canvasWidth, canvasHeight) {
        if (!ctx) return;
        
        ctx.save();
        
        // Draw crosshair
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        const centerX = canvasWidth * this.crosshair.x;
        const centerY = canvasHeight * this.crosshair.y;
        
        ctx.beginPath();
        ctx.moveTo(centerX - 10, centerY);
        ctx.lineTo(centerX + 10, centerY);
        ctx.moveTo(centerX, centerY - 10);
        ctx.lineTo(centerX, centerY + 10);
        ctx.stroke();
        
        // Draw target indicators
        for (const target of this.targets) {
            const screenPos = this.worldToScreen(target.center, canvasWidth, canvasHeight);
            if (screenPos) {
                ctx.strokeStyle = target.type === 'head' ? '#ff0000' : '#ffff00';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(screenPos.x, screenPos.y, 20, 0, Math.PI * 2);
                ctx.stroke();
                
                // Draw prediction
                if (this.settings.predictionEnabled && target.isMoving) {
                    const predictedPos = target.predictedPos;
                    const predScreenPos = this.worldToScreen(predictedPos, canvasWidth, canvasHeight);
                    if (predScreenPos) {
                        ctx.strokeStyle = '#00ffff';
                        ctx.setLineDash([5, 5]);
                        ctx.beginPath();
                        ctx.arc(predScreenPos.x, predScreenPos.y);

                        ctx.arc(predScreenPos.x, predScreenPos.y, 15, 0, Math.PI * 2);
                        ctx.stroke();
                        ctx.setLineDash([]);
                    }
                }
            }
        }

        ctx.restore();
    }

    worldToScreen(worldPos, canvasWidth, canvasHeight) {
        const camPos = this.camera.getPosition();
        const camDir = this.camera.getDirection();
        const toTarget = worldPos.subtract(camPos);
        const distance = toTarget.length();

        // Avoid projecting points too close or behind the camera
        if (distance < 0.1 || camDir.dot(toTarget.normalize()) < 0.1) return null;

        // Basic perspective projection (simplified)
        const fov = Math.PI / 4;
        const aspect = canvasWidth / canvasHeight;
        const tanFov = Math.tan(fov / 2);

        const right = this.camera.getRight();
        const up = this.camera.getUp();
        const forward = camDir;

        const x = toTarget.dot(right);
        const y = toTarget.dot(up);
        const z = toTarget.dot(forward);

        if (z <= 0.01) return null; // Behind camera

        const screenX = (0.5 + x / (z * tanFov * aspect)) * canvasWidth;
        const screenY = (0.5 - y / (z * tanFov)) * canvasHeight;

        return { x: screenX, y: screenY };
    }
}

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

// Ví dụ: Tạo và thêm head hitbox vào hệ thống
const autoAim = new EnhancedAutoAimSystem();

const headVector = new Vector3(
  boneHeadPosition.x,
  boneHeadPosition.y,
  boneHeadPosition.z
);
const rotationQuat = {
  x: boneHeadRotation.x,
  y: boneHeadRotation.y,
  z: boneHeadRotation.z,
  w: boneHeadRotation.w
};

const scaleVec = {
  x: boneHeadScale.x,
  y: boneHeadScale.y,
  z: boneHeadScale.z
};

// Thêm mục tiêu đầu vào hệ thống
autoAim.addTarget(
  headConfig,
  headVector,
  bindpose,
  rotationQuat,
  scaleVec,
  "head",
  "enemy_01"
);

setInterval(() => {
  autoAim.update(1 / 120); // 60 FPS
}, 8);
if (typeof body === "object") {
  $done({ body: JSON.stringify(body) });
} else {
  $done({ body });
}

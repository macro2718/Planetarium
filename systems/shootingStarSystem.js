import * as THREE from 'three';

export function createShootingStarSystem(ctx) {
    ctx.shootingStarsGroup = new THREE.Group();
    ctx.scene.add(ctx.shootingStarsGroup);
    ctx.shootingStars = [];
    ctx.shootingStarCooldown = 0;
    return {
        group: ctx.shootingStarsGroup,
        update() {
            if (!ctx.settings.showShootingStars) return;
            ctx.shootingStarCooldown -= 0.016;
            if (ctx.shootingStarCooldown <= 0) {
                createShootingStar(ctx);
                ctx.shootingStarCooldown = 0.3 + Math.random() * 1.2;
            }
            for (let i = ctx.shootingStars.length - 1; i >= 0; i--) {
                const star = ctx.shootingStars[i];
                star.userData.life -= star.userData.speed;
                star.material.opacity = star.userData.life;
                if (star.userData.life <= 0) {
                    ctx.shootingStarsGroup.remove(star);
                    star.geometry.dispose();
                    star.material.dispose();
                    ctx.shootingStars.splice(i, 1);
                }
            }
        }
    };
}

function createShootingStar(ctx) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI / 2.5;
    const radius = 3000;
    const startPos = new THREE.Vector3(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.sin(theta)
    );
    const direction = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        -0.5 - Math.random() * 0.5,
        (Math.random() - 0.5) * 2
    ).normalize();
    const length = 200 + Math.random() * 300;
    const endPos = startPos.clone().add(direction.multiplyScalar(length));
    const points = [];
    const segments = 30;
    for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        points.push(new THREE.Vector3().lerpVectors(startPos, endPos, t));
    }
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const colors = [];
    for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const brightness = Math.pow(1 - t, 2);
        colors.push(brightness, brightness * 0.9, brightness * 0.7);
    }
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    const material = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending
    });
    const shootingStar = new THREE.Line(geometry, material);
    shootingStar.userData = {
        life: 1,
        speed: 0.02 + Math.random() * 0.02
    };
    ctx.shootingStarsGroup.add(shootingStar);
    ctx.shootingStars.push(shootingStar);
}

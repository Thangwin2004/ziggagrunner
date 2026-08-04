export class PhysicsSystem {
  constructor() {
    this.gravity = 0.5;
    this.terminalVelocity = -12;
  }

  update(deltaTime, player, world) {
    if (!player || !world || player.isDead) return;

    // Apply X and Z velocity
    player.x += player.vx;
    player.z += player.vz;

    // Check if player is on ANY solid block
    let onBlock = false;
    for (const solid of world.solids) {
      if (this.isOverlappingXZ(player.bounds, solid.bounds)) {
        onBlock = true;
        break;
      }
    }

    if (onBlock) {
      player.vy = 0;
      player.y = 1.0; // Fixed height above ground
    } else {
      // Fall
      if (!player.isDead) {
        player.isDead = true;
        if (world.onPlayerHit) world.onPlayerHit();
        return;
      }
    }

    player.updateBounds();

    // Check coins
    for (const coin of world.coins) {
      if (coin.active && this.isOverlappingXZ(player.bounds, coin.bounds)) {
        coin.active = false;
        coin.mesh.visible = false;
        if (world.onCoinCollected) world.onCoinCollected(coin);
      }
    }
  }

  isOverlappingXZ(r1, r2) {
    // Note: r2 has width and depth (because it's a 3D block now)
    const padding = 0.5; // Forgiveness padding
    return (
      r1.x < r2.x + r2.width - padding &&
      r1.x + r1.width > r2.x + padding &&
      r1.z < r2.z + r2.depth - padding &&
      r1.z + r1.depth > r2.z + padding
    );
  }
}

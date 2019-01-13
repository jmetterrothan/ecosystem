import MathUtils from '@utils/Math.utils';
import Creature from '@boids/Creatures/Creature';

class DiscusFish extends Creature {
  constructor() {
    super(['fish1'], {
      speed: 8500,
      neighbourRadius: 6000,
      alignmentWeighting: 0.0065,
      cohesionWeighting: 0.01,
      separationWeighting: 0.05,
      viewAngle: 8,
      underwater: true,
      minRepulseDistance: 30000,
      scale: MathUtils.randomFloat(0.65, 1.25)
    });
  }
}

export default DiscusFish;

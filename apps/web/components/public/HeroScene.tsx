/* eslint-disable @next/next/no-img-element -- Original 32 px game sprites must stay unoptimized and pixel-perfect. */
export function HeroScene() {
  return (
    <div className="hero-scene" aria-label="Prévia da arena atual do Cavebound">
      <div className="scene-status"><span>EXPEDIÇÃO ATIVA</span><strong>Rotworm Cave · Wave 4/5</strong></div>
      <div className="scene-floor">
        <div className="scene-party">
          <figure><img src="/generated/tibia860/outfit-knight-east-frame-1.png" alt="Knight" /><figcaption>Aldric</figcaption></figure>
          <figure><img src="/generated/tibia860/outfit-paladin-east-frame-1.png" alt="Paladin" /><figcaption>Lyra</figcaption></figure>
          <figure><img src="/generated/tibia860/outfit-sorcerer-east-frame-1.png" alt="Sorcerer" /><figcaption>Orion</figcaption></figure>
          <figure><img src="/generated/tibia860/outfit-druid-east-frame-1.png" alt="Druid" /><figcaption>Elowen</figcaption></figure>
        </div>
        <div className="scene-enemies">
          <figure><span className="damage-pop">18</span><img src="/generated/tibia860/monster-rotworm-west-frame-1.png" alt="Rotworm" /><figcaption>Rotworm</figcaption></figure>
          <figure><img src="/generated/tibia860/monster-rotworm-west-frame-0.png" alt="Rotworm" /><figcaption>Rotworm</figcaption></figure>
          <figure><span className="damage-pop delayed">24</span><img src="/generated/tibia860/monster-carrion-worm-west-frame-1.png" alt="Carrion Worm" /><figcaption>Carrion Worm</figcaption></figure>
        </div>
      </div>
      <div className="scene-log"><span>XP +40</span><span>Loot: gold coin × 7</span><span>Aldric atingiu Rotworm por 18.</span></div>
    </div>
  );
}

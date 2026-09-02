interface IdleHeaderProps {
  activeSkill: string;
  activeSkillLevel: number;
  previousResult: 'ready' | 'completed' | 'defeated';
}

const previousResultText = {
  ready: 'Base segura',
  completed: 'Última expedição concluída',
  defeated: 'Aldric retornou após a derrota',
};

export function IdleHeader({ activeSkill, activeSkillLevel, previousResult }: IdleHeaderProps) {
  return (
    <header className="hunt-header idle-header">
      <div className="hunt-title-block">
        <span className="live-dot status-training" />
        <span><small>Fora de hunt</small><strong>Training Room</strong></span>
      </div>
      <span className="training-status">TREINANDO</span>
      <div className="training-skill-summary">
        <small>Skill ativa</small>
        <strong>{activeSkill} {activeSkillLevel}</strong>
      </div>
      <div className="hunt-room-summary">
        <strong>ÁREA SEGURA</strong>
        <small>{previousResultText[previousResult]}</small>
      </div>
      <span className="loop-indicator" title="Progressão baseada nas curvas do STYLLER">SKILL GAIN · ATIVO</span>
    </header>
  );
}

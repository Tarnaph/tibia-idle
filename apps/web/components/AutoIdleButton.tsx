'use client';

import React from 'react';

export interface AutoIdleButtonProps {
  isAutoIdle?: boolean;
  onToggle?: () => void;
  inHunt?: boolean;
  isTraining?: boolean;
  staminaMinutes?: number;
  maxStaminaMinutes?: number;
  className?: string;
}

export const AutoIdleButton: React.FC<AutoIdleButtonProps> = () => {
  return null;
};

import React from 'react';
import { SpacerBlockConfig } from '../../types/landingPage';

interface SpacerBlockProps {
  config: SpacerBlockConfig;
}

const SpacerBlock: React.FC<SpacerBlockProps> = ({ config }) => {
  return (
    <div
      style={{ height: `${config.height}px` }}
      className="bg-transparent"
    />
  );
};

export default SpacerBlock;

import React from 'react';
import { CustomHTMLBlockConfig } from '../../types/landingPage';

interface CustomHTMLBlockProps {
  config: CustomHTMLBlockConfig;
}

const CustomHTMLBlock: React.FC<CustomHTMLBlockProps> = ({ config }) => {
  return (
    <div className="custom-html-block-container w-full">
      {config.css && <style>{config.css}</style>}
      <div 
        dangerouslySetInnerHTML={{ __html: config.html }} 
        className="w-full"
      />
      {config.js && <script dangerouslySetInnerHTML={{ __html: config.js }} />}
    </div>
  );
};

export default CustomHTMLBlock;

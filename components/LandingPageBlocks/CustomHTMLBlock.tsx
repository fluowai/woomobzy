import React from 'react';
import { CustomHTMLBlockConfig } from '../../types/landingPage';

interface CustomHTMLBlockProps {
  config: CustomHTMLBlockConfig;
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const renderEditableTemplate = (
  html: string,
  fields?: CustomHTMLBlockConfig['editableFields']
) => {
  if (!fields?.length) return html;

  return fields.reduce((output, field) => {
    const token = new RegExp(`{{${field.key}}}`, 'g');
    return output.replace(token, escapeHtml(field.value || ''));
  }, html);
};

const CustomHTMLBlock: React.FC<CustomHTMLBlockProps> = ({ config }) => {
  const html = renderEditableTemplate(config.html, config.editableFields);

  return (
    <div className="custom-html-block-container w-full">
      {config.css && <style>{config.css}</style>}
      <div dangerouslySetInnerHTML={{ __html: html }} className="w-full" />
      {import.meta.env.DEV && config.js && (
        <script dangerouslySetInnerHTML={{ __html: config.js }} />
      )}
    </div>
  );
};

export default CustomHTMLBlock;

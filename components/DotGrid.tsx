const DotGrid: React.FC<{ className?: string }> = ({ className }) => (
  <div
    className={`absolute pointer-events-none opacity-[0.15] ${className}`}
    style={{
      backgroundImage:
        'radial-gradient(circle, currentColor 1px, transparent 1px)',
      backgroundSize: '32px 32px',
    }}
  ></div>
);

export default DotGrid;

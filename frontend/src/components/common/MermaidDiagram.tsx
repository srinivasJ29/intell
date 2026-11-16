import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: false,
  theme: 'neutral',
  securityLevel: 'loose',
  fontFamily: 'Inter, -apple-system, sans-serif',
  themeVariables: {
    primaryColor: '#F1F1F1',
    primaryTextColor: '#111111',
    primaryBorderColor: '#111111',
    lineColor: '#111111',
    secondaryColor: '#FAFAFA',
    tertiaryColor: '#FFFFFF',
    background: '#FFFFFF',
    mainBkg: '#FAFAFA',
    nodeBorder: '#111111',
  },
});

interface MermaidDiagramProps {
  code: string;
}

export const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ code }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string>('');
  const [hasError, setHasError] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    setHasError(false);

    const renderId = `mermaid_${Math.random().toString(36).substring(2, 9)}`;

    mermaid
      .render(renderId, code)
      .then(({ svg }) => {
        if (isMounted) {
          setSvgContent(svg);
        }
      })
      .catch((err) => {
        console.error('Mermaid render error:', err);
        if (isMounted) setHasError(true);
      });

    return () => {
      isMounted = false;
    };
  }, [code]);

  if (hasError) {
    return (
      <div className="p-4 my-4 bg-mono-light border border-mono-border rounded text-mono-dark font-mono text-xs">
        <pre className="overflow-x-auto">{code}</pre>
      </div>
    );
  }

  if (!svgContent) {
    return (
      <div className="p-4 my-4 bg-mono-offwhite border border-mono-border rounded text-center text-xs text-mono-medium font-mono animate-pulse">
        Rendering architectural diagram...
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="my-6 p-6 bg-mono-white rounded-xl border border-mono-border overflow-x-auto flex justify-center shadow-subtle text-mono-deepblack select-none"
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  );
};


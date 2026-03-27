import React from 'react';

const NavbarComponent = ({ narrativeTitle, sidebar, width, theme }) => {
  if (!Boolean(sidebar)) {
    return null;
  }

  const t = theme?.sidebarTheme || {};

  const containerStyle = {
    boxSizing:  'border-box',
    width:      '100%',
    padding:    '14px 16px',
    fontFamily: t['font-family'] || 'Roboto, sans-serif',
    background: t.background    || '#30353f',
  };

  const titleStyle = {
    margin:        0,
    fontSize:      18,
    fontWeight:    600,
    lineHeight:    1.3,
    letterSpacing: '0.01em',
    color:         t.color || '#ffffff',
  };

  const subtitleStyle = {
    margin:    '2px 0 0',
    fontSize:  12,
    color:     t.unselectedColor || 'rgba(255, 255, 255, 0.35)',
  };

  return (
    <div style={containerStyle}>
      <h1 style={titleStyle}>NextStrain</h1>
      {narrativeTitle && (
        <p style={subtitleStyle}>{narrativeTitle}</p>
      )}
    </div>
  );
};

export default NavbarComponent;
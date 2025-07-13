// Mobile utility functions for responsive design

export const isMobile = () => {
  return window.innerWidth <= 768;
};

export const isSmallMobile = () => {
  return window.innerWidth <= 480;
};

// Responsive table configurations
export const getResponsiveTableProps = () => {
  const mobile = isMobile();
  const smallMobile = isSmallMobile();
  
  return {
    size: mobile ? 'small' : 'middle',
    scroll: mobile ? { x: 'max-content' } : undefined,
    pagination: {
      pageSize: mobile ? 5 : 10,
      showSizeChanger: !mobile,
      showQuickJumper: !mobile,
      showTotal: !smallMobile ? (total, range) => 
        `${range[0]}-${range[1]} / ${total}` : undefined,
      size: mobile ? 'small' : 'default'
    }
  };
};

// Responsive card configurations
export const getResponsiveCardProps = () => {
  const mobile = isMobile();
  
  return {
    size: mobile ? 'small' : 'default',
    bodyStyle: mobile ? { padding: '12px' } : undefined
  };
};

// Responsive grid configurations
export const getResponsiveGridProps = () => {
  return {
    xs: 24,
    sm: 12,
    md: 8,
    lg: 6,
    xl: 6
  };
};

// Responsive statistic configurations
export const getResponsiveStatisticProps = () => {
  const mobile = isMobile();
  
  return {
    valueStyle: mobile ? { fontSize: '18px' } : { fontSize: '24px' },
    titleStyle: mobile ? { fontSize: '12px' } : { fontSize: '14px' }
  };
};

// Mobile-optimized table columns
export const getMobileTableColumns = (columns) => {
  const mobile = isMobile();
  const smallMobile = isSmallMobile();
  
  if (!mobile) return columns;
  
  // On small mobile, show only essential columns
  if (smallMobile) {
    return columns.filter(col => col.key === 'rank' || col.key === 'team' || col.key === 'points')
      .map(col => ({
        ...col,
        width: col.key === 'rank' ? 50 : col.key === 'points' ? 60 : undefined
      }));
  }
  
  // On tablet/mobile, reduce column widths
  return columns.map(col => ({
    ...col,
    width: col.width ? Math.min(col.width, 120) : undefined
  }));
};
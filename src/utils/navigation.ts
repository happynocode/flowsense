// 导航工具函数 - 处理GitHub Pages部署的路径问题

// 获取基础路径
const getBasePath = (): string => {
  // 检查是否在GitHub Pages环境中
  const isGitHubPages = window.location.hostname.includes('github.io');
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  
  // 在GitHub Pages中使用子路径，在本地开发中不使用
  if (isGitHubPages) {
    return '/flowsense';
  } else if (isLocalhost) {
    return '';
  } else {
    // 其他生产环境，根据需要调整
    return '/flowsense';
  }
};

// 导航到指定路径
export const navigateTo = (path: string): void => {
  const basePath = getBasePath();
  const fullPath = `${basePath}${path}`;
  window.location.href = fullPath;
};

// 导航到外部URL（不添加basePath）
export const navigateToExternal = (url: string): void => {
  window.location.href = url;
};

// 获取完整的内部路径
export const getFullPath = (path: string): string => {
  const basePath = getBasePath();
  return `${basePath}${path}`;
}; 
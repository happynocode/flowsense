// 导航工具函数 - 处理GitHub Pages部署的路径问题

// 获取基础路径
const getBasePath = (): string => {
  // 在开发环境中，basename通常为空或'/'
  // 在GitHub Pages中，basename为'/digest-flow-daily'
  return import.meta.env.DEV ? '' : '/digest-flow-daily';
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
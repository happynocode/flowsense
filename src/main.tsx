import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// 忽略 StackBlitz 环境的警告
if (import.meta.env.DEV) {
  // 过滤掉 StackBlitz 相关的控制台警告
  const originalWarn = console.warn;
  console.warn = (...args) => {
    const message = args.join(' ');
    if (
      message.includes('Contextify') ||
      message.includes('preloaded using link preload') ||
      message.includes('fetch.worker')
    ) {
      return; // 忽略这些 StackBlitz 环境警告
    }
    originalWarn.apply(console, args);
  };
}

createRoot(document.getElementById("root")!).render(<App />);
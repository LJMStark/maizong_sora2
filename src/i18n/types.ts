import type zhCN from './locales/zh-CN';

type Messages = typeof zhCN;

declare global {
  // 使用类型定义而不是接口以允许自动合并
  interface IntlMessages extends Messages {}
}
